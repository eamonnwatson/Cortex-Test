'use client'
import { useEffect, useRef, useState } from 'react'

interface VegaChartProps {
  chartSpec: string
}

type GenericSpec = Record<string, unknown>

function makeSpecResponsive(spec: GenericSpec): GenericSpec {
  const schema = String(spec.$schema ?? '').toLowerCase()

  // Vega-Lite supports container-based sizing directly.
  if (schema.includes('vega-lite')) {
    return {
      ...spec,
      width: 'container',
      autosize: { type: 'fit-x', contains: 'padding' },
    }
  }

  // Vega specs need fit-x autosize and no fixed width to grow with the host container.
  const next: GenericSpec = { ...spec }
  delete next.width
  next.autosize = { type: 'fit-x', contains: 'padding', resize: true }
  return next
}

export default function VegaChart({ chartSpec }: VegaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let resizeObserver: ResizeObserver | null = null
    let rafId: number | null = null

    import('vega-embed').then(({ default: embed }) => {
      if (cancelled || !container) return

      const render = () => {
        if (cancelled || !container) return
        try {
          const parsed = JSON.parse(chartSpec) as GenericSpec
          const spec = makeSpecResponsive(parsed)
          setError(null)
          embed(container, spec, {
            actions: { export: true, source: false, compiled: false, editor: false },
            renderer: 'svg',
            // Remove the default Vega watermark style
            config: { background: 'transparent', view: { stroke: 'transparent' } },
          }).catch(e => {
            if (!cancelled) setError(String(e))
          })
        } catch (e) {
          if (!cancelled) setError(`Invalid chart spec: ${String(e)}`)
        }
      }

      render()

      // Re-render when container width changes so charts stay fitted in responsive layouts.
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          if (rafId !== null) window.cancelAnimationFrame(rafId)
          rafId = window.requestAnimationFrame(render)
        })
        resizeObserver.observe(container)
      }
    })

    return () => {
      cancelled = true
      if (resizeObserver) resizeObserver.disconnect()
      if (rafId !== null) window.cancelAnimationFrame(rafId)
      // vega-embed attaches its own cleanup; clear the container so stale SVG is removed
      container.innerHTML = ''
    }
  }, [chartSpec])

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/80 dark:bg-red-950/40 dark:text-red-300">
        Chart error: {error}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="my-3 w-full overflow-hidden rounded-lg [&_canvas]:max-w-full [&_svg]:max-w-full [&_svg]:w-full"
    />
  )
}
