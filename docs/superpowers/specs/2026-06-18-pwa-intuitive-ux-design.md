# Argyle CRM — PWA + Intuitive UX Design Spec
**Date:** 2026-06-18
**Status:** Approved

## Problem

The owner of Argyle Sliding Mirror Doors has no way to know when a new lead arrives unless Paul manually screenshots the email and sends it via WhatsApp. The owner then has to copy the phone number manually to call or WhatsApp the customer. The CRM exists but is not yet part of the owner's workflow.

## Goal

Replace the screenshot-to-WhatsApp habit with a single notification tap → read → call/WhatsApp flow. Zero IT knowledge required to operate.

## Users

- **Owner** — primary mobile user, no IT background, needs to respond to leads quickly
- **Paul** — secondary user, manages the system, comfortable with tech

Both share one login.

---

## Part 1 — PWA (Installable App)

**What:** Add a Web App Manifest and service worker so the CRM can be installed on the owner's phone home screen.

**Files:**
- `argyle-crm/public/manifest.json` — app name, short name, icons, theme colour, display mode
- `argyle-crm/public/sw.js` — service worker (handles push events and notification clicks)
- `argyle-crm/index.html` — add `<link rel="manifest">` and service worker registration script

**Behaviour:**
- When installed, opens full screen with no browser chrome (standalone mode)
- App icon and name: "Argyle" with green theme colour `#22C55E`
- On first open, prompts owner to accept push notification permission (one-time)

**Icons needed:** 192×192 and 512×512 PNG — use a simple green square with white "A" or the existing SVG logo mark

---

## Part 2 — Push Notifications on New Lead

**What:** When a new lead is inserted into Supabase, the service worker fires a push notification to any installed device.

**How it works:**
- The React app registers a push subscription using the Web Push API and saves it to a new Supabase table `push_subscriptions`
- The Cloudflare Email Worker (which already creates leads) also sends a Web Push notification to all stored subscriptions using the VAPID protocol
- Service worker `sw.js` receives the push event and displays the notification: title = "New enquiry — [name]", body = first 80 chars of message

**Notification tap behaviour:**
- Opens the CRM directly to `/leads/[id]` for that lead
- If the app is already open, focuses it and navigates

**VAPID keys:** Generated once, stored as Cloudflare Worker secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)

**New Supabase table:**
```sql
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz default now()
);
```
RLS: service_role only (worker writes, app writes via service_role key on subscribe).

**iOS note:** Push notifications require iOS 16.4+ and the PWA must be installed via Safari's "Add to Home Screen". A one-time setup note should be shown to the owner on first visit from an iOS device.

---

## Part 3 — One-tap Call & WhatsApp on Lead Detail

**What:** Two action buttons on the LeadDetail page, positioned prominently above the pipeline bar.

**Call button:**
- `<a href="tel:[phone]">` — opens native phone dialler
- Green button, phone icon, label "Call [first name]"
- Only renders if `lead.phone` is present

**WhatsApp button:**
- `<a href="https://wa.me/[phone_e164]?text=[pre-filled message]">` — opens WhatsApp
- Pre-filled text: "Hi [first name], thanks for your enquiry about [product]. I'll be in touch shortly."
- Phone number formatted to E.164 (strip spaces, ensure +44 prefix)
- Dark/outlined button with WhatsApp green icon
- Only renders if `lead.phone` is present

**Placement:** Full-width button row between the lead name/chips and the info card. Visible immediately without scrolling.

---

## Part 4 — UI Simplifications

**Pipeline stage labels** — rename with emoji for clarity:

| Current | New |
|---------|-----|
| new | 🆕 New |
| called | 📞 Called |
| site visit | 🏠 Site Visit |
| quoted | 💰 Quoted |
| deposit | 💳 Deposit |
| installed | 🔧 Installed |
| done | ✅ Done |

Emoji render in the StatusBar pills. Underlying data values in Supabase remain unchanged (lowercase English).

**Lead list card improvements:**
- Phone number shown directly on the card (below name, before chips) so the owner can tap-to-call from the list without opening the lead
- New leads (status = "new") get a left border accent in green (`border-left: 3px solid C.green`)
- Remove the "LIVE" indicator text — replace with a subtle pulsing green dot only (less jargon)

**Notification permission prompt:**
- On login success, show a one-time banner: "Tap to get notified when new leads arrive" with an "Enable" button
- Only shown if `Notification.permission === 'default'` (not yet asked)
- Dismissed permanently once answered

---

## Out of Scope

- Multi-user / role-based access
- Search or filtering (separate future feature)
- Email reply from within the CRM
- Analytics or pipeline value totals

---

## Success Criteria

1. Owner installs the CRM on their home screen without help
2. When a new lead arrives, owner receives a push notification within 5 seconds
3. Tapping the notification opens the correct lead
4. Owner can call or WhatsApp the customer with one tap from the lead detail
5. Paul no longer needs to send screenshots

---

## Implementation Order

1. `manifest.json` + service worker skeleton (PWA shell)
2. VAPID key generation + Cloudflare Worker push send
3. React push subscription registration + `push_subscriptions` table
4. Call + WhatsApp buttons on LeadDetail
5. UI tweaks (emoji stages, phone on card, new-lead border, notification banner)
