import { Component } from 'react'

const styles = {
  wrapper: {
    fontFamily: 'system-ui, sans-serif',
    padding: '2rem 1rem',
    maxWidth: '480px',
    margin: '0 auto',
    textAlign: 'center',
    color: '#111',
  },
  heading: {
    fontSize: '1.5rem',
    color: '#f44',
    marginBottom: '0.75rem',
  },
  message: {
    fontSize: '0.95rem',
    marginBottom: '1.5rem',
    wordBreak: 'break-word',
  },
  button: {
    padding: '0.65rem 1.5rem',
    fontSize: '1rem',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
}

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.wrapper}>
          <h1 style={styles.heading}>Something went wrong</h1>
          <p style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button style={styles.button} onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
