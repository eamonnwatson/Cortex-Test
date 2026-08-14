'use client'
import { Sparkles, User } from 'lucide-react'
import type { ChartBlock, Message, TableBlock as TBBlock, TextBlock, ThinkingBlock as TBlock } from '@/lib/types'
import ThinkingBlock from './ThinkingBlock'
import TableBlock from './TableBlock'
import VegaChart from './VegaChart'

interface Props {
  message: Message
}

// Minimal markdown renderer: code fences, inline code, bold, newlines
function renderMarkdown(text: string): React.ReactNode {
  const fenceRe = /```(\w*)\n?([\s\S]*?)```/g
  const parts: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null

  while ((match = fenceRe.exec(text)) !== null) {
    if (match.index > last) parts.push(renderInline(text.slice(last, match.index), `pre-${last}`))
    const lang = match[1]
    const code = match[2].replace(/\n$/, '')
    parts.push(
      <pre key={match.index} className="my-2 overflow-x-auto rounded-md bg-gray-950 p-3 text-xs text-gray-100 font-mono leading-relaxed">
        {lang && <div className="mb-1.5 text-gray-500 text-[10px] uppercase">{lang}</div>}
        <code>{code}</code>
      </pre>
    )
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(renderInline(text.slice(last), `tail-${last}`))
  return <>{parts}</>
}

function renderInline(text: string, key: string): React.ReactNode {
  // Split on inline code and **bold**
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g
  const segs: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push(...splitLines(text.slice(last, m.index), `${key}-${last}`))
    const raw = m[0]
    if (raw.startsWith('`'))
      segs.push(<code key={m.index} className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-gray-800">{raw.slice(1, -1)}</code>)
    else
      segs.push(<strong key={m.index}>{raw.slice(2, -2)}</strong>)
    last = m.index + raw.length
  }
  if (last < text.length) segs.push(...splitLines(text.slice(last), `${key}-tail`))
  return <span key={key}>{segs}</span>
}

function splitLines(text: string, key: string): React.ReactNode[] {
  return text.split('\n').flatMap((line, i, arr) => {
    const node = <span key={`${key}-${i}`}>{line}</span>
    return i < arr.length - 1 ? [node, <br key={`${key}-br-${i}`} />] : [node]
  })
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'
  const isEmpty = message.content.length === 0

  return (
    <div className={`flex gap-3 py-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-gray-200' : 'bg-gray-900'
        }`}
      >
        {isUser
          ? <User size={13} className="text-gray-600" />
          : <Sparkles size={13} className="text-white" />}
      </div>

      {/* Content */}
      {isUser ? (
        <div className="max-w-[72%] rounded-2xl bg-gray-100 px-4 py-2.5 text-sm text-gray-900 leading-relaxed">
          {(message.content as TextBlock[]).map(b => b.text).join('')}
        </div>
      ) : (
        <div className="flex-1 min-w-0 text-sm text-gray-800 leading-relaxed">
          {isEmpty && message.isStreaming && (
            <div className="flex gap-1 py-3">
              {[0, 150, 300].map(d => (
                <span key={d} className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          )}
          {message.streamingStatus && message.isStreaming && (
            <p className="mb-2 text-xs text-gray-400 italic">{message.streamingStatus}</p>
          )}
          {message.content.map((block, i) => {
            if (block.type === 'thinking')
              return <ThinkingBlock key={i} thinking={(block as TBlock).thinking} isStreaming={message.isStreaming} />
            if (block.type === 'table') {
              const b = block as TBBlock
              return <TableBlock key={i} columns={b.columns} rows={b.rows} sql={b.sql} title={b.title} />
            }
            if (block.type === 'chart') {
              return <VegaChart key={i} chartSpec={(block as ChartBlock).chartSpec} />
            }
            if (block.type === 'text') {
              const b = block as TextBlock
              return (
                <div key={i} className="space-y-1">
                  {renderMarkdown(b.text)}
                </div>
              )
            }
            return null
          })}
        </div>
      )}
    </div>
  )
}
