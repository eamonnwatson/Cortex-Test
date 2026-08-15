'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, MessageSquare, Plus, Settings, Trash2 } from 'lucide-react'
import { deleteChat, getChats } from '@/lib/store'

interface Props {
  currentChatId?: string
  onSettingsClick: () => void
  refreshKey?: number
}

export default function Sidebar({ currentChatId, onSettingsClick, refreshKey }: Props) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [, forceRender] = useState(0)
  void refreshKey
  const chats = getChats()

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteChat(id)
    forceRender(v => v + 1)
    if (id === currentChatId) router.push('/')
  }

  if (collapsed) {
    return (
      <div className="flex w-12 flex-col items-center gap-2 border-r border-[var(--brand-border)] bg-[var(--brand-surface-muted)] py-3">
        <button onClick={() => router.push('/')} className="rounded-lg p-1.5 hover:bg-[var(--brand-surface)]" aria-label="iQor Answer Engine home">
          <Image
            src="/brand/iqor-logo-small-dark.svg"
            alt="iQor"
            width={24}
            height={24}
            className="block dark:hidden"
          />
          <Image
            src="/brand/iqor-logo-small-light.svg"
            alt="iQor"
            width={24}
            height={24}
            className="hidden dark:block"
          />
        </button>
        <button onClick={() => setCollapsed(false)} className="rounded-lg p-2 text-[var(--brand-subtle-text)] hover:bg-[var(--brand-surface)]">
          <ChevronRight size={15} />
        </button>
        <button onClick={() => router.push('/')} className="rounded-lg p-2 text-[var(--brand-subtle-text)] hover:bg-[var(--brand-surface)]">
          <Plus size={15} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-64 flex-shrink-0 flex-col border-r border-[var(--brand-border)] bg-[var(--brand-surface-muted)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-3 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <span className="rounded-md px-2 py-1">
            <Image
              src="/brand/iqor-logo-light.svg"
              alt="iQor"
              width={170}
              height={48}
              className="block h-4 w-auto dark:hidden"
            />
            <Image
              src="/brand/iqor-logo-dark.svg"
              alt="iQor"
              width={170}
              height={48}
              className="hidden h-4 w-auto dark:block"
            />
          </span>
          <span>Answer Engine</span>
        </span>
        <button onClick={() => setCollapsed(true)} className="rounded p-1 text-[var(--brand-subtle-text)] hover:bg-[var(--brand-surface)]">
          <ChevronLeft size={15} />
        </button>
      </div>

      {/* New chat */}
      <div className="px-2 pt-2">
        <button
          onClick={() => router.push('/')}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--brand-primary)] hover:bg-[var(--brand-surface)] transition-colors"
        >
          <Plus size={14} />
          New chat
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {chats.length === 0 ? (
          <p className="px-3 py-2 text-xs text-[var(--brand-subtle-text)]">No chats yet</p>
        ) : (
          <ul className="space-y-0.5">
            {chats.map(chat => (
              <li key={chat.id}>
                <button
                  onClick={() => router.push(`/chat/${chat.id}`)}
                  className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                    chat.id === currentChatId
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'text-[var(--brand-primary)] hover:bg-[var(--brand-surface)]'
                  }`}
                >
                  <MessageSquare
                    size={13}
                    className={`flex-shrink-0 ${chat.id === currentChatId ? 'text-white/80' : 'text-[var(--brand-subtle-text)]'}`}
                  />
                  <span className="flex-1 truncate">{chat.title}</span>
                  <span
                    role="button"
                    onClick={e => handleDelete(e, chat.id)}
                    className={`rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 ${
                      chat.id === currentChatId
                        ? 'text-white/70 hover:text-white'
                        : 'text-[var(--brand-subtle-text)] hover:text-[var(--brand-accent)]'
                    }`}
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
      <div className="border-t border-[var(--brand-border)] px-2 py-2">
        <button
          onClick={onSettingsClick}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--brand-primary)] hover:bg-[var(--brand-surface)] transition-colors"
        >
          <Settings size={14} />
          Settings
        </button>
      </div>
    </div>
  )
}
