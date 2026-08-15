'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AlertCircle } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import ChatInput from '@/components/ChatInput'
import SettingsModal from '@/components/SettingsModal'
import { generateId, saveChat } from '@/lib/store'
import type { Chat } from '@/lib/types'

export default function Home() {
  const router = useRouter()
  const [showSettings, setShowSettings] = useState(false)
  const [isConfigured, setIsConfigured] = useState(true)

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await fetch('/api/chat/config', { cache: 'no-store' })
        if (!res.ok) {
          setIsConfigured(false)
          return
        }

        const data: { isConfigured?: boolean } = await res.json()
        setIsConfigured(Boolean(data.isConfigured))
      } catch {
        setIsConfigured(false)
      }
    }

    void checkConfig()
  }, [])

  const startChat = (text: string) => {
    const chatId = generateId()
    const newChat: Chat = {
      id: chatId,
      title: text.length > 60 ? text.slice(0, 60) + '…' : text,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    saveChat(newChat)
    sessionStorage.setItem(`pending_${chatId}`, text)
    router.push(`/chat/${chatId}`)
  }

  return (
    <div className="flex h-screen overflow-hidden [background:var(--page-bg)]">
      <Sidebar onSettingsClick={() => setShowSettings(true)} />

      <div className="flex min-w-0 flex-1 items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          {/* Logo / Title */}
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="mb-4 rounded-2xl bg-[var(--brand-surface)] px-4 py-3 dark:rounded-none dark:bg-transparent dark:px-0 dark:py-0">
              <Image
                src="/brand/iqor-logo-light.svg"
                alt="iQor"
                width={170}
                height={48}
                className="block h-9 w-auto dark:hidden"
                priority
              />
              <Image
                src="/brand/iqor-logo-dark.svg"
                alt="iQor"
                width={170}
                height={48}
                className="hidden h-9 w-auto dark:block"
                priority
              />
            </div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">iQor Answer Engine</h1>
            <p className="mt-1 text-sm text-[var(--brand-subtle-text)]">Smarter CX insights for faster decisions</p>
          </div>

          {/* Input */}
          {!isConfigured && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/80 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle size={14} />
              Required configuration is not set. Contact your administrator.
            </div>
          )}
          <ChatInput onSend={startChat} placeholder="Ask anything about your data…" disabled={!isConfigured} />
          <p className="mt-3 text-center text-xs text-[var(--brand-subtle-text)]">Built on Snowflake Cortex Agents</p>
        </div>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}


