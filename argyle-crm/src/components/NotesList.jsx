import { useState } from 'react'
import { useTheme } from '../lib/ThemeContext'

export function NotesList({ notes, onAddNote }) {
  const { C } = useTheme()
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const entries = notes ? notes.split('\n\n').filter(Boolean) : []

  function handleAdd() {
    if (!text.trim()) return
    onAddNote(text.trim())
    setText('')
  }

  function handleKey(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd()
  }

  const parseEntry = (entry) => {
    const match = entry.match(/^\[(.+?)\] (.+)$/s)
    return match ? { timestamp: match[1], body: match[2] } : { timestamp: null, body: entry }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.08em', marginBottom: 12, fontFamily: "'Fira Code', monospace" }}>
        NOTES
      </label>

      {entries.length === 0 ? (
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 12, opacity: 0.7 }}>No notes yet</p>
      ) : (
        [...entries].reverse().map((entry, i) => {
          const { timestamp, body } = parseEntry(entry)
          return (
            <div key={i} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
              {timestamp && (
                <p style={{ fontSize: 11, color: C.green, fontFamily: "'Fira Code', monospace", marginBottom: 6, letterSpacing: '0.04em' }}>
                  {timestamp}
                </p>
              )}
              <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{body}</p>
            </div>
          )
        })
      )}

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Add a note… (⌘+Enter to save)"
        rows={3}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 10,
          border: `1px solid ${focused ? C.green : C.border}`,
          background: C.bg,
          color: C.text,
          fontSize: 14,
          marginTop: 8,
          resize: 'vertical',
          outline: 'none',
          transition: 'border-color 200ms',
          boxShadow: focused ? `0 0 0 3px ${C.greenDim}` : 'none',
          lineHeight: 1.6,
        }}
      />
      <button
        onClick={handleAdd}
        disabled={!text.trim()}
        style={{
          marginTop: 8,
          padding: '9px 20px',
          borderRadius: 8,
          background: text.trim() ? C.green : C.border,
          color: text.trim() ? C.bg : C.muted,
          border: 'none',
          cursor: text.trim() ? 'pointer' : 'not-allowed',
          fontSize: 14,
          fontWeight: 600,
          transition: 'all 200ms',
        }}
      >
        Add note
      </button>
    </div>
  )
}
