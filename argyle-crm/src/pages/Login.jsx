import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/ThemeContext'

export function Login({ onSuccess }) {
  const { C } = useTheme()
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [focusEmail, setFocusEmail] = useState(false)
  const [focusPin, setFocusPin] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pin })
    setLoading(false)
    if (error) { setError(error.message); return }
    onSuccess?.()
  }

  const inputStyle = (focused) => ({
    display: 'block',
    width: '100%',
    padding: '13px 16px',
    marginBottom: 12,
    borderRadius: 8,
    border: `1px solid ${focused ? C.green : C.border}`,
    background: C.bg,
    color: C.text,
    fontSize: 16,
    outline: 'none',
    transition: 'border-color 200ms',
    boxShadow: focused ? `0 0 0 3px ${C.greenDim}` : 'none',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="7" fill={C.green} />
              <path d="M7 14l5 5 9-9" stroke={C.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: '-0.5px' }}>
              ARGYLE
            </span>
          </div>
          <p style={{ color: C.muted, fontSize: 14, letterSpacing: '0.08em', fontWeight: 500 }}>CRM PORTAL</p>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 6 }}>Sign in</h2>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>Access your lead dashboard</p>

          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'Fira Code', monospace" }}>EMAIL</label>
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocusEmail(true)}
              onBlur={() => setFocusEmail(false)}
              required
              style={inputStyle(focusEmail)}
            />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'Fira Code', monospace" }}>PASSWORD</label>
            <input
              type="password"
              placeholder="••••••••"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onFocus={() => setFocusPin(true)}
              onBlur={() => setFocusPin(false)}
              required
              style={inputStyle(focusPin)}
            />

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid ${C.red}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: C.red }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 8,
                background: C.green,
                color: C.bg,
                border: 'none',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 200ms',
                opacity: loading ? 0.7 : 1,
                letterSpacing: '0.02em',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
