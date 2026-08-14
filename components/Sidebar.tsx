'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, MessageSquare, Plus, Settings, Trash2 } from 'lucide-react'
import { deleteChat, getChats } from '@/lib/store'
import type { Chat } from '@/lib/types'

interface Props {
  currentChatId?: string
  onSettingsClick: () => void
  refreshKey?: number
}

export default function Sidebar({ currentChatId, onSettingsClick, refreshKey }: Props) {
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>([])
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setChats(getChats())
  }, [refreshKey])

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteChat(id)
    setChats(getChats())
    if (id === currentChatId) router.push('/')
  }

  if (collapsed) {
    return (
      <div className="flex w-12 flex-col items-center border-r border-gray-100 bg-gray-50 py-3 gap-2">
        <button onClick={() => setCollapsed(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-200">
          <ChevronRight size={15} />
        </button>
        <button onClick={() => router.push('/')} className="rounded-lg p-2 text-gray-400 hover:bg-gray-200">
          <Plus size={15} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-64 flex-shrink-0 flex-col border-r border-gray-100 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-3">
        <span className="text-sm font-semibold text-gray-800">Cortex Chat</span>
        <button onClick={() => setCollapsed(true)} className="rounded p-1 text-gray-400 hover:bg-gray-200">
          <ChevronLeft size={15} />
        </button>
      </div>

      {/* New chat */}
      <div className="px-2 pt-2">
        <button
          onClick={() => router.push('/')}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <Plus size={14} />
          New chat
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {chats.length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-400">No chats yet</p>
        ) : (
          <ul className="space-y-0.5">
            {chats.map(chat => (
              <li key={chat.id}>
                <button
                  onClick={() => router.push(`/chat/${chat.id}`)}
                  className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                    chat.id === currentChatId
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <MessageSquare size={13} className="flex-shrink-0 text-gray-400" />
                  <span className="flex-1 truncate">{chat.title}</span>
                  <span
                    role="button"
                    onClick={e => handleDelete(e, chat.id)}
                    className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-gray-400 hover:text-red-500 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-2 py-2">
        <button
          onClick={onSettingsClick}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <Settings size={14} />
          Settings
        </button>
      </div>
    </div>
  )
}
