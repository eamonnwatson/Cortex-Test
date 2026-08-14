'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import MessageBubble from '@/components/MessageBubble'
import ChatInput from '@/components/ChatInput'
import SettingsModal from '@/components/SettingsModal'
import { generateId, getChat, getConfig, saveChat } from '@/lib/store'
import { readStream } from '@/lib/stream-parser'
import type { Chat, ChartBlock, ContentBlock, Message, TableBlock, TextBlock, ThinkingBlock } from '@/lib/types'

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [chat, setChat] = useState<Chat | null>(() => getChat(id))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [sidebarKey, setSidebarKey] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [inputFocusNonce, setInputFocusNonce] = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Keep a mutable ref so sendMessage never has stale chat state
  const chatRef = useRef<Chat | null>(null)
  const pendingMsgRef = useRef<string | null>(null)
  const pendingLoadedRef = useRef(false)

  // Sync chat state into ref
  useEffect(() => { chatRef.current = chat }, [chat])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat?.messages.length])

  // ── Core send logic ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const currentChat = chatRef.current
    if (!currentChat) return

    const config = getConfig()
    if (!config?.accountUrl) { setShowSettings(true); return }

    setError(null)

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: [{ type: 'text', text } as TextBlock],
      timestamp: Date.now(),
    }
    const assistantId = generateId()
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: [],
      timestamp: Date.now(),
      isStreaming: true,
    }

    const withUser: Chat = {
      ...currentChat,
      messages: [...currentChat.messages, userMsg, assistantMsg],
      updatedAt: Date.now(),
    }
    setChat(withUser)
    saveChat({ ...withUser, messages: withUser.messages.filter(m => m.id !== assistantId) })
    setSidebarKey(k => k + 1)
    setIsLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    // Accumulated streaming state (outside React to avoid stale reads)
    let thinkingText = ''
    let responseText = ''
    let blocks: ContentBlock[] = []

    const updateAssistant = (newBlocks: ContentBlock[], streaming = true) => {
      setChat(prev => {
        if (!prev) return prev
        const msgs = prev.messages.map(m =>
          m.id === assistantId ? { ...m, content: newBlocks, isStreaming: streaming } : m
        )
        return { ...prev, messages: msgs }
      })
    }

    try {
      const historyMessages = currentChat.messages.concat(userMsg)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyMessages, config }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      if (!res.body) throw new Error('No response body')

      for await (const event of readStream(res.body.getReader())) {
        if (event.type === 'done') break

        if (event.type === 'thinking') {
          const last = blocks.at(-1)
          if (last?.type === 'thinking') {
            thinkingText += event.thinking
            blocks = [...blocks.slice(0, -1), { type: 'thinking', thinking: thinkingText } as ThinkingBlock]
          } else {
            thinkingText = event.thinking
            blocks = [...blocks, { type: 'thinking', thinking: thinkingText } as ThinkingBlock]
          }
          updateAssistant(blocks)
        } else if (event.type === 'text') {
          const last = blocks.at(-1)
          if (last?.type === 'text') {
            responseText = (last as TextBlock).text + event.text
            blocks = [...blocks.slice(0, -1), { type: 'text', text: responseText } as TextBlock]
          } else {
            responseText = event.text
            blocks = [...blocks, { type: 'text', text: responseText } as TextBlock]
          }
          updateAssistant(blocks)
        } else if (event.type === 'suggestions') {
          if (process.env.NODE_ENV !== 'production') console.debug('[chat] suggestions list event', event)
          const suggestedQueries = event.queries.map(q => q.trim()).filter(Boolean)
          setChat(prev => {
            if (!prev) return prev
            const msgs = prev.messages.map(m =>
              m.id === assistantId ? { ...m, suggestedQueries } : m
            )
            return { ...prev, messages: msgs }
          })
        } else if (event.type === 'table') {
          blocks = [...blocks, { type: 'table', columns: event.columns, rows: event.rows, sql: event.sql, title: event.title } as TableBlock]
          updateAssistant(blocks)
        } else if (event.type === 'chart') {
          blocks = [...blocks, { type: 'chart', chartSpec: event.chartSpec } as ChartBlock]
          updateAssistant(blocks)
        } else if (event.type === 'status') {
          // Show the status message in the streaming indicator without adding a content block
          setChat(prev => {
            if (!prev) return prev
            const msgs = prev.messages.map(m =>
              m.id === assistantId ? { ...m, streamingStatus: event.message } : m
            )
            return { ...prev, messages: msgs }
          })
        } else if (event.type === 'error') {
          throw new Error(event.message)
        }
      }

      // Persist the final message (clear streamingStatus)
      setChat(prev => {
        if (!prev) return prev
        const msgs = prev.messages.map(m =>
          m.id === assistantId ? { ...m, content: blocks, isStreaming: false, streamingStatus: undefined } : m
        )
        const final = { ...prev, messages: msgs, updatedAt: Date.now() }
        saveChat(final)
        return final
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : String(err))
      // Remove the empty assistant placeholder
      setChat(prev => {
        if (!prev) return prev
        const msgs = prev.messages.filter(m => m.id !== assistantId)
        const rolled = { ...prev, messages: msgs }
        saveChat(rolled)
        return rolled
      })
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, []) // stable — uses chatRef internally

  // ── Handle pending auto-send from landing page ──────────────────────────────
  useEffect(() => {
    if (pendingLoadedRef.current) return
    pendingLoadedRef.current = true

    if (!chat) {
      router.push('/')
      return
    }

    const pending = sessionStorage.getItem(`pending_${id}`)
    if (pending) {
      sessionStorage.removeItem(`pending_${id}`)
      pendingMsgRef.current = pending
    }
  }, [chat, id, router])

  // Send pending message once chat state is set
  useEffect(() => {
    if (chat && pendingMsgRef.current) {
      const msg = pendingMsgRef.current
      pendingMsgRef.current = null
      sendMessage(msg)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.id]) // only fire when the chat ID first becomes available

  const handleStop = () => { abortRef.current?.abort(); setIsLoading(false) }

  if (!chat) return null

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-950">
      <Sidebar
        currentChatId={id}
        onSettingsClick={() => setShowSettings(true)}
        refreshKey={sidebarKey}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center border-b border-gray-100 px-6 py-3 dark:border-gray-800">
          <h1 className="truncate text-sm font-medium text-gray-600 dark:text-gray-300">{chat.title}</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-4">
            {chat.messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onSuggestionClick={query => {
                  if (isLoading) return
                  setInputValue(query)
                  setInputFocusNonce(n => n + 1)
                }}
              />
            ))}
            {error && (
              <div className="my-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/80 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-800">
          <div className="mx-auto max-w-3xl">
            <ChatInput
              onSend={sendMessage}
              isLoading={isLoading}
              onStop={handleStop}
              value={inputValue}
              onValueChange={setInputValue}
              focusNonce={inputFocusNonce}
            />
            <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
              Snowflake Cortex Agents · responses may contain errors
            </p>
          </div>
        </div>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
