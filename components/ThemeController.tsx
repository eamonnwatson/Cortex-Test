'use client'

import { useEffect } from 'react'
import { applyTheme, getStoredThemePreference, type ThemePreference } from '@/lib/theme'

export default function ThemeController() {
  useEffect(() => {
    applyTheme(getStoredThemePreference())

    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const handleSystemChange = () => {
      if (getStoredThemePreference() === 'system') applyTheme('system')
    }

    const handlePreferenceChange = (event: Event) => {
      const custom = event as CustomEvent<ThemePreference>
      const next = custom.detail
      if (!next) return
      applyTheme(next)
    }

    media.addEventListener('change', handleSystemChange)
    window.addEventListener('theme-preference-change', handlePreferenceChange)

    return () => {
      media.removeEventListener('change', handleSystemChange)
      window.removeEventListener('theme-preference-change', handlePreferenceChange)
    }
  }, [])

  return null
}
