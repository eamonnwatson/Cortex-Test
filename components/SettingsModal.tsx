'use client'
import { useState } from 'react'
import { X, CheckCircle } from 'lucide-react'
import { applyTheme, getStoredThemePreference, setStoredThemePreference, type ThemePreference } from '@/lib/theme'

interface Props {
  onClose: () => void
}

export default function SettingsModal({ onClose }: Props) {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => getStoredThemePreference())
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 700)
  }

  const handleThemeChange = (preference: ThemePreference) => {
    setThemePreference(preference)
    setStoredThemePreference(preference)
    applyTheme(preference)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
            <X size={17} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {(['system', 'light', 'dark'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleThemeChange(option)}
                  className={`rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                    themePreference === option
                      ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-200 dark:bg-gray-200 dark:text-gray-900'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          Snowflake credentials are loaded from server environment variables.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 transition-colors dark:text-gray-400 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
          >
            {saved && <CheckCircle size={13} />}
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
