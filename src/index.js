// Argyle multi-source lead parser → Supabase
// Receives lead emails, classifies by source, inserts a structured row.

// ---------- text extraction (HTML + quoted-printable safe) ----------
function toText(raw) {
  let s = raw
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  s = s.split(/\n\r?\n/).slice(1).join("\n\n"); // drop headers
  s = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return s.replace(/[ \t]+/g, " ");
}

// ---------- product auto-tagging ----------
function detectProduct(s) {
  const t = (s || "").toLowerCase();
  const mirror = /mirror/.test(t);
  const door = /door|wardrobe|bi.?fold|sliding|french|patio|composite|glazed|splashback/.test(t);
  if (mirror && door) return "both";
  if (door) return "doors";
  if (mirror) return "mirrors";
  return "unknown";
}

// ---------- label-based extractor (for clean "Label: value" emails) ----------
function byLabels(text, labels) {
  const out = {};
  labels.forEach((label, i) => {
    const next = labels[i + 1];
    const stop = next ? `${next}\\s*:` : "$";
    const re = new RegExp(`${label}\\s*:\\s*([\\s\\S]*?)\\s*(?=${stop})`, "i");
    const m = text.match(re);
    out[label] = m ? m[1].trim() : "";
  });
  return out;
}

// ---------- generic fallback: scrape any "Label: value" pairs ----------
function generic(text) {
  const p = {};
  const re = /([A-Za-z][A-Za-z \/]{1,28}?)\s*:\s*\n?\s*([^\n]+)/g;
  let m;
  while ((m = re.exec(text))) p[m[1].trim().toLowerCase()] = m[2].trim();
  const pick = (...k) => k.map((x) => p[x]).find(Boolean) || null;
  return {
    name:
      pick("name", "full name") ||
      [pick("first name"), pick("last name")].filter(Boolean).join(" ") ||
      "Unknown",
    email: pick("email", "e-mail"),
    phone: pick("phone", "telephone", "mobile", "tel", "contact number"),
    address: pick("address", "postcode", "location"),
    subject: pick("subject", "enquiry", "service"),
    message: pick("message", "comments", "details", "notes", "how can we help"),
  };
}

// ---------- SOURCE RULES — add one block per lead source over time ----------
const SOURCES = [
  {
    // Wix website form — CONFIRMED format
    name: "website",
    match: (from, subject) =>
      /wix|argyle/i.test(from) || /new submission|contact got|submission summary/i.test(subject),
    extract: (text) => {
      const f = byLabels(text, ["First Name", "Last Name", "Email", "Phone", "Address", "Subject", "Message"]);
      return {
        name: [f["First Name"], f["Last Name"]].filter(Boolean).join(" ") || "Unknown",
        email: f["Email"], phone: f["Phone"], address: f["Address"],
        subject: f["Subject"], message: f["Message"],
      };
    },
  },
  {
    // Google Business Profile — PLACEHOLDER. Confirm against a real GBP lead email.
    name: "google",
    match: (from, subject) =>
      /google\.com|businessprofile|business\.google/i.test(from) ||
      /new (lead|message|customer)/i.test(subject),
    extract: (text) => generic(text),
  },
  {
    // Facebook Lead Ads email notification — PLACEHOLDER. Confirm against a real sample.
    name: "facebook",
    match: (from, subject) =>
      /facebook|fb\.com|meta\.com/i.test(from) || /lead|new response/i.test(subject),
    extract: (text) => generic(text),
  },
];

// ---------- combine: pick a source, extract, tag ----------
function parseAny(text, from, subject) {
  const src = SOURCES.find((s) => s.match(from || "", subject || ""));
  const base = src ? src.extract(text) : generic(text);
  return {
    name: base.name || "Unknown",
    email: base.email || null,
    phone: base.phone || null,
    address: base.address || null,
    subject: base.subject || null,
    message: base.message || null,
    source: src ? src.name : "email",
    product: detectProduct(`${base.subject || ""} ${base.message || ""}`),
    status: "new",
  };
}

// ---------- Supabase insert ----------
async function insertLead(lead, env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/leads`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(lead),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Supabase insert failed", res.status, body);
    throw new Error(`Supabase ${res.status}`);
  }
}

export default {
  // Inbound email handler
  async email(message, env, ctx) {
    try {
      const raw = await new Response(message.raw).text();
      const subject = message.headers.get("subject") || "";
      const lead = parseAny(toText(raw), message.from, subject);
      console.log("Parsed lead", JSON.stringify(lead));
      await insertLead(lead, env);
    } catch (err) {
      console.error("Lead parse/insert error", err.message);
      // Swallow the error so the email isn't bounced/retried into a loop.
    }
  },

  // Optional health check: visit the worker URL to confirm it's deployed
  async fetch() {
    return new Response("argyle-lead-parser: ok", { status: 200 });
  },
};
