import { useEffect, useState, useCallback } from 'react'
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

  const toE164 = useCallback((phone) => {
    if (!phone) return ''
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('44')) return `+${digits}`
    if (digits.startsWith('0')) return `+44${digits.slice(1)}`
    return `+44${digits}`
  }, [])

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

        {lead.phone && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <a
              href={`tel:${toE164(lead.phone)}`}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '13px 16px', borderRadius: 10, background: C.green, color: C.bg,
                textDecoration: 'none', fontWeight: 700, fontSize: 15,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call {lead.name?.split(' ')[0]}
            </a>
            <a
              href={`https://wa.me/${toE164(lead.phone).replace('+', '')}?text=${encodeURIComponent(`Hi ${lead.name?.split(' ')[0]}, thanks for your enquiry about ${lead.product || 'your requirements'}. I'll be in touch shortly.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '13px 16px', borderRadius: 10, background: 'none',
                border: `2px solid #25D366`, color: '#25D366',
                textDecoration: 'none', fontWeight: 700, fontSize: 15,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </div>
        )}

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
