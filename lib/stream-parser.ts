export type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'suggestions'; queries: string[] }
  | { type: 'table'; columns: string[]; rows: (string | number | null)[][]; sql?: string; title?: string }
  | { type: 'chart'; chartSpec: string }
  | { type: 'status'; message: string; status: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseResultSet(rs: any): { columns: string[]; rows: (string | number | null)[][] } | null {
  if (!rs) return null
  const columns: string[] = rs.resultSetMetaData?.rowType?.map((r: { name: string }) => r.name) ?? []
  const rows: (string | number | null)[][] = rs.data ?? []
  return { columns, rows }
}

export async function* readStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<StreamEvent> {
  const decoder = new TextDecoder()
  let buffer = ''
  let eventType: string | null = null
  // Track SQL per tool_use_id so we can attach it to the table event
  const sqlByToolUseId = new Map<string, string>()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim()
          continue
        }
        if (line === '') { eventType = null; continue }
        if (!line.startsWith('data: ')) continue

        const raw = line.slice(6).trim()
        if (raw === '[DONE]') { yield { type: 'done' }; return }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any
        try { data = JSON.parse(raw) } catch { continue }

        switch (eventType) {
          case 'response.text.delta':
            if (data.text) yield { type: 'text', text: data.text }
            break

          case 'response.thinking.delta':
            // API uses `text` field (not `thinking`) for the delta content
            if (data.text) yield { type: 'thinking', thinking: data.text }
            break

          case 'response.tool_result.analyst.delta': {
            const delta = data.delta ?? {}
            // Analyst's internal reasoning surfaced as thinking
            if (delta.think) yield { type: 'thinking', thinking: delta.think }
            // Track SQL so it can be attached to the response.table event
            if (delta.sql && data.tool_use_id) sqlByToolUseId.set(data.tool_use_id, delta.sql)
            break
          }

          case 'response.suggested_queries': {
            const raw = Array.isArray(data.suggested_queries) ? data.suggested_queries : []
            const queries = raw
              .map((item: { query?: string } | string) => {
                if (typeof item === 'string') return item.trim()
                if (item && typeof item.query === 'string') return item.query.trim()
                return ''
              })
              .filter(Boolean)

            if (queries.length) {
              yield { type: 'suggestions', queries }
            }
            break
          }

          case 'response.table': {
            const parsed = parseResultSet(data.result_set)
            if (parsed) {
              yield {
                type: 'table',
                columns: parsed.columns,
                rows: parsed.rows,
                sql: data.tool_use_id ? sqlByToolUseId.get(data.tool_use_id) : undefined,
                title: data.title,
              }
            }
            break
          }

          case 'response.chart':
            if (data.chart_spec) yield { type: 'chart', chartSpec: data.chart_spec }
            break

          case 'response.status':
            yield { type: 'status', message: data.message ?? '', status: data.status ?? '' }
            break

          case 'response':
            // Extract top-level suggested queries from the final aggregated payload.
            {
              const topLevelSuggestedQueries = Array.isArray(data.suggested_queries)
                ? data.suggested_queries
                    .map((item: { query?: string } | string) => {
                      if (typeof item === 'string') return item.trim()
                      if (item && typeof item.query === 'string') return item.query.trim()
                      return ''
                    })
                    .filter(Boolean)
                : []
              if (topLevelSuggestedQueries.length) {
                yield { type: 'suggestions', queries: topLevelSuggestedQueries }
              }
            }

            // Final aggregated event — streaming is complete
            yield { type: 'done' }
            return

          case 'error':
            yield { type: 'error', message: data.message ?? 'Unknown error' }
            return
        }
      }
    }
  } finally {
    try { reader.cancel() } catch { /* ignore */ }
  }

  yield { type: 'done' }
}

