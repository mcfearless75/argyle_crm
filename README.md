# Argyle CRM

Email-to-CRM lead capture: Cloudflare Worker parses inbound emails and writes leads to Supabase; a React SPA provides the dashboard.

## Stack

- **Cloudflare Workers** — inbound email handler (`src/index.js`)
- **Supabase** — Postgres database + Auth
- **React 18 + Vite** — frontend SPA (`argyle-crm/`)
- **Vercel** — frontend hosting

## Local development

```bash
git clone <repo>
cd argyle-crm
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## Tests

```bash
cd argyle-crm
npm test
```

## Deploy Worker

```bash
# From project root
npm install
wrangler login
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put RESEND_API_KEY
wrangler deploy
```

## Deploy Frontend

1. Push to GitHub.
2. Connect the repo in Vercel — set root directory to `argyle-crm`.
3. Add environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. All routes rewrite to `index.html` via `vercel.json`.

## Supabase setup

1. Run `supabase/migrations/001_leads.sql` in the Supabase SQL editor.
2. Create users in **Authentication → Users** dashboard (do not insert directly via SQL).

## Email routing

Cloudflare dashboard → **Email → Email Routing → Routes** → add rule:
- Address: `leads@<yourdomain>`
- Action: **Send to Worker** → select your deployed Worker
