import { NextRequest } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'

const MAX_QUESTION_CHARS = 4000
const MAX_TITLE_CHARS = 80

function normalizeTitle(raw: string): string {
  const cleaned = raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'`]+/, '')
    .replace(/["'`]+$/, '')

  return cleaned.slice(0, MAX_TITLE_CHARS)
}

export async function POST(request: NextRequest) {
  let body: { question?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const question = body.question?.trim() ?? ''
  if (!question) {
    return Response.json({ error: 'Question is required' }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 })
  }

  const client = new OpenAI({ apiKey })

  try {
    const response = await client.responses.create({
      model: 'gpt-5-mini',
      instructions:
        'Generate a concise title from the user question only. Return plain text only with no punctuation wrappers or explanation. 3 - 6 words. Avoid using the words "question" or "ask". Describe the primary subject of the question',
      input: question.slice(0, MAX_QUESTION_CHARS),
      max_output_tokens: 24,
    })

    const title = normalizeTitle(response.output_text ?? '')
    if (!title) {
      return Response.json({ error: 'Failed to generate title' }, { status: 502 })
    }

    return Response.json({ title })
  } catch {
    return Response.json({ error: 'Failed to generate title' }, { status: 502 })
  }
}