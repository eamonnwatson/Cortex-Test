# Answer Engine - Internal Quick Reference

## What This Is

Next.js internal chat UI that proxies prompts to a Snowflake Cortex Agent, streams SSE responses, renders mixed content blocks, and stores chat history in browser local storage.

## Request Lifecycle

1. User sends prompt on `/`.
2. App creates local chat record and navigates to `/chat/:id`.
3. Chat page posts message history to `POST /api/chat`.
4. API route calls Snowflake Agent `:run` endpoint with SSE headers.
5. Client parses stream events into text/thinking/table/chart/status blocks.
6. Final message is persisted to `localStorage`.

Title flow (first turn only): `POST /api/chat/title` (OpenAI `gpt-5-mini`) runs in parallel and updates title best-effort.

## API Endpoints

- `GET /api/chat/config`
  - Checks Snowflake env readiness.
  - Returns `{ isConfigured: boolean }`.

- `POST /api/chat`
  - Input: `{ messages: ApiMessage[] }`.
  - Sends only text blocks to Snowflake history.
  - Proxies SSE stream back to client.

- `POST /api/chat/title`
  - Input: `{ question: string }`.
  - Requires `OPENAI_API_KEY`.

## Required Environment Variables

Snowflake:

- `SNOWFLAKE_ACCOUNT_URL`
- `SNOWFLAKE_DATABASE`
- `SNOWFLAKE_SCHEMA`
- `SNOWFLAKE_AGENT_NAME`
- `SNOWFLAKE_AUTH_TOKEN`

Optional:

- `SNOWFLAKE_TOKEN_TYPE`
  - `PROGRAMMATIC_ACCESS_TOKEN` (default)
  - `OAUTH`
  - `KEYPAIR_JWT`

Title generation:

- `OPENAI_API_KEY`

## Client Storage

- `localStorage:cortex_chats` (newest first, max 100)
- `localStorage:cortex_theme_preference` (`system|light|dark`)
- `sessionStorage:pending_<chatId>` (home -> chat one-time prompt handoff)

## Stream Events (Normalized)

- `response.text.delta` -> `text`
- `response.thinking.delta` -> `thinking`
- `response.tool_result.analyst.delta` -> `thinking` + tracked SQL
- `response.table` -> `table`
- `response.chart` -> `chart`
- `response.status` -> `status`
- `response.suggested_queries` -> `suggestions`
- `response` or `[DONE]` -> `done`

## Key Files

- `app/chat/[id]/page.tsx` - chat state, send/stop, stream updates
- `app/api/chat/route.ts` - Snowflake proxy route
- `app/api/chat/config/route.ts` - readiness check
- `app/api/chat/title/route.ts` - first-turn title generation
- `lib/stream-parser.ts` - SSE parser
- `lib/snowflake-config.ts` - env validation
- `lib/store.ts` - local chat persistence

## Runbook Commands

```bash
pnpm install
pnpm dev
```

```bash
pnpm lint && pnpm build
```

## Fast Failure Checks

- Home input disabled: verify `GET /api/chat/config` and `SNOWFLAKE_*` env vars.
- 4xx/5xx from chat route: validate `SNOWFLAKE_ACCOUNT_URL`, token, and token type.
- No title updates: verify `OPENAI_API_KEY` (chat still works).
- Missing structured blocks: inspect incoming SSE events and parser mapping in `lib/stream-parser.ts`.
