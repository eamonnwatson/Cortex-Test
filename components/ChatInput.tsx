'use client'
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Send, Square } from 'lucide-react'

interface ChatInputProps {
  onSend: (text: string) => void
  isLoading?: boolean
  onStop?: () => void
  placeholder?: string
  disabled?: boolean
  value?: string
  onValueChange?: (value: string) => void
  focusNonce?: number
}

export default function ChatInput({ onSend, isLoading, onStop, placeholder, disabled, value, onValueChange, focusNonce }: ChatInputProps) {
  const [internalValue, setInternalValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  const updateValue = (next: string) => {
    if (isControlled) onValueChange?.(next)
    else setInternalValue(next)
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [currentValue])

  useEffect(() => {
    if (focusNonce === undefined) return
    ref.current?.focus()
  }, [focusNonce])

  const handleSend = () => {
    const text = currentValue.trim()
    if (!text || isLoading) return
    onSend(text)
    updateValue('')
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
    <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition-shadow focus-within:border-gray-300 focus-within:shadow dark:border-gray-700 dark:bg-gray-900 dark:focus-within:border-gray-600">
      <textarea
        ref={ref}
        value={currentValue}
        rows={1}
        placeholder={placeholder ?? 'Ask a question…'}
        disabled={disabled}
        onChange={e => updateValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={autoResize}
        className="flex-1 resize-none bg-transparent py-1 text-sm leading-6 text-gray-900 placeholder-gray-400 focus:outline-none disabled:opacity-50 dark:text-gray-100 dark:placeholder-gray-500"
        style={{ maxHeight: 200 }}
      />
      <button
        onClick={isLoading ? onStop : handleSend}
        disabled={!isLoading && (!currentValue.trim() || disabled)}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white transition-colors hover:bg-gray-700 disabled:opacity-30"
        aria-label={isLoading ? 'Stop' : 'Send'}
      >
        {isLoading ? <Square size={11} fill="currentColor" /> : <Send size={13} />}
      </button>
    </div>
  )
}
