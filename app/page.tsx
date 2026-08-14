'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Snowflake } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import ChatInput from '@/components/ChatInput'
import SettingsModal from '@/components/SettingsModal'
import { generateId, getConfig, saveChat } from '@/lib/store'
import type { Chat } from '@/lib/types'

export default function Home() {
  const router = useRouter()
  const [showSettings, setShowSettings] = useState(false)
  const [configured, setConfigured] = useState(() => !!getConfig()?.accountUrl)

  const startChat = (text: string) => {
    if (!getConfig()?.accountUrl) { setShowSettings(true); return }

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
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-950">
      <Sidebar onSettingsClick={() => setShowSettings(true)} />

      <div className="flex min-w-0 flex-1 items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          {/* Logo / Title */}
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900">
              <Snowflake size={21} className="text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Cortex Chat</h1>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Powered by Snowflake Cortex Agents</p>
          </div>

          {/* Input */}
          <ChatInput onSend={startChat} placeholder="Ask anything about your data…" />

          {!configured && (
            <p className="mt-6 text-center text-sm">
              <button onClick={() => setShowSettings(true)} className="text-blue-600 hover:underline dark:text-blue-400">
                Connect your Snowflake account →
              </button>
            </p>
          )}
        </div>
      </div>

      {showSettings && (
        <SettingsModal
          onClose={() => {
            setShowSettings(false)
            setConfigured(!!getConfig()?.accountUrl)
          }}
        />
      )}
    </div>
  )
}


