import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { StatusBar } from '../components/StatusBar'
import { NotesList } from '../components/NotesList'

export function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [valueInput, setValueInput] = useState('')

  useEffect(() => {
    supabase.from('leads').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error) {
          setFetchError('Could not load lead — check your connection')
          return
        }
        if (data) {
          setLead(data)
          setValueInput(data.value != null ? String(data.value) : '')
        }
      })
  }, [id])

  async function updateField(field, value) {
    const prev = lead[field]
    setLead(prev => ({ ...prev, [field]: value }))
    const { error } = await supabase.from('leads').update({ [field]: value }).eq('id', id)
    if (error) {
      setLead(prev => ({ ...prev, [field]: prev }))
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
    <div style={{ padding: 24 }}>
      <p style={{ color: 'red', marginBottom: 12 }}>{fetchError}</p>
      <button onClick={() => navigate('/leads')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#555' }}>
        ← Back
      </button>
    </div>
  )

  if (!lead) return <div style={{ padding: 24 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <button onClick={() => navigate('/leads')} style={{ marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#555' }}>
        ← Back
      </button>
      {errorMsg && <p style={{ color: 'red', fontSize: 13, marginBottom: 8 }}>{errorMsg}</p>}
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
          value={valueInput}
          onChange={e => setValueInput(e.target.value)}
          onBlur={() => updateField('value', valueInput ? Number(valueInput) : null)}
          placeholder="0"
          style={{ display: 'block', width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16, marginTop: 4 }}
        />
      </div>

      <NotesList notes={lead.notes} onAddNote={handleAddNote} />
    </div>
  )
}
