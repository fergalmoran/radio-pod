import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Icons } from './icons'

type ThemeMode = 'light' | 'dark'

const getInitialMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyThemeMode = (mode: ThemeMode) => {
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(mode)
  document.documentElement.style.colorScheme = mode
}

export const ThemeToggle = () => {
  const [mode, setMode] = useState<ThemeMode>('light')

  useEffect(() => {
    const initialMode = getInitialMode()
    setMode(initialMode)
    applyThemeMode(initialMode)
  }, [])

  const toggleMode = () => {
    const nextMode: ThemeMode = mode === 'light' ? 'dark' : 'light'
    setMode(nextMode)
    applyThemeMode(nextMode)
    window.localStorage.setItem('theme', nextMode)
  }

  const Icon = mode === 'light' ? Icons.Sun : Icons.Moon

  return (
    <Button variant="ghost" size="icon-sm" onClick={toggleMode} aria-label="Toggle theme">
      <Icon className="h-4 w-4" />
    </Button>
  )
}
