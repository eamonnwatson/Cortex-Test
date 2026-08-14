'use client'
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#db2777']

interface ChartBlockProps {
  chartType: 'bar' | 'line' | 'area' | 'pie'
  data: Record<string, string | number>[]
  xKey: string
  yKeys: string[]
  title?: string
}

const sharedAxes = (xKey: string) => (
  <>
    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
    <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={{ stroke: 'var(--chart-grid)' }} tickLine={{ stroke: 'var(--chart-grid)' }} />
    <YAxis tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={{ stroke: 'var(--chart-grid)' }} tickLine={{ stroke: 'var(--chart-grid)' }} width={50} />
    <Tooltip contentStyle={{ fontSize: 12, backgroundColor: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', color: 'var(--chart-tooltip-text)' }} />
  </>
)

export default function ChartBlock({ chartType, data, xKey, yKeys, title }: ChartBlockProps) {
  return (
    <div className="h-56 w-full">
      {title && <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">{title}</p>}
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'pie' ? (
          <PieChart>
            <Pie
              data={data.map(d => ({ name: String(d[xKey]), value: Number(d[yKeys[0]]) }))}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, backgroundColor: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', color: 'var(--chart-tooltip-text)' }} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--chart-axis)' }} />
          </PieChart>
        ) : chartType === 'line' ? (
          <LineChart data={data}>
            {sharedAxes(xKey)}
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: 'var(--chart-axis)' }} />}
            {yKeys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
            ))}
          </LineChart>
        ) : chartType === 'area' ? (
          <AreaChart data={data}>
            {sharedAxes(xKey)}
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: 'var(--chart-axis)' }} />}
            {yKeys.map((k, i) => (
              <Area key={k} type="monotone" dataKey={k} fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} fillOpacity={0.25} strokeWidth={2} />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={data}>
            {sharedAxes(xKey)}
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: 'var(--chart-axis)' }} />}
            {yKeys.map((k, i) => (
              <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
