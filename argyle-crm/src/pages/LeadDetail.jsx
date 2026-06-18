import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/ThemeContext'
import { StatusBar } from '../components/StatusBar'
import { NotesList } from '../components/NotesList'

export function LeadDetail() {
  const { C } = useTheme()
  const { id } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [valueInput, setValueInput] = useState('')
  const [valueFocused, setValueFocused] = useState(false)

  useEffect(() => {
    supabase.from('leads').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error) { setFetchError('Could not load lead — check your connection'); return }
        if (data) { setLead(data); setValueInput(data.value != null ? String(data.value) : '') }
      })
  }, [id])

  async function updateField(field, value) {
    const prev = lead[field]
    setLead(l => ({ ...l, [field]: value }))
    const { error } = await supabase.from('leads').update({ [field]: value }).eq('id', id)
    if (error) {
      setLead(l => ({ ...l, [field]: prev }))
      setErrorMsg('Failed to save — please try again')
    }
  }

  async function handleAddNote(text) {
    if (!lead) return
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
    const entry = `[${timestamp}] ${text}`
    const updated = lead.notes ? `${lead.notes}\n\n${entry}` : entry
    await updateField('notes', updated)
  }

  if (fetchError) return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: 20 }}>
      <div style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid ${C.red}`, borderRadius: 10, padding: '12px 16px', color: C.red, fontSize: 14, marginBottom: 12 }}>{fetchError}</div>
      <BackButton onClick={() => navigate('/leads')} C={C} />
    </div>
  )

  if (!lead) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: C.muted }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, display: 'inline-block', animation: 'pulse 1s infinite' }} />
        Loading…
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '20px 16px 60px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <BackButton onClick={() => navigate('/leads')} C={C} />

        {errorMsg && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid ${C.red}`, borderRadius: 8, padding: '10px 14px', color: C.red, fontSize: 13, marginBottom: 16 }}>
            {errorMsg}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 6 }}>{lead.name || 'Unknown'}</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {lead.source && <Chip color="#3B82F6">{lead.source}</Chip>}
            {lead.product && <Chip color="#F59E0B">{lead.product}</Chip>}
          </div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          {[['Email', 'email'], ['Phone', 'phone'], ['Address', 'address'], ['Subject', 'subject'], ['Message', 'message']].map(([label, key]) =>
            lead[key] ? (
              <div key={key} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: '0.08em', fontFamily: "'Fira Code', monospace" }}>{label.toUpperCase()}</span>
                <p style={{ fontSize: 15, marginTop: 4, color: C.text, lineHeight: 1.5 }}>{lead[key]}</p>
              </div>
            ) : null
          )}
          <div>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: '0.08em', fontFamily: "'Fira Code', monospace" }}>RECEIVED</span>
            <p style={{ fontSize: 13, marginTop: 4, color: C.muted, fontFamily: "'Fira Code', monospace" }}>
              {lead.created_at ? new Date(lead.created_at).toLocaleString('en-GB') : '—'}
            </p>
          </div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <StatusBar currentStatus={lead.status} onStatusChange={v => updateField('status', v)} />
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.08em', marginBottom: 8, fontFamily: "'Fira Code', monospace" }}>
            DEAL VALUE (£)
          </label>
          <input
            type="number"
            value={valueInput}
            onChange={e => setValueInput(e.target.value)}
            onFocus={() => setValueFocused(true)}
            onBlur={() => { setValueFocused(false); updateField('value', valueInput ? Number(valueInput) : null) }}
            placeholder="0"
            style={{
              display: 'block',
              width: '100%',
              padding: '11px 14px',
              borderRadius: 8,
              border: `1px solid ${valueFocused ? C.green : C.border}`,
              background: C.bg,
              color: C.text,
              fontSize: 18,
              fontWeight: 600,
              fontFamily: "'Fira Code', monospace",
              outline: 'none',
              transition: 'border-color 200ms',
              boxShadow: valueFocused ? `0 0 0 3px ${C.greenDim}` : 'none',
            }}
          />
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <NotesList notes={lead.notes} onAddNote={handleAddNote} />
        </div>
      </div>
    </div>
  )
}

function BackButton({ onClick, C }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.muted, padding: '6px 0', transition: 'color 200ms' }}
      onMouseEnter={e => e.currentTarget.style.color = C.text}
      onMouseLeave={e => e.currentTarget.style.color = C.muted}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      All leads
    </button>
  )
}

function Chip({ color, children }) {
  return (
    <span style={{ background: `${color}1a`, color, padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>
      {children}
    </span>
  )
}
