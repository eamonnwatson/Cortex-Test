import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

type SnowflakeTokenType = 'OAUTH' | 'KEYPAIR_JWT' | 'PROGRAMMATIC_ACCESS_TOKEN'

interface SnowflakeEnvConfig {
  accountUrl: string
  database: string
  schema: string
  agentName: string
  authToken: string
  tokenType: SnowflakeTokenType
}

interface ContentItem {
  type: string
  text?: string
}

interface ApiMessage {
  role: 'user' | 'assistant'
  content: ContentItem[]
}

function normalizeAccountBase(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '')
  if (!trimmed) return ''

  // Allow users to paste only the account host by defaulting to HTTPS.
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`
  }

  return trimmed
}

function readSnowflakeConfigFromEnv():
  | { config: SnowflakeEnvConfig }
  | { error: string } {
  const accountUrl = process.env.SNOWFLAKE_ACCOUNT_URL?.trim() ?? ''
  const database = process.env.SNOWFLAKE_DATABASE?.trim() ?? ''
  const schema = process.env.SNOWFLAKE_SCHEMA?.trim() ?? ''
  const agentName = process.env.SNOWFLAKE_AGENT_NAME?.trim() ?? ''
  const authToken = process.env.SNOWFLAKE_AUTH_TOKEN?.trim() ?? ''
  const rawTokenType = process.env.SNOWFLAKE_TOKEN_TYPE?.trim().toUpperCase() ?? 'PROGRAMMATIC_ACCESS_TOKEN'

  const missing: string[] = []
  if (!accountUrl) missing.push('SNOWFLAKE_ACCOUNT_URL')
  if (!database) missing.push('SNOWFLAKE_DATABASE')
  if (!schema) missing.push('SNOWFLAKE_SCHEMA')
  if (!agentName) missing.push('SNOWFLAKE_AGENT_NAME')
  if (!authToken) missing.push('SNOWFLAKE_AUTH_TOKEN')

  if (missing.length > 0) {
    return { error: `Missing Snowflake environment variables: ${missing.join(', ')}` }
  }

  const allowedTokenTypes: SnowflakeTokenType[] = ['PROGRAMMATIC_ACCESS_TOKEN', 'OAUTH', 'KEYPAIR_JWT']
  if (!allowedTokenTypes.includes(rawTokenType as SnowflakeTokenType)) {
    return {
      error:
        'Invalid SNOWFLAKE_TOKEN_TYPE. Allowed values: PROGRAMMATIC_ACCESS_TOKEN, OAUTH, KEYPAIR_JWT',
    }
  }

  return {
    config: {
      accountUrl,
      database,
      schema,
      agentName,
      authToken,
      tokenType: rawTokenType as SnowflakeTokenType,
    },
  }
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
  let body: { messages: ApiMessage[] }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { messages } = body

  if (!Array.isArray(messages)) {
    return Response.json({ error: 'Invalid request body: messages must be an array' }, { status: 400 })
  }

  const envConfig = readSnowflakeConfigFromEnv()
  if ('error' in envConfig) {
    return Response.json({ error: envConfig.error }, { status: 500 })
  }
  const { config } = envConfig

  const base = normalizeAccountBase(config.accountUrl)

  let url: string
  try {
    url = new URL(
      `/api/v2/databases/${encodeURIComponent(config.database)}/schemas/${encodeURIComponent(config.schema)}/agents/${encodeURIComponent(config.agentName)}:run`,
      base,
    ).toString()
  } catch {
    return Response.json(
      {
        error:
          'Invalid Snowflake account URL. Use a valid host or full URL, for example: https://myaccount.snowflakecomputing.com',
      },
      { status: 400 },
    )
  }

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

