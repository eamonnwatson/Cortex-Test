export interface TextBlock {
  type: 'text'
  text: string
}

export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
}

export interface TableBlock {
  type: 'table'
  columns: string[]
  rows: (string | number | null)[][]
  sql?: string
  title?: string
}

export interface ChartBlock {
  type: 'chart'
  // Vega-Lite specification serialized as a JSON string
  chartSpec: string
}

export type ContentBlock = TextBlock | ThinkingBlock | TableBlock | ChartBlock

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: ContentBlock[]
  timestamp: number
  isStreaming?: boolean
  streamingStatus?: string
}

export interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface SnowflakeConfig {
  accountUrl: string
  database: string
  schema: string
  agentName: string
  authToken: string
  tokenType: 'OAUTH' | 'KEYPAIR_JWT' | 'PROGRAMMATIC_ACCESS_TOKEN'
}
