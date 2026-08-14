'use client'
import { useState } from 'react'
import { BarChart2, Copy, Download, Table2 } from 'lucide-react'
import ChartBlock from './ChartBlock'

interface TableBlockProps {
  columns: string[]
  rows: (string | number | null)[][]
  sql?: string
  title?: string
}

type ChartType = 'bar' | 'line' | 'area' | 'pie'

function isNumeric(v: string | number | null) {
  return v !== null && !isNaN(Number(v))
}

function escapeCsvCell(value: string | number | null) {
  if (value === null) return ''
  const str = String(value)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function toCsv(columns: string[], rows: (string | number | null)[][]) {
  const header = columns.map(escapeCsvCell).join(',')
  const body = rows.map(row => row.map(cell => escapeCsvCell(cell)).join(',')).join('\n')
  return `${header}\n${body}`
}

function safeFilenamePart(text?: string) {
  const base = (text ?? 'table').trim().toLowerCase()
  const cleaned = base.replace(/[^a-z0-9-_ ]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
  return cleaned || 'table'
}

export default function TableBlock({ columns, rows, sql, title }: TableBlockProps) {
  const [view, setView] = useState<'table' | 'chart'>('table')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  const chartData = rows.slice(0, 200).map(row =>
    Object.fromEntries(columns.map((c, i) => [c, row[i] as string | number]))
  )

  const sample = rows[0] ?? []
  const xKey = columns[0]
  const yKeys = columns.filter((_, i) => i > 0 && isNumeric(sample[i]))
  const canChart = yKeys.length > 0
  const csv = toCsv(columns, rows)

  async function handleCopyCsv() {
    try {
      await navigator.clipboard.writeText(csv)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1800)
    } catch {
      setCopyState('error')
      setTimeout(() => setCopyState('idle'), 1800)
    }
  }

  function handleDownloadCsv() {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${safeFilenamePart(title)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-gray-200 text-sm dark:border-gray-700">
      {title && (
        <div className="border-b border-gray-100 bg-white px-3 py-2 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          {title}
        </div>
      )}
      {sql && (
        <div className="border-b border-gray-100 bg-gray-50 px-3 py-1.5 font-mono text-xs text-gray-400 truncate dark:border-gray-800 dark:bg-gray-950 dark:text-gray-500">
          {sql}
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-3 py-1.5 dark:border-gray-800 dark:bg-gray-900">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {rows.length} row{rows.length !== 1 ? 's' : ''} · {columns.length} col{columns.length !== 1 ? 's' : ''}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={handleCopyCsv}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            title="Copy as CSV"
          >
            <Copy size={12} />
            {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Failed' : 'Copy CSV'}
          </button>
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            title="Download as CSV"
          >
            <Download size={12} /> Download CSV
          </button>
        </div>
        {canChart && (
          <div className="flex gap-1">
            <TabBtn active={view === 'table'} onClick={() => setView('table')}>
              <Table2 size={12} /> Table
            </TabBtn>
            <TabBtn active={view === 'chart'} onClick={() => setView('chart')}>
              <BarChart2 size={12} /> Chart
            </TabBtn>
          </div>
        )}
      </div>

      {view === 'chart' ? (
        <div className="p-3">
          <div className="mb-3 flex gap-1">
            {(['bar', 'line', 'area', 'pie'] as ChartType[]).map(t => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                className={`rounded px-2 py-0.5 text-xs capitalize transition-colors ${
                  chartType === t ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <ChartBlock chartType={chartType} data={chartData} xKey={xKey} yKeys={yKeys} />
        </div>
      ) : (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-950">
              <tr>
                {columns.map(col => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-3 py-2 text-left font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
              {rows.slice(0, 1000).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  {row.map((cell, j) => (
                    <td key={j} className="whitespace-nowrap px-3 py-1.5 text-gray-700 dark:text-gray-300">
                      {cell === null ? <span className="italic text-gray-300 dark:text-gray-600">null</span> : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${
        active ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
      }`}
    >
      {children}
    </button>
  )
}
