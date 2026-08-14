'use client'
import { useState } from 'react'
import { ChevronDown, ChevronRight, Brain } from 'lucide-react'

interface ThinkingBlockProps {
  thinking: string
  isStreaming?: boolean
}

export default function ThinkingBlock({ thinking, isStreaming }: ThinkingBlockProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="my-2 rounded-lg border border-gray-200 bg-gray-50 text-sm dark:border-gray-700 dark:bg-gray-900">
      <button
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 transition-colors dark:text-gray-400 dark:hover:bg-gray-800"
        onClick={() => setOpen(o => !o)}
      >
        <Brain size={13} className="flex-shrink-0" />
        <span className="text-xs font-medium">
          {isStreaming ? 'Thinking' : 'Thought for a moment'}
        </span>
        {isStreaming && (
          <span className="flex gap-0.5 ml-0.5">
            {[0, 100, 200].map(d => (
              <span
                key={d}
                className="inline-block w-1 h-1 rounded-full bg-gray-400 animate-bounce dark:bg-gray-500"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </span>
        )}
        <span className="ml-auto text-gray-400 dark:text-gray-500">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
      </button>
      {open && (
        <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 whitespace-pre-wrap leading-relaxed font-mono dark:border-gray-700 dark:text-gray-400">
          {thinking}
        </div>
      )}
    </div>
  )
}
