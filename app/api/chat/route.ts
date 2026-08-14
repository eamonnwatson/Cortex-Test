import { NextRequest } from 'next/server'
import type { SnowflakeConfig } from '@/lib/types'

export const runtime = 'nodejs'

interface ContentItem {
  type: string
  text?: string
}

interface ApiMessage {
  role: 'user' | 'assistant'
  content: ContentItem[]
}

// Only include text content blocks in conversation history sent to Snowflake
function toSnowflakeMessages(messages: ApiMessage[]) {
  return messages.map(m => ({
    role: m.role,
    content: m.content
      .filter(c => c.type === 'text' && c.text)
      .map(c => ({ type: 'text', text: c.text })),
  })).filter(m => m.content.length > 0)
}

export async function POST(request: NextRequest) {
  let body: { messages: ApiMessage[]; config: SnowflakeConfig }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { messages, config } = body

  if (!config?.accountUrl || !config?.database || !config?.schema || !config?.agentName || !config?.authToken) {
    return Response.json({ error: 'Missing Snowflake configuration' }, { status: 400 })
  }

  const base = config.accountUrl.replace(/\/+$/, '')
  const url = `${base}/api/v2/databases/${encodeURIComponent(config.database)}/schemas/${encodeURIComponent(config.schema)}/agents/${encodeURIComponent(config.agentName)}:run`

  const authHeader =
    config.tokenType === 'KEYPAIR_JWT'
      ? `Snowflake Token="${config.authToken}"`
      : `Bearer ${config.authToken}`

  let snowflakeRes: Response
  try {
    snowflakeRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'X-Snowflake-Authorization-Token-Type': config.tokenType,
      },
      body: JSON.stringify({
        messages: toSnowflakeMessages(messages),
        // stream defaults to true; omitting it keeps behaviour explicit
        stream: true,
      }),
    })
  } catch (err) {
    return Response.json({ error: `Failed to reach Snowflake: ${String(err)}` }, { status: 502 })
  }

  if (!snowflakeRes.ok) {
    const text = await snowflakeRes.text().catch(() => '')
    return Response.json({ error: text || `Snowflake returned ${snowflakeRes.status}` }, { status: snowflakeRes.status })
  }

  return new Response(snowflakeRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

