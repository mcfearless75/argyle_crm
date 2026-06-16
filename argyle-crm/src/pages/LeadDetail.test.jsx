import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockLead = {
  id: '1', name: 'Jane Smith', email: 'jane@test.com', phone: '07700 900000',
  address: '1 High St', subject: 'Mirrors', message: 'Need a bathroom mirror',
  source: 'website', product: 'mirrors', status: 'new', value: null, notes: null,
  created_at: new Date().toISOString(),
}

const mockUpdate = vi.fn(() => Promise.resolve({ error: null }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: mockLead, error: null })) })) })),
      update: vi.fn(() => ({ eq: vi.fn(() => mockUpdate()) })),
    })),
  },
}))

import { LeadDetail } from './LeadDetail'

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/leads/1']}>
      <Routes><Route path="/leads/:id" element={<LeadDetail />} /></Routes>
    </MemoryRouter>
  )
}

test('renders lead fields', async () => {
  renderWithRouter()
  expect(await screen.findByText('Jane Smith')).toBeInTheDocument()
  expect(screen.getByText('jane@test.com')).toBeInTheDocument()
})

test('status bar is rendered', async () => {
  renderWithRouter()
  expect(await screen.findByText('quoted')).toBeInTheDocument()
})
