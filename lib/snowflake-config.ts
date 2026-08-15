import 'server-only'

export type SnowflakeTokenType = 'OAUTH' | 'KEYPAIR_JWT' | 'PROGRAMMATIC_ACCESS_TOKEN'

export interface SnowflakeEnvConfig {
  accountUrl: string
  database: string
  schema: string
  agentName: string
  authToken: string
  tokenType: SnowflakeTokenType
}

export function readSnowflakeConfigFromEnv():
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