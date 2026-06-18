import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/ThemeContext'

const STATUS_COLOR = {
  new: { bg: 'rgba(34,197,94,0.12)', color: '#22C55E' },
  called: { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  'site visit': { bg: 'rgba(168,85,247,0.12)', color: '#A855F7' },
  quoted: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  deposit: { bg: 'rgba(249,115,22,0.12)', color: '#F97316' },
  installed: { bg: 'rgba(20,184,166,0.12)', color: '#14B8A6' },
  done: { bg: 'rgba(34,197,94,0.18)', color: '#22C55E' },
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export function Leads() {
  const { C, dark, toggle } = useTheme()
  const [leads, setLeads] = useState([])
  const [error, setError] = useState(null)
  const [hovered, setHovered] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('leads').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message || 'Failed to load leads.')
        else if (data) setLeads(data)
      })

    const channel = supabase.channel('leads-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' },
        payload => setLeads(prev => prev.some(l => l.id === payload.new.id) ? prev : [payload.new, ...prev]))
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  if (error) return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: 20 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Header count={0} C={C} dark={dark} toggle={toggle} />
        <div style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid ${C.red}`, borderRadius: 10, padding: '12px 16px', color: C.red, fontSize: 14 }}>{error}</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '20px 16px 40px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Header count={leads.length} C={C} dark={dark} toggle={toggle} />

        {leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.4 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p style={{ fontSize: 15 }}>No leads yet. They will appear here in real time.</p>
          </div>
        ) : leads.map(lead => {
          const isHovered = hovered === lead.id
          const sc = STATUS_COLOR[lead.status] || { bg: 'rgba(148,163,184,0.12)', color: C.muted }
          return (
            <div
              key={lead.id}
              onClick={() => navigate(`/leads/${lead.id}`)}
              onMouseEnter={() => setHovered(lead.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: C.surface,
                border: `1px solid ${isHovered ? C.borderHover : C.border}`,
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 10,
                cursor: 'pointer',
                transition: 'border-color 200ms, transform 150ms, box-shadow 200ms',
                transform: isHovered ? 'translateY(-1px)' : 'none',
                boxShadow: isHovered ? `0 4px 20px ${C.greenDim}` : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <strong style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{lead.name || 'Unknown'}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: C.muted, fontFamily: "'Fira Code', monospace" }}>{timeAgo(lead.created_at)}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {lead.source && <Chip bg="rgba(59,130,246,0.12)" color="#3B82F6">{lead.source}</Chip>}
                {lead.product && <Chip bg="rgba(245,158,11,0.12)" color="#F59E0B">{lead.product}</Chip>}
                {lead.status && <Chip bg={sc.bg} color={sc.color}>{lead.status}</Chip>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Header({ count, C, dark, toggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontFamily: "'Fira Code', monospace", fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', color: C.text }}>
          LEADS
        </h1>
        {count > 0 && (
          <span style={{ background: C.greenDim, color: C.green, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, fontFamily: "'Fira Code', monospace" }}>
            {count}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={toggle}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, display: 'flex', alignItems: 'center', borderRadius: 6, transition: 'color 200ms' }}
          onMouseEnter={e => e.currentTarget.style.color = C.text}
          onMouseLeave={e => e.currentTarget.style.color = C.muted}
        >
          {dark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, display: 'inline-block', boxShadow: `0 0 6px ${C.green}` }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: C.green, fontFamily: "'Fira Code', monospace", letterSpacing: '0.06em' }}>LIVE</span>
        </div>
      </div>
    </div>
  )
}

function Chip({ bg, color, children }) {
  return (
    <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>
      {children}
    </span>
  )
}
