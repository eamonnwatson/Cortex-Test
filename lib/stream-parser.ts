import type { TableColumn } from './types'

export type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; toolUseId: string; name: string; semanticModel?: string; sql?: string }
  | { type: 'tool_result'; toolUseId: string; name?: string; status: string; semanticModelPath?: string; sql?: string }
  | { type: 'suggestions'; queries: string[] }
  | { type: 'table'; columns: TableColumn[]; rows: (string | number | null)[][]; sql?: string; title?: string }
  | { type: 'chart'; chartSpec: string }
  | { type: 'status'; message: string; status: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function numericValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return undefined
}

function parseResultSet(rs: unknown): { columns: TableColumn[]; rows: (string | number | null)[][] } | null {
  if (!rs) return null
  const result = isRecord(rs) ? rs : {}
  const metadata = isRecord(result.resultSetMetaData) ? result.resultSetMetaData : {}
  const rowType = Array.isArray(metadata.rowType) ? metadata.rowType : []
  const columns: TableColumn[] = rowType.map(rawColumn => {
    const column = isRecord(rawColumn) ? rawColumn : {}
    const type = column.type ?? column.type_
    return {
      name: typeof column.name === 'string' ? column.name : '',
      type: typeof type === 'string' ? type : undefined,
      precision: numericValue(column.precision),
      scale: numericValue(column.scale),
    }
  })
  const rows: (string | number | null)[][] = Array.isArray(result.data) ? result.data as (string | number | null)[][] : []
  return { columns, rows }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function getToolResultJson(data: unknown): Record<string, unknown> | undefined {
  const content = isRecord(data) && Array.isArray(data.content) ? data.content : []
  const jsonContent = content.find(item => {
    if (!isRecord(item)) return false
    return item.type === 'json' && item.json
  })
  return isRecord(jsonContent) && isRecord(jsonContent.json) ? jsonContent.json
    : undefined
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

          case 'response.tool_use': {
            const input = data.input ?? {}
            if (data.name) {
              yield {
                type: 'tool_use',
                toolUseId: data.tool_use_id ?? data.name,
                name: data.name,
                semanticModel: stringValue(input.semantic_model ?? input.semantic_model_path),
                sql: stringValue(input.sql),
              }
            }
            break
          }

          case 'response.tool_result': {
            const result = getToolResultJson(data)
            if (data.tool_use_id && data.status) {
              yield {
                type: 'tool_result',
                toolUseId: data.tool_use_id,
                name: stringValue(data.name),
                status: data.status,
                semanticModelPath: stringValue(result?.semantic_model_path),
                sql: stringValue(result?.sql),
              }
            }
            break
          }

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

          case 'response.tool_result.status':
            yield {
              type: 'status',
              message: data.message ?? `${data.tool_type ?? 'Tool'}: ${data.status ?? 'running'}`,
              status: data.status ?? '',
            }
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

