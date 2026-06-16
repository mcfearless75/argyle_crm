import { render, screen, fireEvent } from '@testing-library/react'
import { NotesList } from './NotesList'

test('renders existing notes split by double newline', () => {
  const notes = '[2026-06-16 10:00] First note\n\n[2026-06-16 11:00] Second note'
  render(<NotesList notes={notes} onAddNote={() => {}} />)
  expect(screen.getByText(/First note/)).toBeInTheDocument()
  expect(screen.getByText(/Second note/)).toBeInTheDocument()
})

test('renders empty state when no notes', () => {
  render(<NotesList notes={null} onAddNote={() => {}} />)
  expect(screen.getByText(/No notes yet/)).toBeInTheDocument()
})

test('calls onAddNote with textarea value when Add Note clicked', () => {
  const onAddNote = vi.fn()
  render(<NotesList notes="" onAddNote={onAddNote} />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Test note' } })
  fireEvent.click(screen.getByText('Add note'))
  expect(onAddNote).toHaveBeenCalledWith('Test note')
})
