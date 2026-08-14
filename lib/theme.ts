export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const THEME_KEY = 'cortex_theme_preference'

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const value = localStorage.getItem(THEME_KEY)
  return isThemePreference(value) ? value : 'system'
}

export function setStoredThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_KEY, preference)
  window.dispatchEvent(new CustomEvent<ThemePreference>('theme-preference-change', { detail: preference }))
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return getSystemTheme()
  return preference
}

export function applyTheme(preference: ThemePreference): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'

  const resolved = resolveTheme(preference)
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.setAttribute('data-theme', resolved)
  return resolved
}
