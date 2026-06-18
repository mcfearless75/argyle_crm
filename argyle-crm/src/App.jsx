import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { ThemeProvider, useTheme } from './lib/ThemeContext'
import { Login } from './pages/Login'
import { Leads } from './pages/Leads'
import { LeadDetail } from './pages/LeadDetail'

function urlB64ToUint8Array(b64) {
  const padding = '='.repeat((4 - b64.length % 4) % 4)
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

function PushBanner() {
  const { C } = useTheme()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      setShow(true)
    }
  }, [])

  if (!show) return null

  async function handleEnable() {
    setShow(false)
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    try {
      const reg = await navigator.serviceWorker.ready
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (!vapidKey) { console.warn('VITE_VAPID_PUBLIC_KEY not set — push disabled'); return }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidKey),
      })
      await supabase.from('push_subscriptions').upsert(
        { endpoint: sub.endpoint, subscription: sub.toJSON() },
        { onConflict: 'endpoint' }
      )
    } catch (e) {
      console.warn('Push subscription failed:', e)
    }
  }

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 999,
      background: C.surface, border: `1px solid ${C.green}`, borderRadius: 12,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: `0 4px 24px rgba(0,0,0,0.2)`,
      maxWidth: 480, margin: '0 auto',
    }}>
      <span style={{ fontSize: 20 }}>🔔</span>
      <p style={{ flex: 1, fontSize: 14, color: C.text, lineHeight: 1.4 }}>
        Get notified when new leads arrive
      </p>
      <button
        onClick={handleEnable}
        style={{ padding: '8px 16px', borderRadius: 8, background: C.green, color: C.bg, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
      >
        Enable
      </button>
      <button
        onClick={() => setShow(false)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18, lineHeight: 1, padding: 4 }}
      >
        ×
      </button>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={session ? <Navigate to="/leads" /> : <Login />} />
          <Route path="/leads" element={session ? <Leads /> : <Navigate to="/" />} />
          <Route path="/leads/:id" element={session ? <LeadDetail /> : <Navigate to="/" />} />
        </Routes>
        {session && <PushBanner />}
      </BrowserRouter>
    </ThemeProvider>
  )
}
