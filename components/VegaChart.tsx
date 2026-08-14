'use client'
import { useEffect, useRef, useState } from 'react'

interface VegaChartProps {
  chartSpec: string
}

export default function VegaChart({ chartSpec }: VegaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false

    import('vega-embed').then(({ default: embed }) => {
      if (cancelled || !container) return
      try {
        const spec = JSON.parse(chartSpec)
        embed(container, spec, {
          actions: { export: true, source: false, compiled: false, editor: false },
          renderer: 'svg',
          // Remove the default Vega watermark style
          config: { background: 'white', view: { stroke: 'transparent' } },
        }).catch(e => {
          if (!cancelled) setError(String(e))
        })
      } catch (e) {
        if (!cancelled) setError(`Invalid chart spec: ${String(e)}`)
      }
    })

    return () => {
      cancelled = true
      // vega-embed attaches its own cleanup; clear the container so stale SVG is removed
      container.innerHTML = ''
    }
  }, [chartSpec])

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
        Chart error: {error}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="my-3 w-full overflow-hidden rounded-lg [&_canvas]:max-w-full [&_svg]:max-w-full"
    />
  )
}
