'use client'
import { useState } from 'react'
import { X, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { getConfig, saveConfig } from '@/lib/store'
import type { SnowflakeConfig } from '@/lib/types'
import { applyTheme, getStoredThemePreference, setStoredThemePreference, type ThemePreference } from '@/lib/theme'

const EMPTY: SnowflakeConfig = {
  accountUrl: '',
  database: '',
  schema: '',
  agentName: '',
  authToken: '',
  tokenType: 'PROGRAMMATIC_ACCESS_TOKEN',
}

const TOKEN_TYPE_LABELS: Record<SnowflakeConfig['tokenType'], string> = {
  PROGRAMMATIC_ACCESS_TOKEN: 'PAT',
  OAUTH: 'OAuth',
  KEYPAIR_JWT: 'Key Pair JWT',
}

interface Props {
  onClose: () => void
}

export default function SettingsModal({ onClose }: Props) {
  const [cfg, setCfg] = useState<SnowflakeConfig>(() => getConfig() ?? EMPTY)
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => getStoredThemePreference())
  const [showToken, setShowToken] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof SnowflakeConfig>(k: K, v: SnowflakeConfig[K]) =>
    setCfg(c => ({ ...c, [k]: v }))

  const handleSave = () => {
    saveConfig(cfg)
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
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Snowflake Configuration</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
            <X size={17} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Account URL" placeholder="https://myaccount.snowflakecomputing.com" value={cfg.accountUrl} onChange={v => set('accountUrl', v)} />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Database" placeholder="MY_DB" value={cfg.database} onChange={v => set('database', v)} />
            <Field label="Schema" placeholder="PUBLIC" value={cfg.schema} onChange={v => set('schema', v)} />
          </div>

          <Field label="Agent Name" placeholder="my_agent" value={cfg.agentName} onChange={v => set('agentName', v)} />

          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-500">Token Type</p>
            <div className="flex gap-4">
              {(['PROGRAMMATIC_ACCESS_TOKEN', 'OAUTH', 'KEYPAIR_JWT'] as const).map(t => (
                <label key={t} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                  <input type="radio" name="tokenType" value={t} checked={cfg.tokenType === t} onChange={() => set('tokenType', t)} />
                  {TOKEN_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          </div>

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

          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">Auth Token</p>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={cfg.authToken}
                onChange={e => set('authToken', e.target.value)}
                placeholder="Paste your bearer token or JWT"
                className="w-full rounded-lg border border-gray-200 py-2 pl-3 pr-9 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          Credentials are stored only in your browser&apos;s localStorage and sent directly to your Snowflake account.
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

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
      />
    </div>
  )
}
