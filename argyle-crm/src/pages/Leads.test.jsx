import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

const mockOrder = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: mockOrder,
      })),
    })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}))

import { Leads } from './Leads'

beforeEach(() => {
  mockOrder.mockResolvedValue({
    data: [
      { id: '1', name: 'Jane Smith', source: 'website', product: 'doors', status: 'new', created_at: new Date().toISOString() },
    ],
    error: null,
  })
})

test('renders lead cards', async () => {
  render(<MemoryRouter><Leads /></MemoryRouter>)
  expect(await screen.findByText('Jane Smith')).toBeInTheDocument()
  expect(screen.getByText('website')).toBeInTheDocument()
  expect(screen.getByText('doors')).toBeInTheDocument()
  expect(screen.getByText('new')).toBeInTheDocument()
})

test('renders error message when fetch fails', async () => {
  mockOrder.mockResolvedValue({ data: null, error: { message: 'DB connection failed' } })
  render(<MemoryRouter><Leads /></MemoryRouter>)
  expect(await screen.findByText('DB connection failed')).toBeInTheDocument()
})

test('handles null created_at without crashing', async () => {
  mockOrder.mockResolvedValue({
    data: [{ id: '2', name: 'No Date Lead', source: null, product: null, status: null, created_at: null }],
    error: null,
  })
  render(<MemoryRouter><Leads /></MemoryRouter>)
  expect(await screen.findByText('No Date Lead')).toBeInTheDocument()
})
