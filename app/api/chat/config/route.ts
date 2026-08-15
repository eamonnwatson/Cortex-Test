import { readSnowflakeConfigFromEnv } from '@/lib/snowflake-config'

export const runtime = 'nodejs'

export async function GET() {
  const envConfig = readSnowflakeConfigFromEnv()

  if ('error' in envConfig) {
    return Response.json({ isConfigured: false })
  }

  return Response.json({ isConfigured: true })
}