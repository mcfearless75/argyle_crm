import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function Leads() {
  const [leads, setLeads] = useState([])
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('leads').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message || 'Failed to load leads.')
        } else if (data) {
          setLeads(data)
        }
      })

    const channel = supabase.channel('leads-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' },
        payload => setLeads(prev => prev.some(l => l.id === payload.new.id) ? prev : [payload.new, ...prev]))
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
        <h1 style={{ marginBottom: 16, fontSize: 22 }}>Leads</h1>
        <div style={{ color: '#cc0000', background: '#fff0f0', borderRadius: 8, padding: 12 }}>{error}</div>
      </div>
    )
  }

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
