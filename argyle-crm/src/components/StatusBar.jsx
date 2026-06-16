const STAGES = ['new', 'called', 'site visit', 'quoted', 'deposit', 'installed', 'done']

export function StatusBar({ currentStatus, onStatusChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0' }}>
      {STAGES.map(stage => (
        <button
          key={stage}
          aria-current={stage === currentStatus ? 'true' : undefined}
          onClick={() => onStatusChange(stage)}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            border: '2px solid #333',
            background: stage === currentStatus ? '#333' : '#fff',
            color: stage === currentStatus ? '#fff' : '#333',
            fontWeight: stage === currentStatus ? 700 : 400,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {stage}
        </button>
      ))}
    </div>
  )
}
