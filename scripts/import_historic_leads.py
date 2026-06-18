"""
Argyle CRM — Historic Lead Importer
Connects to Proton Bridge IMAP OR reads a local .mbox file,
finds Wix form submission emails, parses lead data, and inserts into Supabase.

Usage:
  # IMAP (requires Proton Bridge running and signed in)
  python import_historic_leads.py --scan
  python import_historic_leads.py --dry-run
  python import_historic_leads.py --insert

  # MBOX file (export from Proton web → Settings → Data & privacy → Export)
  python import_historic_leads.py --mbox inbox.mbox --dry-run
  python import_historic_leads.py --mbox inbox.mbox --insert

Environment variables:
  SUPABASE_SERVICE_KEY   service_role key from Supabase dashboard → Settings → API
"""

import imaplib
import email
import ssl
import os
import re
import sys
import json
import argparse
from datetime import datetime, timezone
from email.header import decode_header
from email.utils import parsedate_to_datetime

import mailbox
from html.parser import HTMLParser

try:
    import requests
except ImportError:
    print("Run: pip install requests")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────

IMAP_HOST     = "127.0.0.1"
IMAP_PORT     = 1143
IMAP_USER     = "paulmc18@proton.me"
IMAP_PASSWORD = os.getenv("BRIDGE_PASSWORD", "wHIHXDqoSMdg0mHI5I1NUQ")

SUPABASE_URL  = "https://wwzejhasxrknigqxyzme.supabase.co"
SUPABASE_KEY  = os.getenv("SUPABASE_SERVICE_KEY", "")

# Search criteria — adjust if needed after running --scan
# Searches for emails with "form" OR "submission" OR "message" in subject
SEARCH_SUBJECTS = ["form submission", "new message", "new form", "contact form", "enquiry",
                   "new submission", "you've got a new", "contact submission", "website enquiry"]
SEARCH_FROM     = ["noreply@wix.com", "no-reply@wix.com", "wix.com", "wix-forms.com"]
SITE_FILTER     = "argyle"  # only import leads from this Wix site's notifications

# Only import emails on or after this date (set to when GLEAM/Argyle launched)
MIN_DATE = datetime(2026, 1, 1, tzinfo=timezone.utc)

# ── IMAP connection ───────────────────────────────────────────────────────────

def connect_imap():
    import time
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    attempts = [
        ("plain (no TLS)",   lambda: _plain_connect()),
        ("STARTTLS",         lambda: _starttls_connect(ctx)),
    ]

    for label, connect_fn in attempts:
        try:
            print(f"  Trying {label}…")
            mail = connect_fn()
            mail.login(IMAP_USER, IMAP_PASSWORD)
            print(f"  Logged in as: {IMAP_USER}")
            return mail
        except imaplib.IMAP4.error as e:
            print(f"  Login failed ({label}): {e}")
            time.sleep(2)
        except Exception as e:
            print(f"  Connect failed ({label}): {e}")

    raise RuntimeError("All connection attempts failed.")


def _plain_connect():
    return imaplib.IMAP4(IMAP_HOST, IMAP_PORT)


def _starttls_connect(ctx):
    mail = imaplib.IMAP4(IMAP_HOST, IMAP_PORT)
    mail.starttls(ssl_context=ctx)
    return mail


class _HTMLToText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self._skip = False
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self._skip = True
        if tag in ('br', 'p', 'tr', 'div', 'li'):
            self.parts.append('\n')
    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self._skip = False
        if tag in ('td', 'th'):
            self.parts.append(' | ')
    def handle_data(self, data):
        if not self._skip:
            self.parts.append(data)
    def get_text(self):
        text = ''.join(self.parts)
        # collapse excessive whitespace while keeping newlines
        lines = [' '.join(l.split()) for l in text.splitlines()]
        return '\n'.join(l for l in lines if l)


def html_to_text(html):
    p = _HTMLToText()
    try:
        p.feed(html)
        return p.get_text()
    except Exception:
        return re.sub(r"<[^>]+>", " ", html)


def get_body(msg):
    """Extract readable text from email message, preferring plain text."""
    plain = html = None
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            charset = part.get_content_charset() or "utf-8"
            if ct == "text/plain" and plain is None:
                plain = part.get_payload(decode=True).decode(charset, errors="replace")
            if ct == "text/html" and html is None:
                html = part.get_payload(decode=True).decode(charset, errors="replace")
    else:
        charset = msg.get_content_charset() or "utf-8"
        raw = msg.get_payload(decode=True).decode(charset, errors="replace")
        if msg.get_content_type() == "text/html":
            html = raw
        else:
            plain = raw

    if plain:
        return plain
    if html:
        return html_to_text(html)
    return ""


def decode_str(s):
    parts = decode_header(s or "")
    result = []
    for part, enc in parts:
        if isinstance(part, bytes):
            result.append(part.decode(enc or "utf-8", errors="replace"))
        else:
            result.append(part)
    return "".join(result)


def fetch_form_emails(mail):
    """Use server-side IMAP search — only fetches matching emails, not entire mailbox."""
    mail.select("INBOX")
    results = set()

    # Search by known Wix sender domains
    for sender in ["wix.com", "wixforms.com"]:
        _, data = mail.search(None, f'FROM "{sender}"')
        if data[0]:
            results.update(data[0].split())

    # Search by common form notification subject keywords
    for kw in ["form submission", "new message", "new form", "enquiry", "contact"]:
        _, data = mail.search(None, f'SUBJECT "{kw}"')
        if data[0]:
            results.update(data[0].split())

    ids = list(results)
    print(f"  Server-side search found {len(ids)} matching emails")
    return ids


# ── Email parser ──────────────────────────────────────────────────────────────

FIELD_PATTERNS = {
    "first_name": [r"First Name:\s*\n([^\n|]+)"],
    "last_name":  [r"Last Name:\s*\n([^\n|]+)"],
    "name":       [r"(?:^|\n) *Name:\s*\n([^\n|]+)", r"(?:full name|your name)[:\s]+([^\n|]+)"],
    "email":      [r"Email:\s*\n([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})",
                   r"(?:e-mail)[:\s]+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})"],
    "phone":      [r"Phone:\s*\n([^\n|]+)", r"(?:telephone|mobile|tel)[:\s]+([^\n|]+)"],
    "address":    [r"Address:\s*\n([^\n|]+)", r"(?:postcode|location)[:\s]+([^\n|]+)"],
    "subject":    [r"Subject:\s*\n([^\n|]+)", r"(?:re|regarding)[:\s]+([^\n|]+)"],
    "message":    [r"Message:\s*\n([\s\S]+?)(?=\n *\||\nView Submissions|\Z)"],
}

def parse_lead_from_body(body, email_date, email_subject):
    """Parse a Wix form notification body into a lead dict."""
    body = re.sub(r"\r\n", "\n", body)
    body = re.sub(r"[ \t]+", " ", body)

    lead = {
        "source": "website",
        "product": "unknown",
        "status": "new",
        "created_at": email_date.isoformat() if email_date else None,
        "subject": email_subject or None,
        "raw": body[:2000],
    }

    for field, patterns in FIELD_PATTERNS.items():
        for pattern in patterns:
            m = re.search(pattern, body, re.IGNORECASE | re.MULTILINE)
            if m:
                val = m.group(1).strip()
                val = re.sub(r"\s*\|.*$", "", val, flags=re.MULTILINE).strip()
                val = re.sub(r"\s*[‌‍­]+\s*$", "", val).strip()
                if val:
                    lead[field] = val
                    break

    # Combine split first/last name fields
    first = lead.pop("first_name", "") or ""
    last  = lead.pop("last_name", "")  or ""
    if first or last:
        lead["name"] = f"{first} {last}".strip()

    # Try to extract product hint from message/subject
    combined = f"{lead.get('message', '')} {lead.get('subject', '')}".lower()
    if any(w in combined for w in ["wardrobe", "wardrobes"]):
        lead["product"] = "wardrobes"
    elif any(w in combined for w in ["mirror", "mirrors"]):
        lead["product"] = "mirrors"
    elif any(w in combined for w in ["door", "doors"]):
        lead["product"] = "doors"
    elif any(w in combined for w in ["both", "mirror and door"]):
        lead["product"] = "both"

    # Determine source from subject/body
    if any(w in combined for w in ["google", "adword", "search"]):
        lead["source"] = "google"
    elif any(w in combined for w in ["facebook", "fb", "instagram", "social"]):
        lead["source"] = "facebook"

    return lead


def is_form_email(subject, from_addr):
    subj = (subject or "").lower()
    frm  = (from_addr or "").lower()
    from_wix = any(domain in frm for domain in SEARCH_FROM)
    form_subject = any(kw in subj for kw in SEARCH_SUBJECTS)
    site_match = (not SITE_FILTER) or (SITE_FILTER.lower() in frm)
    return from_wix and form_subject and site_match


# ── Supabase insert ───────────────────────────────────────────────────────────

def insert_lead(lead):
    if not SUPABASE_KEY:
        print("  ERROR: SUPABASE_SERVICE_KEY not set")
        return False
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/leads",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json=lead,
        timeout=10,
    )
    return resp.status_code in (200, 201)


# ── Modes ─────────────────────────────────────────────────────────────────────

def mode_scan(mail):
    """Print all emails that look like form submissions."""
    print("\n── SCAN MODE ─────────────────────────────────────────────────────")
    ids = fetch_form_emails(mail)
    matches = []
    for i, eid in enumerate(ids):
        _, data = mail.fetch(eid, "(RFC822.HEADER)")
        msg = email.message_from_bytes(data[0][1])
        subj = decode_str(msg.get("Subject", ""))
        frm  = decode_str(msg.get("From", ""))
        date = msg.get("Date", "")
        if is_form_email(subj, frm):
            matches.append((eid, date, frm, subj))
            print(f"  [{len(matches)}] {date[:16]}  FROM: {frm[:40]}  SUBJ: {subj[:60]}")

    print(f"\nFound {len(matches)} matching emails out of {len(ids)} total.")
    if matches:
        print("Run with --dry-run to see parsed data, or --insert to import.")
    else:
        print("\nNo matches. Edit SEARCH_SUBJECTS / SEARCH_FROM in this script to broaden the search.")
    return matches


def process_emails(mail, insert=False):
    """Fetch, parse, and optionally insert matching emails."""
    ids = fetch_form_emails(mail)
    inserted = skipped = errors = 0
    leads_found = []

    for eid in ids:
        _, data = mail.fetch(eid, "(RFC822)")
        msg = email.message_from_bytes(data[0][1])
        subj = decode_str(msg.get("Subject", ""))
        frm  = decode_str(msg.get("From", ""))

        if not is_form_email(subj, frm):
            continue

        try:
            date_str = msg.get("Date")
            email_date = parsedate_to_datetime(date_str) if date_str else None
            if email_date and email_date.tzinfo is None:
                email_date = email_date.replace(tzinfo=timezone.utc)
        except Exception:
            email_date = None

        body  = get_body(msg)
        lead  = parse_lead_from_body(body, email_date, subj)
        leads_found.append(lead)

        name  = lead.get("name", "?")
        email_addr = lead.get("email", "?")
        print(f"\n  {'[INSERT]' if insert else '[DRY RUN]'} {name} | {email_addr} | {lead.get('created_at', '')[:10]}")
        print(f"    product={lead.get('product')} source={lead.get('source')} phone={lead.get('phone', '—')}")

        if insert:
            ok = insert_lead(lead)
            if ok:
                print("    ✓ inserted")
                inserted += 1
            else:
                print("    ✗ insert failed")
                errors += 1
        else:
            skipped += 1

    print(f"\n── Summary ───────────────────────────────────────────────────────")
    print(f"  Found: {len(leads_found)}  Inserted: {inserted}  Skipped: {skipped}  Errors: {errors}")
    if not insert:
        print("  Run with --insert to write to Supabase.")


# ── EML directory / MBOX mode ─────────────────────────────────────────────────

def iter_messages_from_path(path):
    """Yield (msg, filepath) from a .mbox file or a directory of .eml files."""
    if os.path.isdir(path):
        eml_files = []
        for root, _, files in os.walk(path):
            for f in files:
                if f.lower().endswith(".eml"):
                    eml_files.append(os.path.join(root, f))
        print(f"  Found {len(eml_files)} .eml files in {path}")
        for fp in eml_files:
            with open(fp, "rb") as fh:
                yield email.message_from_bytes(fh.read()), fp
    elif os.path.isfile(path):
        print(f"  Reading mbox: {path}")
        mbox = mailbox.mbox(path)
        print(f"  {len(mbox)} messages")
        for msg in mbox:
            yield msg, path
    else:
        print(f"ERROR: Path not found: {path}")
        sys.exit(1)


def sample_mbox(path, count=3):
    """Print raw parsed text of the first N matching emails for parser tuning."""
    shown = 0
    for msg, fp in iter_messages_from_path(path):
        subj = decode_str(msg.get("Subject", ""))
        frm  = decode_str(msg.get("From", ""))
        if not is_form_email(subj, frm):
            continue
        try:
            date_str = msg.get("Date")
            email_date = parsedate_to_datetime(date_str) if date_str else None
            if email_date and email_date.tzinfo is None:
                email_date = email_date.replace(tzinfo=timezone.utc)
            if email_date and email_date < MIN_DATE:
                continue
        except Exception:
            pass
        body = get_body(msg)
        print(f"\n{'='*60}")
        print(f"FROM:    {frm}")
        print(f"SUBJECT: {subj}")
        print(f"DATE:    {msg.get('Date', '')}")
        print(f"{'─'*60}")
        print(body[:1500])
        shown += 1
        if shown >= count:
            break
    if shown == 0:
        print("No matching emails found.")


def process_mbox(path, insert=False):
    """Parse a Proton export (directory of .eml files or .mbox)."""
    inserted = skipped = errors = 0
    leads_found = []

    for msg, fp in iter_messages_from_path(path):
        subj = decode_str(msg.get("Subject", ""))
        frm  = decode_str(msg.get("From", ""))

        if not is_form_email(subj, frm):
            continue

        try:
            date_str = msg.get("Date")
            email_date = parsedate_to_datetime(date_str) if date_str else None
            if email_date and email_date.tzinfo is None:
                email_date = email_date.replace(tzinfo=timezone.utc)
        except Exception:
            email_date = None

        # Skip emails older than MIN_DATE
        if email_date and email_date < MIN_DATE:
            continue

        body = get_body(msg)
        lead = parse_lead_from_body(body, email_date, subj)
        leads_found.append(lead)

        name      = lead.get("name", "?")
        email_val = lead.get("email", "?")
        print(f"\n  {'[INSERT]' if insert else '[DRY RUN]'} {name} | {email_val} | {str(lead.get('created_at', ''))[:10]}")
        print(f"    product={lead.get('product')}  source={lead.get('source')}  phone={lead.get('phone', '—')}")
        if lead.get("message"):
            snippet = lead['message'][:80].replace('\n', ' ')
            print(f"    message={snippet}…")

        if insert:
            ok = insert_lead(lead)
            if ok:
                print("    ✓ inserted")
                inserted += 1
            else:
                print("    ✗ insert failed")
                errors += 1
        else:
            skipped += 1

    print(f"\n── Summary ───────────────────────────────────────────────────────")
    print(f"  Found: {len(leads_found)}  Inserted: {inserted}  Skipped: {skipped}  Errors: {errors}")
    if not insert:
        print("  Run with --insert to write to Supabase.")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Import historic Wix leads from Proton Bridge IMAP or .mbox export")
    parser.add_argument("--mbox", metavar="FILE", help="Path to .mbox file or exported .eml directory")
    parser.add_argument("--since", metavar="YYYY-MM-DD", help="Only import emails on or after this date (default: 2024-01-01)")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--scan",    action="store_true", help="List matching emails (IMAP only)")
    group.add_argument("--sample",  action="store_true", help="Print raw body of first 3 matching emails")
    group.add_argument("--dry-run", action="store_true", help="Parse but don't insert")
    group.add_argument("--insert",  action="store_true", help="Parse and insert into Supabase")
    args = parser.parse_args()

    if args.since:
        global MIN_DATE
        MIN_DATE = datetime.strptime(args.since, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        print(f"  Date filter: on or after {args.since}")

    if args.mbox:
        if args.sample:
            sample_mbox(args.mbox)
            return
        if args.insert and not SUPABASE_KEY:
            print("ERROR: Set SUPABASE_SERVICE_KEY env var first.")
            sys.exit(1)
        process_mbox(args.mbox, insert=args.insert)
        return

    # IMAP mode
    print(f"Connecting to Proton Bridge IMAP ({IMAP_HOST}:{IMAP_PORT})…")
    try:
        mail = connect_imap()
        print("  Connected.")
    except Exception as e:
        print(f"  Connection failed: {e}")
        sys.exit(1)

    if args.scan:
        mode_scan(mail)
    elif args.dry_run:
        process_emails(mail, insert=False)
    elif args.insert:
        if not SUPABASE_KEY:
            print("ERROR: Set SUPABASE_SERVICE_KEY env var first.")
            sys.exit(1)
        process_emails(mail, insert=True)

    mail.logout()


if __name__ == "__main__":
    main()
