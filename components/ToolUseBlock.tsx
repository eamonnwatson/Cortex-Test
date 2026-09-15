'use client'
import { useState } from 'react'
import { ChevronDown, ChevronRight, Database } from 'lucide-react'
import type { ToolUseBlock as ToolBlock } from '@/lib/types'

interface Props {
  block: ToolBlock
  isComplete?: boolean
  isStreaming?: boolean
}

export default function ToolUseBlock({ block, isComplete, isStreaming }: Props) {
  const [open, setOpen] = useState(false)
  const active = !isComplete && isStreaming

  return (
    <div className="my-2 rounded-lg border border-gray-200 bg-gray-50 text-sm dark:border-gray-700 dark:bg-gray-900">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        onClick={() => setOpen(value => !value)}
      >
        <Database size={13} className="flex-shrink-0" />
        <span className="text-xs font-medium">Using {block.name}</span>
        {active && <span className="text-xs text-gray-400">running</span>}
        <span className="ml-auto text-gray-400 dark:text-gray-500">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-gray-200 px-4 py-3 text-xs dark:border-gray-700">
          {block.semanticModel && <Detail label="Semantic model" value={block.semanticModel} />}
          {block.semanticModelPath && <Detail label="Semantic model path" value={block.semanticModelPath} />}
          {block.sql && <Detail label="Generated SQL" value={block.sql} />}
          {block.executedSql && <Detail label="Executed SQL" value={block.executedSql} />}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono leading-relaxed text-gray-600 dark:text-gray-300">{value}</pre>
    </div>
  )
}