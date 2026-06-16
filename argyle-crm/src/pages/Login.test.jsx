import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}))

import { supabase } from '../lib/supabase'
import { Login } from './Login'

test('shows error on failed login', async () => {
  supabase.auth.signInWithPassword.mockResolvedValue({
    error: { message: 'Invalid login credentials' },
  })
  render(<Login onSuccess={() => {}} />)
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } })
  fireEvent.change(screen.getByPlaceholderText('PIN'), { target: { value: '1234' } })
  fireEvent.click(screen.getByText('Sign in'))
  await waitFor(() => expect(screen.getByText(/Invalid login credentials/)).toBeInTheDocument())
})

test('calls onSuccess on successful login', async () => {
  supabase.auth.signInWithPassword.mockResolvedValue({ error: null })
  const onSuccess = vi.fn()
  render(<Login onSuccess={onSuccess} />)
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } })
  fireEvent.change(screen.getByPlaceholderText('PIN'), { target: { value: '1234' } })
  fireEvent.click(screen.getByText('Sign in'))
  await waitFor(() => expect(onSuccess).toHaveBeenCalled())
})
