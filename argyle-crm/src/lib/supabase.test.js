import { supabase } from './supabase'

test('supabase client is created', () => {
  expect(supabase).toBeDefined()
  expect(typeof supabase.from).toBe('function')
  expect(typeof supabase.auth.signInWithPassword).toBe('function')
})
