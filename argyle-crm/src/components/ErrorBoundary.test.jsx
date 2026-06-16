import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function ThrowOnRender({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Test render error')
  }
  return <div>Child content</div>
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy

  afterEach(() => {
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore()
      consoleErrorSpy = null
    }
  })

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Child content')).toBeTruthy()
  })

  it('shows fallback UI when a child throws during render', () => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowOnRender shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(screen.getByText('Test render error')).toBeTruthy()
    expect(screen.getByRole('button', { name: /reload/i })).toBeTruthy()
  })
})
