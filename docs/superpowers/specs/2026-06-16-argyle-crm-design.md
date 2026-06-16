# Argyle CRM — Design Spec
**Date:** 2026-06-16  
**Repo:** https://github.com/mcfearless75/argyle_crm

---

## Overview

Three sub-projects built and pushed from one Windows machine, in this order:

1. **Worker Deploy** — get `argyle-lead-parser` live on Cloudflare (ops, no new code)
2. **Front-End Lead Tracker** — Vite + React + Supabase + Vercel (display side)
3. **Worker Hardening** — dedup, raw archive, failure alerting (additive to `src/index.js`)

They share one Supabase `leads` table. The worker writes rows; the front end reads and updates them.

---

## Sub-Project 1 — Worker Deploy

Pure environment setup. No code changes.

**Steps:**
1. Install Node.js LTS on the build machine
2. `cd argyle-lead-parser && npm install` (pulls wrangler)
3. `npx wrangler secret put SUPABASE_URL`
4. `npx wrangler secret put SUPABASE_SERVICE_KEY` (service_role key — server-side only, never in front end)
5. `npx wrangler deploy`
6. Cloudflare dashboard → Email Routing → bind `leads@<domain>` to `argyle-lead-parser`
7. Smoke test: send a manual test email, watch `wrangler tail`, confirm row appears in Supabase

**Done when:** a real Wix form submission creates a correctly-parsed row in `leads`.

---

## Sub-Project 2 — Front-End Lead Tracker

### Stack
- Vite + React (no TypeScript — keep it simple)
- Supabase JS client (anon key, authenticated via Supabase Auth)
- Vercel (free tier, root directory: `argyle-crm/`)

### Repository layout
```
argyle-crm/          ← subfolder in argyle_crm repo
  src/
    App.jsx
    main.jsx
    lib/
      supabase.js    ← single supabase client instance
    pages/
      Login.jsx
      Leads.jsx
      LeadDetail.jsx
    components/
      StatusBar.jsx
      NotesList.jsx
  index.html
  vite.config.js
  .env.example
  .gitignore         ← excludes .env.local
```

### Auth
- Supabase Auth, email + numeric PIN (4–6 digits) as password
- Two accounts created manually in Supabase dashboard: owner + admin
- Anon key safe in frontend env — RLS gates all reads/writes to authenticated users

**RLS migration (run once in Supabase SQL editor):**
```sql
alter table leads enable row level security;
create policy "auth users only" on leads
  for all using (auth.role() = 'authenticated');
```

### Pages

**Login (`/`)**
- Email field + PIN field (numeric, type="password")
- Calls `supabase.auth.signInWithPassword()`
- On success → `/leads`
- Error shown inline (wrong PIN, unknown email)

**Leads (`/leads`)**
- Card list, sorted newest-first
- Each card: name, source badge (website / google / facebook / email), product tag (mirrors / doors / both / unknown), status chip, time-ago
- Realtime subscription — new rows appear instantly without refresh
- Tap card → `/leads/:id`

**LeadDetail (`/leads/:id`)**
- Top section: all parsed fields (name, email, phone, address, subject, message, source, product)
- Middle: `StatusBar` — seven tappable stage chips:
  `new → called → site visit → quoted → deposit → installed → done`
  Tapping a stage writes `status` to Supabase immediately
- Value field: numeric (£), writes `value` on blur
- Bottom: `NotesList` — existing notes displayed with timestamps; textarea + "Add note" button appends `\n\n[timestamp] note text` to the `notes` column

### Components

**StatusBar**
- Props: `currentStatus`, `onStatusChange`
- Renders all 7 stages as chips; active stage highlighted; tapping any stage calls `onStatusChange(newStatus)`

**NotesList**
- Props: `notes` (raw text string), `leadId`
- Parses existing notes by `\n\n` separator for display
- Appends new note with `[YYYY-MM-DD HH:mm]` prefix

### Env vars
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

### Vercel deployment
1. Connect Vercel to `mcfearless75/argyle_crm`
2. Set root directory to `argyle-crm`
3. Add the two env vars in Vercel dashboard
4. Deploy — auto-deploys on every push to `master`

**Done when:** owner can log in on their phone, see a new lead arrive in real time, and update its status and notes.

---

## Sub-Project 3 — Worker Hardening

All changes in `argyle-lead-parser/src/index.js`. One SQL migration.

### 1 — Dedup
Before inserting, query Supabase for an existing lead with matching `email` AND `subject` created within the last 10 minutes. If found, log `"duplicate suppressed"` and return without inserting. Guards against Wix double-sends.

### 2 — Raw archive
- Add `raw text` column to `leads` table
- For leads that hit the **generic fallback** (no matching source rule), store the full cleaned email body in `raw`
- Known sources (website/google/facebook) do not store raw — their extractors are trusted

**Migration:**
```sql
alter table leads add column if not exists raw text;
```

### 3 — Failure alerting
- If `insertLead()` throws, send an alert email via Resend API (free tier — 100 emails/day)
- Alert recipient: owner's email address (hardcoded in worker or via a `ALERT_EMAIL` secret)
- Alert body: plain text with the parsed lead JSON, so the lead is not lost even if DB write failed
- New secret: `RESEND_API_KEY` (set via `wrangler secret put RESEND_API_KEY`)
- Resend endpoint: `POST https://api.resend.com/emails`

**Done when:** a forced insert failure triggers an alert email containing the lead data.

---

## Shared Supabase schema (reference)

```sql
-- Already deployed:
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text, email text, phone text, address text,
  source text, subject text, message text,
  product text, status text default 'new', value numeric, notes text
);

-- Add for hardening:
alter table leads add column if not exists raw text;

-- Add for front-end auth:
alter table leads enable row level security;
create policy "auth users only" on leads
  for all using (auth.role() = 'authenticated');
```

---

## Build order

| Order | Sub-project | Blocker |
|-------|-------------|---------|
| 1 | Worker deploy | Need Node.js installed, Cloudflare email route configured |
| 2 | Front-end | Need Supabase URL + anon key, Vercel account |
| 3 | Worker hardening | Need Resend account + API key, worker already deployed |
