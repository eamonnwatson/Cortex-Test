'use client'
import { type KeyboardEvent, useRef, useState } from 'react'
import { Send, Square } from 'lucide-react'

interface ChatInputProps {
  onSend: (text: string) => void
  isLoading?: boolean
  onStop?: () => void
  placeholder?: string
  disabled?: boolean
}

export default function ChatInput({ onSend, isLoading, onStop, placeholder, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const text = value.trim()
    if (!text || isLoading) return
    onSend(text)
    setValue('')
    if (ref.current) ref.current.style.height = 'auto'
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const autoResize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  return (
    <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition-shadow focus-within:border-gray-300 focus-within:shadow">
      <textarea
        ref={ref}
        value={value}
        rows={1}
        placeholder={placeholder ?? 'Ask a question…'}
        disabled={disabled}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={autoResize}
        className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none disabled:opacity-50"
        style={{ maxHeight: 200 }}
      />
      <button
        onClick={isLoading ? onStop : handleSend}
        disabled={!isLoading && (!value.trim() || disabled)}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white transition-colors hover:bg-gray-700 disabled:opacity-30"
        aria-label={isLoading ? 'Stop' : 'Send'}
      >
        {isLoading ? <Square size={11} fill="currentColor" /> : <Send size={13} />}
      </button>
    </div>
  )
}
