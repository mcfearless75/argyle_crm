import { render, screen, fireEvent } from '@testing-library/react'
import { StatusBar } from './StatusBar'

const STAGES = ['new', 'called', 'site visit', 'quoted', 'deposit', 'installed', 'done']

test('renders all 7 stages', () => {
  render(<StatusBar currentStatus="new" onStatusChange={() => {}} />)
  STAGES.forEach(s => expect(screen.getByText(s)).toBeInTheDocument())
})

test('active stage has aria-current', () => {
  render(<StatusBar currentStatus="quoted" onStatusChange={() => {}} />)
  expect(screen.getByText('quoted').closest('button')).toHaveAttribute('aria-current', 'true')
})

test('clicking a stage calls onStatusChange', () => {
  const onChange = vi.fn()
  render(<StatusBar currentStatus="new" onStatusChange={onChange} />)
  fireEvent.click(screen.getByText('called'))
  expect(onChange).toHaveBeenCalledWith('called')
})
