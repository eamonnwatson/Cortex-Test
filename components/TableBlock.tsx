'use client'
import { useState } from 'react'
import { BarChart2, Table2 } from 'lucide-react'
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

export default function TableBlock({ columns, rows, sql, title }: TableBlockProps) {
  const [view, setView] = useState<'table' | 'chart'>('table')
  const [chartType, setChartType] = useState<ChartType>('bar')

  const chartData = rows.slice(0, 200).map(row =>
    Object.fromEntries(columns.map((c, i) => [c, row[i] as string | number]))
  )

  const sample = rows[0] ?? []
  const xKey = columns[0]
  const yKeys = columns.filter((_, i) => i > 0 && isNumeric(sample[i]))
  const canChart = yKeys.length > 0

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-gray-200 text-sm">
      {title && (
        <div className="border-b border-gray-100 bg-white px-3 py-2 text-xs font-medium text-gray-600">
          {title}
        </div>
      )}
      {sql && (
        <div className="border-b border-gray-100 bg-gray-50 px-3 py-1.5 font-mono text-xs text-gray-400 truncate">
          {sql}
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-3 py-1.5">
        <span className="text-xs text-gray-400">
          {rows.length} row{rows.length !== 1 ? 's' : ''} · {columns.length} col{columns.length !== 1 ? 's' : ''}
        </span>
        {canChart && (
          <div className="ml-auto flex gap-1">
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
                  chartType === t ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
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
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                {columns.map(col => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-3 py-2 text-left font-medium uppercase tracking-wider text-gray-400"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.slice(0, 1000).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {row.map((cell, j) => (
                    <td key={j} className="whitespace-nowrap px-3 py-1.5 text-gray-700">
                      {cell === null ? <span className="italic text-gray-300">null</span> : String(cell)}
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
        active ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {children}
    </button>
  )
}
