export interface TextBlock {
  type: 'text'
  text: string
}

export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
  isComplete?: boolean
}

export interface ToolUseBlock {
  type: 'tool'
  toolUseId: string
  name: string
  isComplete?: boolean
  semanticModel?: string
  sql?: string
  semanticModelPath?: string
  executedSql?: string
}

export interface TableColumn {
  name: string
  type?: string
  precision?: number
  scale?: number
}

export interface TableBlock {
  type: 'table'
  columns: TableColumn[]
  rows: (string | number | null)[][]
  sql?: string
  title?: string
}

export interface ChartBlock {
  type: 'chart'
  // Vega-Lite specification serialized as a JSON string
  chartSpec: string
}

export type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | TableBlock | ChartBlock

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: ContentBlock[]
  suggestedQueries?: string[]
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
