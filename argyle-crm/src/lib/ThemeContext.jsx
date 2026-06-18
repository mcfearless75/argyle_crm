import { createContext, useContext, useState, useEffect } from 'react'
import { DARK, LIGHT } from './theme'

const ThemeContext = createContext({ C: DARK, dark: true, toggle: () => {} })

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('argyle-theme')
    return saved !== null ? saved === 'dark' : true
  })

  useEffect(() => {
    localStorage.setItem('argyle-theme', dark ? 'dark' : 'light')
    document.body.style.background = dark ? DARK.bg : LIGHT.bg
  }, [dark])

  return (
    <ThemeContext.Provider value={{ C: dark ? DARK : LIGHT, dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
