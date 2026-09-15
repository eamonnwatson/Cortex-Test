'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import MessageBubble from '@/components/MessageBubble'
import ChatInput from '@/components/ChatInput'
import SettingsModal from '@/components/SettingsModal'
import { generateId, getChat, saveChat } from '@/lib/store'
import { readStream } from '@/lib/stream-parser'
import type { Chat, ChartBlock, ContentBlock, Message, TableBlock, TextBlock, ThinkingBlock, ToolUseBlock } from '@/lib/types'

function normalizeGeneratedTitle(raw: string): string | null {
  const cleaned = raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'`]+/, '')
    .replace(/["'`]+$/, '')

  if (!cleaned) return null
  return cleaned.slice(0, 80)
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [chat, setChat] = useState<Chat | null>(() => getChat(id))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
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
    const isFirstTurn = currentChat.messages.length === 0

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
    chatRef.current = withUser
    setChat(withUser)
    saveChat({ ...withUser, messages: withUser.messages.filter(m => m.id !== assistantId) })
    setIsLoading(true)

    // Start title generation in parallel with Cortex for the first user turn.
    if (isFirstTurn) {
      void fetch('/api/chat/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      })
        .then(async res => {
          if (!res.ok) return null
          const payload = await res.json().catch(() => null) as { title?: unknown } | null
          if (typeof payload?.title !== 'string') return null
          return normalizeGeneratedTitle(payload.title)
        })
        .then(title => {
          if (!title) return
          const latest = chatRef.current
          if (!latest || latest.id !== currentChat.id || latest.title === title) return
          const updated = { ...latest, title, updatedAt: Date.now() }
          chatRef.current = updated
          setChat(updated)
          saveChat(updated)
        })
        .catch(() => {
          // Title generation is best-effort and should never block chat UX.
        })
    }

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
        const next = { ...prev, messages: msgs }
        chatRef.current = next
        return next
      })
    }

    const completeThinkingBlocks = () => {
      blocks = blocks.map(block =>
        block.type === 'thinking' ? { ...block, isComplete: true } : block
      )
    }

    try {
      const historyMessages = currentChat.messages.concat(userMsg)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyMessages }),
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
          completeThinkingBlocks()
          const last = blocks.at(-1)
          if (last?.type === 'text') {
            responseText = (last as TextBlock).text + event.text
            blocks = [...blocks.slice(0, -1), { type: 'text', text: responseText } as TextBlock]
          } else {
            responseText = event.text
            blocks = [...blocks, { type: 'text', text: responseText } as TextBlock]
          }
          updateAssistant(blocks)
        } else if (event.type === 'tool_use') {
          if (event.name === 'system_execute_sql') {
            completeThinkingBlocks()
            blocks = [...blocks, {
              type: 'tool',
              toolUseId: event.toolUseId,
              name: event.name,
              semanticModel: event.semanticModel,
              sql: event.sql,
            } as ToolUseBlock]
          }
          setChat(prev => {
            if (!prev) return prev
            const msgs = prev.messages.map(m =>
              m.id === assistantId ? { ...m, streamingStatus: `Using tool ${event.name}` } : m
            )
            const next = { ...prev, messages: msgs }
            chatRef.current = next
            return next
          })
          updateAssistant(blocks)
        } else if (event.type === 'tool_result') {
          blocks = blocks.map(block =>
            block.type === 'tool' && block.toolUseId === event.toolUseId
              ? {
                  ...block,
                  isComplete: true,
                  semanticModelPath: event.semanticModelPath,
                  executedSql: event.sql,
                }
              : block
          )
          updateAssistant(blocks)
          setChat(prev => {
            if (!prev) return prev
            const message = event.name ? `${event.name}: ${event.status}` : `Tool: ${event.status}`
            const msgs = prev.messages.map(m =>
              m.id === assistantId ? { ...m, streamingStatus: message } : m
            )
            const next = { ...prev, messages: msgs }
            chatRef.current = next
            return next
          })
        } else if (event.type === 'suggestions') {
          if (process.env.NODE_ENV !== 'production') console.debug('[chat] suggestions list event', event)
          const suggestedQueries = event.queries.map(q => q.trim()).filter(Boolean)
          setChat(prev => {
            if (!prev) return prev
            const msgs = prev.messages.map(m =>
              m.id === assistantId ? { ...m, suggestedQueries } : m
            )
            const next = { ...prev, messages: msgs }
            chatRef.current = next
            return next
          })
        } else if (event.type === 'table') {
          completeThinkingBlocks()
          blocks = [...blocks, { type: 'table', columns: event.columns, rows: event.rows, sql: event.sql, title: event.title } as TableBlock]
          updateAssistant(blocks)
        } else if (event.type === 'chart') {
          completeThinkingBlocks()
          blocks = [...blocks, { type: 'chart', chartSpec: event.chartSpec } as ChartBlock]
          updateAssistant(blocks)
        } else if (event.type === 'status') {
          // Show the status message in the streaming indicator without adding a content block
          setChat(prev => {
            if (!prev) return prev
            const msgs = prev.messages.map(m =>
              m.id === assistantId ? { ...m, streamingStatus: event.message } : m
            )
            const next = { ...prev, messages: msgs }
            chatRef.current = next
            return next
          })
        } else if (event.type === 'error') {
          throw new Error(event.message)
        }
      }

      // Persist the final message (clear streamingStatus)
      const latest = chatRef.current
      if (latest) {
        const msgs = latest.messages.map(m =>
          m.id === assistantId ? { ...m, content: blocks, isStreaming: false, streamingStatus: undefined } : m
        )
        const final = { ...latest, messages: msgs, updatedAt: Date.now() }
        chatRef.current = final
        setChat(final)
        saveChat(final)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : String(err))
      // Remove the empty assistant placeholder
      const latest = chatRef.current
      if (latest) {
        const msgs = latest.messages.filter(m => m.id !== assistantId)
        const rolled = { ...latest, messages: msgs }
        chatRef.current = rolled
        setChat(rolled)
        saveChat(rolled)
      }
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
    <div className="flex h-screen overflow-hidden [background:var(--page-bg)]">
      <Sidebar
        currentChatId={id}
        onSettingsClick={() => setShowSettings(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center border-b border-[var(--brand-border)] bg-[var(--brand-surface)] px-6 py-3">
          <h1 className="truncate text-sm font-medium text-[var(--brand-primary)]">{chat.title}</h1>
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
        <div className="border-t border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 pb-4 pt-3">
          <div className="mx-auto max-w-3xl">
            <ChatInput
              onSend={sendMessage}
              isLoading={isLoading}
              onStop={handleStop}
              value={inputValue}
              onValueChange={setInputValue}
              focusNonce={inputFocusNonce}
            />
            <p className="mt-2 text-center text-xs text-[var(--brand-subtle-text)]">
              Snowflake Cortex Agents · responses may contain errors
            </p>
          </div>
        </div>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
