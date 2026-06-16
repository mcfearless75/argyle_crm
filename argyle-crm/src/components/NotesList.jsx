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
