import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { Login } from './pages/Login'
import { Leads } from './pages/Leads'
import { LeadDetail } from './pages/LeadDetail'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null // loading

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/leads" /> : <Login onSuccess={() => {}} />} />
        <Route path="/leads" element={session ? <Leads /> : <Navigate to="/" />} />
        <Route path="/leads/:id" element={session ? <LeadDetail /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
