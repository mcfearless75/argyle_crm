# Argyle CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the Cloudflare email worker, build a mobile-first Vite+React lead tracker, and harden the worker with dedup, raw archiving, and failure alerting.

**Architecture:** Three sequential sub-projects sharing one Supabase `leads` table. The worker (Cloudflare Email Worker) writes rows on inbound email; the front end (Vite+React on Vercel) reads and updates them via Supabase JS with Supabase Auth gating access.

**Tech Stack:** Cloudflare Workers + Wrangler, Vite, React, Supabase JS, Supabase Auth, Vercel, Resend (alerting)

**Git path:** `C:\Users\LTRD1054\AppData\Local\Programs\Git\cmd\git.exe`  
**Repo root:** `C:\Users\LTRD1054\OneDrive - The Very Group\Documents\crm_pmc\argyle-lead-parser`

---

## SUB-PROJECT 1 — Worker Deploy

### Task 1: Install Node.js LTS

**Files:** none

- [ ] **Step 1: Download Node.js LTS installer**

  Go to https://nodejs.org → download the Windows LTS installer (`.msi`). Run it, accept all defaults. This installs `node`, `npm`, and `npx` and adds them to PATH.

- [ ] **Step 2: Open a NEW PowerShell window (so PATH refreshes) and verify**

  ```powershell
  node --version
  npm --version
  ```
  Expected: version numbers printed (e.g. `v20.x.x`, `10.x.x`). If "not recognized" — restart PowerShell.

---

### Task 2: Install wrangler and set secrets

**Files:** none (secrets stored in Cloudflare, never committed)

- [ ] **Step 1: Install wrangler in the worker project**

  ```powershell
  cd "C:\Users\LTRD1054\OneDrive - The Very Group\Documents\crm_pmc\argyle-lead-parser"
  npm install
  ```
  Expected: `node_modules/` created, no errors.

- [ ] **Step 2: Log in to Cloudflare**

  ```powershell
  npx wrangler login
  ```
  This opens a browser tab. Authorise Wrangler. Terminal shows "Successfully logged in."

- [ ] **Step 3: Set SUPABASE_URL secret**

  ```powershell
  npx wrangler secret put SUPABASE_URL
  ```
  Paste your Supabase project URL when prompted (e.g. `https://xxxx.supabase.co`). Press Enter.

- [ ] **Step 4: Set SUPABASE_SERVICE_KEY secret**

  ```powershell
  npx wrangler secret put SUPABASE_SERVICE_KEY
  ```
  Paste the **service_role** key from Supabase → Project Settings → API. Press Enter.  
  ⚠️ This key bypasses RLS. Never put it in the front end or commit it.

---

### Task 3: Deploy the worker

**Files:** none

- [ ] **Step 1: Deploy**

  ```powershell
  npx wrangler deploy
  ```
  Expected output includes:
  ```
  Uploaded argyle-lead-parser
  Published argyle-lead-parser
  https://argyle-lead-parser.<your-subdomain>.workers.dev
  ```

- [ ] **Step 2: Verify the health check**

  Visit the workers.dev URL in a browser. Expected: page shows `argyle-lead-parser: ok`

- [ ] **Step 3: Bind the email address in Cloudflare dashboard**

  1. Cloudflare dashboard → your domain → **Email** → **Email Routing**
  2. Click **Routes** → **Add address**
  3. Address: `leads@<your-domain>`  Action: **Send to a Worker** → select `argyle-lead-parser`
  4. Save

- [ ] **Step 4: Point Wix form at the address**

  Wix dashboard → your form → Settings → Notifications → add `leads@<your-domain>` as recipient.

---

### Task 4: Smoke test the worker

**Files:** none

- [ ] **Step 1: Open live logs**

  ```powershell
  npx wrangler tail
  ```
  Leave this running in a terminal.

- [ ] **Step 2: Send a test email**

  Send an email to `leads@<your-domain>` with this body:
  ```
  First Name:
  Test
  Last Name:
  Lead
  Email:
  test@example.com
  Phone:
  07700 900000
  Address:
  1 Test Street, Neston, CH64 1AA
  Subject:
  Fitted wardrobes
  Message:
  Just checking the parser works.
  ```

- [ ] **Step 3: Confirm in wrangler tail**

  Expected log line:
  ```
  Parsed lead {"name":"Test Lead","email":"test@example.com","phone":"07700 900000","address":"1 Test Street, Neston, CH64 1AA","subject":"Fitted wardrobes","message":"Just checking the parser works.","source":"website","product":"doors","status":"new"}
  ```

- [ ] **Step 4: Confirm row in Supabase**

  Supabase dashboard → Table Editor → `leads`. Row should exist with `source: website`, `product: doors`, `status: new`.

- [ ] **Step 5: Submit a real Wix form end-to-end**

  Fill in the live Wix contact form. Confirm a new row appears in Supabase within 30 seconds.

---

## SUB-PROJECT 2 — Front-End Lead Tracker

### Task 5: Run Supabase migrations

**Files:** none (SQL run directly in Supabase dashboard)

- [ ] **Step 1: Enable RLS and add auth policy**

  Supabase dashboard → SQL Editor → New query → paste and run:
  ```sql
  alter table leads enable row level security;
  create policy "auth users only" on leads
    for all using (auth.role() = 'authenticated');
  ```
  Expected: "Success. No rows returned."

- [ ] **Step 2: Create two user accounts**

  Supabase dashboard → Authentication → Users → **Add user** (twice):
  - Owner: their email + a numeric PIN (4–6 digits) as password
  - Admin (you): your email + a numeric PIN

---

### Task 6: Scaffold the front-end project

**Files:**
- Create: `argyle-crm/index.html`
- Create: `argyle-crm/vite.config.js`
- Create: `argyle-crm/package.json`
- Create: `argyle-crm/.gitignore`
- Create: `argyle-crm/.env.example`

- [ ] **Step 1: Create the directory structure**

  ```powershell
  cd "C:\Users\LTRD1054\OneDrive - The Very Group\Documents\crm_pmc\argyle-lead-parser"
  New-Item -ItemType Directory -Force argyle-crm/src/lib
  New-Item -ItemType Directory -Force argyle-crm/src/pages
  New-Item -ItemType Directory -Force argyle-crm/src/components
  ```

- [ ] **Step 2: Create `argyle-crm/package.json`**

  ```json
  {
    "name": "argyle-crm",
    "private": true,
    "version": "0.0.1",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview",
      "test": "vitest"
    },
    "dependencies": {
      "@supabase/supabase-js": "^2.39.0",
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "react-router-dom": "^6.22.0"
    },
    "devDependencies": {
      "@testing-library/react": "^14.2.0",
      "@testing-library/user-event": "^14.5.0",
      "@vitejs/plugin-react": "^4.2.1",
      "jsdom": "^24.0.0",
      "vite": "^5.1.0",
      "vitest": "^1.3.0"
    }
  }
  ```

- [ ] **Step 3: Create `argyle-crm/vite.config.js`**

  ```js
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: [],
    },
  })
  ```

- [ ] **Step 4: Create `argyle-crm/index.html`**

  ```html
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Argyle CRM</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #111; }
      </style>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/main.jsx"></script>
    </body>
  </html>
  ```

- [ ] **Step 5: Create `argyle-crm/.env.example`**

  ```
  VITE_SUPABASE_URL=https://xxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key-here
  ```

- [ ] **Step 6: Create `argyle-crm/.gitignore`**

  ```
  node_modules/
  dist/
  .env.local
  ```

- [ ] **Step 7: Create your local `.env.local` (not committed)**

  Copy `.env.example` to `.env.local` and fill in real values from Supabase → Project Settings → API:
  - `VITE_SUPABASE_URL` — Project URL
  - `VITE_SUPABASE_ANON_KEY` — anon/public key (safe to expose in frontend)

- [ ] **Step 8: Install dependencies**

  ```powershell
  cd argyle-crm
  npm install
  ```

---

### Task 7: Supabase client

**Files:**
- Create: `argyle-crm/src/lib/supabase.js`

- [ ] **Step 1: Write the test**

  Create `argyle-crm/src/lib/supabase.test.js`:
  ```js
  import { supabase } from './supabase'

  test('supabase client is created', () => {
    expect(supabase).toBeDefined()
    expect(typeof supabase.from).toBe('function')
    expect(typeof supabase.auth.signInWithPassword).toBe('function')
  })
  ```

- [ ] **Step 2: Run test — expect fail**

  ```powershell
  npm test -- supabase.test
  ```
  Expected: FAIL — "Cannot find module './supabase'"

- [ ] **Step 3: Implement `src/lib/supabase.js`**

  ```js
  import { createClient } from '@supabase/supabase-js'

  export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )
  ```

- [ ] **Step 4: Run test — expect pass**

  ```powershell
  npm test -- supabase.test
  ```
  Expected: PASS

- [ ] **Step 5: Commit**

  ```powershell
  cd ..
  git add argyle-crm/
  git commit -m "feat: scaffold front-end, add supabase client"
  ```

---

### Task 8: StatusBar component

**Files:**
- Create: `argyle-crm/src/components/StatusBar.jsx`
- Create: `argyle-crm/src/components/StatusBar.test.jsx`

- [ ] **Step 1: Write the test**

  ```jsx
  import { render, screen, fireEvent } from '@testing-library/react'
  import { StatusBar } from './StatusBar'

  const STAGES = ['new', 'called', 'site visit', 'quoted', 'deposit', 'installed', 'done']

  test('renders all 7 stages', () => {
    render(<StatusBar currentStatus="new" onStatusChange={() => {}} />)
    STAGES.forEach(s => expect(screen.getByText(s)).toBeInTheDocument())
  })

  test('active stage has aria-current', () => {
    render(<StatusBar currentStatus="quoted" onStatusChange={() => {}} />)
    expect(screen.getByText('quoted').closest('button')).toHaveAttribute('aria-current', 'true')
  })

  test('clicking a stage calls onStatusChange', () => {
    const onChange = vi.fn()
    render(<StatusBar currentStatus="new" onStatusChange={onChange} />)
    fireEvent.click(screen.getByText('called'))
    expect(onChange).toHaveBeenCalledWith('called')
  })
  ```

- [ ] **Step 2: Run test — expect fail**

  ```powershell
  npm test -- StatusBar.test
  ```
  Expected: FAIL — "Cannot find module './StatusBar'"

- [ ] **Step 3: Implement `StatusBar.jsx`**

  ```jsx
  const STAGES = ['new', 'called', 'site visit', 'quoted', 'deposit', 'installed', 'done']

  export function StatusBar({ currentStatus, onStatusChange }) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0' }}>
        {STAGES.map(stage => (
          <button
            key={stage}
            aria-current={stage === currentStatus ? 'true' : undefined}
            onClick={() => onStatusChange(stage)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '2px solid #333',
              background: stage === currentStatus ? '#333' : '#fff',
              color: stage === currentStatus ? '#fff' : '#333',
              fontWeight: stage === currentStatus ? 700 : 400,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {stage}
          </button>
        ))}
      </div>
    )
  }
  ```

- [ ] **Step 4: Run test — expect pass**

  ```powershell
  npm test -- StatusBar.test
  ```
  Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

  ```powershell
  cd ..
  git add argyle-crm/src/components/
  git commit -m "feat: add StatusBar component"
  ```

---

### Task 9: NotesList component

**Files:**
- Create: `argyle-crm/src/components/NotesList.jsx`
- Create: `argyle-crm/src/components/NotesList.test.jsx`

- [ ] **Step 1: Write the test**

  ```jsx
  import { render, screen, fireEvent } from '@testing-library/react'
  import { NotesList } from './NotesList'

  test('renders existing notes split by double newline', () => {
    const notes = '[2026-06-16 10:00] First note\n\n[2026-06-16 11:00] Second note'
    render(<NotesList notes={notes} onAddNote={() => {}} />)
    expect(screen.getByText(/First note/)).toBeInTheDocument()
    expect(screen.getByText(/Second note/)).toBeInTheDocument()
  })

  test('renders empty state when no notes', () => {
    render(<NotesList notes={null} onAddNote={() => {}} />)
    expect(screen.getByText(/No notes yet/)).toBeInTheDocument()
  })

  test('calls onAddNote with textarea value when Add Note clicked', () => {
    const onAddNote = vi.fn()
    render(<NotesList notes="" onAddNote={onAddNote} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Test note' } })
    fireEvent.click(screen.getByText('Add note'))
    expect(onAddNote).toHaveBeenCalledWith('Test note')
  })
  ```

- [ ] **Step 2: Run test — expect fail**

  ```powershell
  npm test -- NotesList.test
  ```
  Expected: FAIL — "Cannot find module './NotesList'"

- [ ] **Step 3: Implement `NotesList.jsx`**

  ```jsx
  import { useState } from 'react'

  export function NotesList({ notes, onAddNote }) {
    const [text, setText] = useState('')
    const entries = notes ? notes.split('\n\n').filter(Boolean) : []

    function handleAdd() {
      if (!text.trim()) return
      onAddNote(text.trim())
      setText('')
    }

    return (
      <div style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8, fontSize: 16 }}>Notes</h3>
        {entries.length === 0
          ? <p style={{ color: '#888', fontSize: 14 }}>No notes yet</p>
          : entries.map((entry, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 14 }}>
                {entry}
              </div>
            ))
        }
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a note..."
          rows={3}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, marginTop: 8 }}
        />
        <button
          onClick={handleAdd}
          style={{ marginTop: 8, padding: '8px 20px', borderRadius: 8, background: '#333', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Add note
        </button>
      </div>
    )
  }
  ```

- [ ] **Step 4: Run test — expect pass**

  ```powershell
  npm test -- NotesList.test
  ```
  Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

  ```powershell
  cd ..
  git add argyle-crm/src/components/
  git commit -m "feat: add NotesList component"
  ```

---

### Task 10: Login page

**Files:**
- Create: `argyle-crm/src/pages/Login.jsx`

- [ ] **Step 1: Write the test**

  Create `argyle-crm/src/pages/Login.test.jsx`:
  ```jsx
  import { render, screen, fireEvent, waitFor } from '@testing-library/react'
  import { vi } from 'vitest'

  // Mock supabase before importing Login
  vi.mock('../lib/supabase', () => ({
    supabase: {
      auth: {
        signInWithPassword: vi.fn(),
      },
    },
  }))

  import { supabase } from '../lib/supabase'
  import { Login } from './Login'

  test('shows error on failed login', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })
    render(<Login onSuccess={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('PIN'), { target: { value: '1234' } })
    fireEvent.click(screen.getByText('Sign in'))
    await waitFor(() => expect(screen.getByText(/Invalid login credentials/)).toBeInTheDocument())
  })

  test('calls onSuccess on successful login', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null })
    const onSuccess = vi.fn()
    render(<Login onSuccess={onSuccess} />)
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('PIN'), { target: { value: '1234' } })
    fireEvent.click(screen.getByText('Sign in'))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })
  ```

- [ ] **Step 2: Run test — expect fail**

  ```powershell
  npm test -- Login.test
  ```
  Expected: FAIL

- [ ] **Step 3: Implement `Login.jsx`**

  ```jsx
  import { useState } from 'react'
  import { supabase } from '../lib/supabase'

  export function Login({ onSuccess }) {
    const [email, setEmail] = useState('')
    const [pin, setPin] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
      e.preventDefault()
      setLoading(true)
      setError(null)
      const { error } = await supabase.auth.signInWithPassword({ email, password: pin })
      setLoading(false)
      if (error) { setError(error.message); return }
      onSuccess()
    }

    return (
      <div style={{ maxWidth: 360, margin: '80px auto', padding: 24 }}>
        <h1 style={{ marginBottom: 24, fontSize: 24 }}>Argyle CRM</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 16 }}
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 16 }}
          />
          {error && <p style={{ color: 'red', marginBottom: 12, fontSize: 14 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: 14, borderRadius: 8, background: '#333', color: '#fff', border: 'none', fontSize: 16, cursor: 'pointer' }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    )
  }
  ```

- [ ] **Step 4: Run test — expect pass**

  ```powershell
  npm test -- Login.test
  ```
  Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

  ```powershell
  cd ..
  git add argyle-crm/src/pages/
  git commit -m "feat: add Login page"
  ```

---

### Task 11: Leads page

**Files:**
- Create: `argyle-crm/src/pages/Leads.jsx`

- [ ] **Step 1: Write the test**

  Create `argyle-crm/src/pages/Leads.test.jsx`:
  ```jsx
  import { render, screen } from '@testing-library/react'
  import { vi } from 'vitest'
  import { MemoryRouter } from 'react-router-dom'

  vi.mock('../lib/supabase', () => ({
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [
              { id: '1', name: 'Jane Smith', source: 'website', product: 'doors', status: 'new', created_at: new Date().toISOString() },
            ],
            error: null,
          })),
        })),
      })),
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
      removeChannel: vi.fn(),
    },
  }))

  import { Leads } from './Leads'

  test('renders lead cards', async () => {
    render(<MemoryRouter><Leads /></MemoryRouter>)
    expect(await screen.findByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('website')).toBeInTheDocument()
    expect(screen.getByText('doors')).toBeInTheDocument()
    expect(screen.getByText('new')).toBeInTheDocument()
  })
  ```

- [ ] **Step 2: Run test — expect fail**

  ```powershell
  npm test -- Leads.test
  ```
  Expected: FAIL

- [ ] **Step 3: Implement `Leads.jsx`**

  ```jsx
  import { useEffect, useState } from 'react'
  import { useNavigate } from 'react-router-dom'
  import { supabase } from '../lib/supabase'

  function timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  export function Leads() {
    const [leads, setLeads] = useState([])
    const navigate = useNavigate()

    useEffect(() => {
      supabase.from('leads').select('*').order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setLeads(data) })

      const channel = supabase.channel('leads-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' },
          payload => setLeads(prev => [payload.new, ...prev]))
        .subscribe()

      return () => supabase.removeChannel(channel)
    }, [])

    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
        <h1 style={{ marginBottom: 16, fontSize: 22 }}>Leads</h1>
        {leads.map(lead => (
          <div
            key={lead.id}
            onClick={() => navigate(`/leads/${lead.id}`)}
            style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <strong style={{ fontSize: 16 }}>{lead.name}</strong>
              <span style={{ fontSize: 12, color: '#888' }}>{timeAgo(lead.created_at)}</span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {lead.source && <span style={badge('#e0f0ff', '#0066cc')}>{lead.source}</span>}
              {lead.product && <span style={badge('#fff3e0', '#cc6600')}>{lead.product}</span>}
              {lead.status && <span style={badge('#e8f5e9', '#2e7d32')}>{lead.status}</span>}
            </div>
          </div>
        ))}
        {leads.length === 0 && <p style={{ color: '#888' }}>No leads yet.</p>}
      </div>
    )
  }

  function badge(bg, color) {
    return { background: bg, color, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }
  }
  ```

- [ ] **Step 4: Run test — expect pass**

  ```powershell
  npm test -- Leads.test
  ```
  Expected: PASS

- [ ] **Step 5: Commit**

  ```powershell
  cd ..
  git add argyle-crm/src/pages/Leads.jsx argyle-crm/src/pages/Leads.test.jsx
  git commit -m "feat: add Leads page with realtime subscription"
  ```

---

### Task 12: LeadDetail page

**Files:**
- Create: `argyle-crm/src/pages/LeadDetail.jsx`

- [ ] **Step 1: Write the test**

  Create `argyle-crm/src/pages/LeadDetail.test.jsx`:
  ```jsx
  import { render, screen, fireEvent, waitFor } from '@testing-library/react'
  import { vi } from 'vitest'
  import { MemoryRouter, Route, Routes } from 'react-router-dom'

  const mockLead = {
    id: '1', name: 'Jane Smith', email: 'jane@test.com', phone: '07700 900000',
    address: '1 High St', subject: 'Mirrors', message: 'Need a bathroom mirror',
    source: 'website', product: 'mirrors', status: 'new', value: null, notes: null,
    created_at: new Date().toISOString(),
  }

  const mockUpdate = vi.fn(() => Promise.resolve({ error: null }))

  vi.mock('../lib/supabase', () => ({
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: mockLead, error: null })) })) })),
        update: vi.fn(() => ({ eq: vi.fn(() => mockUpdate()) })),
      })),
    },
  }))

  import { LeadDetail } from './LeadDetail'

  function renderWithRouter() {
    return render(
      <MemoryRouter initialEntries={['/leads/1']}>
        <Routes><Route path="/leads/:id" element={<LeadDetail />} /></Routes>
      </MemoryRouter>
    )
  }

  test('renders lead fields', async () => {
    renderWithRouter()
    expect(await screen.findByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('jane@test.com')).toBeInTheDocument()
  })

  test('status bar is rendered', async () => {
    renderWithRouter()
    expect(await screen.findByText('quoted')).toBeInTheDocument()
  })
  ```

- [ ] **Step 2: Run test — expect fail**

  ```powershell
  npm test -- LeadDetail.test
  ```
  Expected: FAIL

- [ ] **Step 3: Implement `LeadDetail.jsx`**

  ```jsx
  import { useEffect, useState } from 'react'
  import { useParams, useNavigate } from 'react-router-dom'
  import { supabase } from '../lib/supabase'
  import { StatusBar } from '../components/StatusBar'
  import { NotesList } from '../components/NotesList'

  export function LeadDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [lead, setLead] = useState(null)

    useEffect(() => {
      supabase.from('leads').select('*').eq('id', id).single()
        .then(({ data }) => { if (data) setLead(data) })
    }, [id])

    async function updateField(field, value) {
      await supabase.from('leads').update({ [field]: value }).eq('id', id)
      setLead(prev => ({ ...prev, [field]: value }))
    }

    async function handleAddNote(text) {
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
      const entry = `[${timestamp}] ${text}`
      const updated = lead.notes ? `${lead.notes}\n\n${entry}` : entry
      await updateField('notes', updated)
    }

    if (!lead) return <div style={{ padding: 24 }}>Loading...</div>

    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
        <button onClick={() => navigate('/leads')} style={{ marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#555' }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>{lead.name}</h1>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>{lead.source} · {lead.product}</p>

        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          {[['Email', 'email'], ['Phone', 'phone'], ['Address', 'address'], ['Subject', 'subject'], ['Message', 'message']].map(([label, key]) =>
            lead[key] ? (
              <div key={key} style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
                <p style={{ fontSize: 15, marginTop: 2 }}>{lead[key]}</p>
              </div>
            ) : null
          )}
        </div>

        <StatusBar currentStatus={lead.status} onStatusChange={v => updateField('status', v)} />

        <div style={{ margin: '16px 0' }}>
          <label style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>VALUE (£)</label>
          <input
            type="number"
            defaultValue={lead.value || ''}
            onBlur={e => updateField('value', e.target.value ? Number(e.target.value) : null)}
            placeholder="0"
            style={{ display: 'block', width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16, marginTop: 4 }}
          />
        </div>

        <NotesList notes={lead.notes} onAddNote={handleAddNote} />
      </div>
    )
  }
  ```

- [ ] **Step 4: Run test — expect pass**

  ```powershell
  npm test -- LeadDetail.test
  ```
  Expected: PASS

- [ ] **Step 5: Commit**

  ```powershell
  cd ..
  git add argyle-crm/src/pages/
  git commit -m "feat: add LeadDetail page with status, value, notes"
  ```

---

### Task 13: App router and entry point

**Files:**
- Create: `argyle-crm/src/App.jsx`
- Create: `argyle-crm/src/main.jsx`

- [ ] **Step 1: Create `App.jsx`**

  ```jsx
  import { useEffect, useState } from 'react'
  import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
  import { supabase } from './lib/supabase'
  import { Login } from './pages/Login'
  import { Leads } from './pages/Leads'
  import { LeadDetail } from './pages/LeadDetail'

  export default function App() {
    const [session, setSession] = useState(undefined)

    useEffect(() => {
      supabase.auth.getSession().then(({ data }) => setSession(data.session))
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
      return () => subscription.unsubscribe()
    }, [])

    if (session === undefined) return null // loading

    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={session ? <Navigate to="/leads" /> : <Login onSuccess={() => {}} />} />
          <Route path="/leads" element={session ? <Leads /> : <Navigate to="/" />} />
          <Route path="/leads/:id" element={session ? <LeadDetail /> : <Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    )
  }
  ```

- [ ] **Step 2: Create `main.jsx`**

  ```jsx
  import React from 'react'
  import ReactDOM from 'react-dom/client'
  import App from './App'

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  ```

- [ ] **Step 3: Run the dev server and verify locally**

  ```powershell
  cd argyle-crm
  npm run dev
  ```
  Open `http://localhost:5173` in a browser. You should see the Login page. Sign in with one of the Supabase accounts created in Task 5.

- [ ] **Step 4: Commit**

  ```powershell
  cd ..
  git add argyle-crm/src/App.jsx argyle-crm/src/main.jsx
  git commit -m "feat: wire up router and auth session"
  ```

---

### Task 14: Deploy to Vercel

**Files:** none (Vercel config via dashboard)

- [ ] **Step 1: Push everything to GitHub**

  ```powershell
  "C:\Users\LTRD1054\AppData\Local\Programs\Git\cmd\git.exe" push
  ```

- [ ] **Step 2: Connect Vercel**

  1. Go to vercel.com → New Project → Import Git Repository → `mcfearless75/argyle_crm`
  2. **Root Directory:** set to `argyle-crm`
  3. Framework Preset: Vite (auto-detected)
  4. Add environment variables:
     - `VITE_SUPABASE_URL` → your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` → your anon key
  5. Click **Deploy**

- [ ] **Step 3: Verify on mobile**

  Open the Vercel URL on the owner's phone. Log in with PIN. Confirm the leads list loads and a tap opens the detail view.

---

## SUB-PROJECT 3 — Worker Hardening

### Task 15: Run raw column migration

**Files:** none (SQL run in Supabase dashboard)

- [ ] **Step 1: Add the raw column**

  Supabase dashboard → SQL Editor → New query:
  ```sql
  alter table leads add column if not exists raw text;
  ```
  Expected: "Success. No rows returned."

---

### Task 16: Add dedup, raw archive, and Resend alerting to the worker

**Files:**
- Modify: `argyle-lead-parser/src/index.js`

- [ ] **Step 1: Sign up for Resend and get an API key**

  Go to resend.com → create a free account → API Keys → Create API Key. Copy the key.

- [ ] **Step 2: Set the new secrets**

  ```powershell
  cd "C:\Users\LTRD1054\OneDrive - The Very Group\Documents\crm_pmc\argyle-lead-parser"
  npx wrangler secret put RESEND_API_KEY
  npx wrangler secret put ALERT_EMAIL
  ```
  For `ALERT_EMAIL` paste the owner's email address.

- [ ] **Step 3: Replace `src/index.js` with the hardened version**

  ```js
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
        console.log("Parsed lead", JSON.stringify(lead));

        if (await isDuplicate(lead, env)) {
          console.log("Duplicate suppressed", lead.email, lead.subject);
          return;
        }

        try {
          await insertLead(lead, env);
        } catch (insertErr) {
          console.error("Insert failed, sending alert", insertErr.message);
          await sendAlert(lead, insertErr, env);
        }
      } catch (err) {
        console.error("Lead parse/insert error", err.message);
      }
    },

    async fetch() {
      return new Response("argyle-lead-parser: ok", { status: 200 });
    },
  };
  ```

- [ ] **Step 4: Deploy the hardened worker**

  ```powershell
  npx wrangler deploy
  ```
  Expected: "Published argyle-lead-parser"

- [ ] **Step 5: Test dedup**

  Send the same test email twice within 10 minutes. Check `wrangler tail` — second email should log "Duplicate suppressed". Supabase should have only one row.

- [ ] **Step 6: Test raw archive**

  Send an email from a random address with no matching source. Check Supabase — the new row should have a non-null `raw` column containing the email body.

- [ ] **Step 7: Commit and push**

  ```powershell
  cd "C:\Users\LTRD1054\OneDrive - The Very Group\Documents\crm_pmc\argyle-lead-parser"
  "C:\Users\LTRD1054\AppData\Local\Programs\Git\cmd\git.exe" add argyle-lead-parser/src/index.js
  "C:\Users\LTRD1054\AppData\Local\Programs\Git\cmd\git.exe" commit -m "feat: harden worker — dedup, raw archive, Resend alerting"
  "C:\Users\LTRD1054\AppData\Local\Programs\Git\cmd\git.exe" push
  ```

---

## Definition of Done

- [ ] Worker deployed, health check URL returns `argyle-lead-parser: ok`
- [ ] Wix form submission creates a correctly-parsed row in Supabase
- [ ] Owner can log in on phone, see leads in real time, update status + notes + value
- [ ] Duplicate emails within 10 min are suppressed
- [ ] Unknown-source leads have `raw` column populated
- [ ] Insert failure sends an alert email with the lead data
