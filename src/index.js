// Argyle multi-source lead parser → Supabase
// Receives lead emails, classifies by source, inserts a structured row.

// ---------- text extraction (HTML + quoted-printable safe) ----------
function toText(raw) {
  let s = raw
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  s = s.split(/\n\r?\n/).slice(1).join("\n\n");
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

// ---------- label-based extractor ----------
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

// ---------- generic fallback ----------
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

// ---------- SOURCE RULES ----------
const SOURCES = [
  {
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
    name: "google",
    match: (from, subject) =>
      /google\.com|businessprofile|business\.google/i.test(from) ||
      /new (lead|message|customer)/i.test(subject),
    extract: (text) => generic(text),
  },
  {
    name: "facebook",
    match: (from, subject) =>
      /facebook|fb\.com|meta\.com/i.test(from) || /lead|new response/i.test(subject),
    extract: (text) => generic(text),
  },
];

// ---------- parse ----------
function parseAny(text, from, subject) {
  const src = SOURCES.find((s) => s.match(from || "", subject || ""));
  const base = src ? src.extract(text) : generic(text);
  // Store raw body only for generic fallback (unrecognised source)
  const raw = src ? null : text;
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
    raw,
  };
}

// ---------- dedup ----------
async function isDuplicate(lead, env) {
  if (!lead.email || !lead.subject) return false;
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const url = `${env.SUPABASE_URL}/rest/v1/leads?email=eq.${encodeURIComponent(lead.email)}&subject=eq.${encodeURIComponent(lead.subject)}&created_at=gte.${since}&select=id&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    },
  });
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

// ---------- Supabase insert ----------
async function insertLead(lead, env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/leads`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(lead),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Supabase insert failed", res.status, body);
    throw new Error(`Supabase ${res.status}`);
  }
  const [row] = await res.json();
  return row;
}

// ---------- Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) ----------
function b64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromB64url(s) {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded + "=".repeat((4 - padded.length % 4) % 4)), c => c.charCodeAt(0));
}

function concat(...arrays) {
  const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

async function hkdf(salt, ikm, info, length) {
  const base = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    base, length * 8
  );
  return new Uint8Array(bits);
}

async function encryptWebPush(sub, payloadStr, vapidPub, vapidPriv, vapidSub) {
  const enc = new TextEncoder();
  const p256dh = fromB64url(sub.keys.p256dh);
  const auth   = fromB64url(sub.keys.auth);
  const plain  = enc.encode(payloadStr);

  // Ephemeral ECDH key pair (as = application server)
  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));

  // ECDH shared secret
  const uaPub = await crypto.subtle.importKey("raw", p256dh, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const dh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaPub }, ephemeral.privateKey, 256));

  // IKM (RFC 8291 §3.3): HKDF(salt=auth, ikm=dh, info="WebPush: info\0" || ua_pub || as_pub, L=32)
  const authInfo = concat(enc.encode("WebPush: info\0"), p256dh, asPub);
  const ikm = await hkdf(auth, dh, authInfo, 32);

  // Per-message salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // CEK + Nonce (RFC 8188)
  const cek   = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  // Encrypt AES-128-GCM (append \x02 end-of-record delimiter)
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, concat(plain, new Uint8Array([0x02]))));

  // aes128gcm header: salt(16) + rs(4) + keyid_len(1) + keyid(65)
  const rs = new Uint8Array([0x00, 0x00, 0x10, 0x00]); // 4096
  const body = concat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);

  // VAPID JWT (RFC 8292)
  const aud = new URL(sub.endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const jwtH = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const jwtP = b64url(enc.encode(JSON.stringify({ aud, exp: now + 3600, sub: vapidSub })));
  const unsigned = `${jwtH}.${jwtP}`;

  const pubBytes = fromB64url(vapidPub);
  const sigKey = await crypto.subtle.importKey("jwk", {
    kty: "EC", crv: "P-256",
    d: vapidPriv,
    x: b64url(pubBytes.slice(1, 33)),
    y: b64url(pubBytes.slice(33, 65)),
  }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, sigKey, enc.encode(unsigned)));

  return {
    body,
    headers: {
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      Authorization: `vapid t=${unsigned}.${b64url(sig)},k=${vapidPub}`,
      TTL: "60",
    },
  };
}

async function sendPushNotifications(lead, env) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return;
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/push_subscriptions?select=endpoint,subscription`, {
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` },
  });
  const subs = await res.json();
  if (!Array.isArray(subs) || !subs.length) return;

  const payload = JSON.stringify({
    title: `New enquiry — ${lead.name || "Unknown"}`,
    body: (lead.message || lead.subject || "").slice(0, 80),
    url: lead.id ? `/leads/${lead.id}` : "/leads",
  });

  const stale = [];
  await Promise.allSettled(subs.map(async ({ endpoint, subscription }) => {
    try {
      const { body, headers } = await encryptWebPush(subscription, payload, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT);
      const r = await fetch(endpoint, { method: "POST", headers, body });
      if (r.status === 404 || r.status === 410) stale.push(endpoint);
    } catch (e) {
      console.warn("Push delivery failed", endpoint, e.message);
    }
  }));

  if (stale.length) {
    await fetch(`${env.SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=in.(${stale.map(e => `"${e}"`).join(",")})`, {
      method: "DELETE",
      headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` },
    });
  }
}

// ---------- Resend alert ----------
async function sendAlert(lead, err, env) {
  if (!env.RESEND_API_KEY || !env.ALERT_EMAIL) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Argyle CRM <alerts@argyle-crm.com>",
      to: env.ALERT_EMAIL,
      subject: "Lead insert failed — action required",
      text: `A lead could not be saved to Supabase.\n\nError: ${err.message}\n\nLead data:\n${JSON.stringify(lead, null, 2)}`,
    }),
  });
}

export default {
  async email(message, env, ctx) {
    try {
      const raw = await new Response(message.raw).text();
      const subject = message.headers.get("subject") || "";
      const lead = parseAny(toText(raw), message.from, subject);
      console.log("Lead parsed", { source: lead.source, product: lead.product, status: lead.status });

      if (await isDuplicate(lead, env)) {
        console.log("Duplicate suppressed", { source: lead.source, product: lead.product });
        return;
      }

      let row;
      try {
        row = await insertLead(lead, env);
      } catch (insertErr) {
        console.error("Insert failed, sending alert", insertErr.message);
        await sendAlert(lead, insertErr, env);
        return;
      }

      try {
        await sendPushNotifications(row || lead, env);
      } catch (pushErr) {
        console.warn("Push notifications failed (non-fatal)", pushErr.message);
      }
    } catch (err) {
      console.error("Lead parse/insert error", err.message);
    }
  },

  async fetch() {
    return new Response("argyle-lead-parser: ok", { status: 200 });
  },
};
