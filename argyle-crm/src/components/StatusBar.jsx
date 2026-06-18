import { useTheme } from '../lib/ThemeContext'

const STAGES = ['new', 'called', 'site visit', 'quoted', 'deposit', 'installed', 'done']
const STAGE_LABELS = {
  new: '🆕 New',
  called: '📞 Called',
  'site visit': '🏠 Site Visit',
  quoted: '💰 Quoted',
  deposit: '💳 Deposit',
  installed: '🔧 Installed',
  done: '✅ Done',
}

export function StatusBar({ currentStatus, onStatusChange }) {
  const { C } = useTheme()
  const currentIdx = STAGES.indexOf(currentStatus)

  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.08em', marginBottom: 10, fontFamily: "'Fira Code', monospace" }}>
        PIPELINE STAGE
      </label>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {STAGES.map((stage, idx) => {
          const isActive = stage === currentStatus
          const isPast = idx < currentIdx
          return (
            <button
              key={stage}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => onStatusChange(stage)}
              style={{
                flexShrink: 0,
                padding: '7px 14px',
                borderRadius: 20,
                border: `1px solid ${isActive ? C.green : isPast ? `${C.green}4d` : C.border}`,
                background: isActive ? C.green : isPast ? C.greenDim : C.surface2,
                color: isActive ? C.bg : isPast ? C.green : C.muted,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                fontSize: 13,
                transition: 'all 200ms',
                whiteSpace: 'nowrap',
                fontFamily: "'Fira Sans', sans-serif",
              }}
            >
              {STAGE_LABELS[stage] || stage}
            </button>
          )
        })}
      </div>
    </div>
  )
}
