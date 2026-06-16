import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({
          data: [
            { id: '1', name: 'Jane Smith', source: 'website', product: 'doors', status: 'new', created_at: new Date().toISOString() },
          ],
          error: null,
        })),
      })),
    })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}))

import { Leads } from './Leads'

test('renders lead cards', async () => {
  render(<MemoryRouter><Leads /></MemoryRouter>)
  expect(await screen.findByText('Jane Smith')).toBeInTheDocument()
  expect(screen.getByText('website')).toBeInTheDocument()
  expect(screen.getByText('doors')).toBeInTheDocument()
  expect(screen.getByText('new')).toBeInTheDocument()
})
