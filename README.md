# Answer Engine

A lightweight Next.js chat UI for Snowflake Cortex Agents with streaming responses, reasoning blocks, tabular results, and chart rendering.

## Overview

This app provides:

- Multi-chat sidebar with persisted history (localStorage)
- Streaming assistant responses via Server-Sent Events (SSE)
- Theme preference support (`system`, `light`, `dark`) with SSR-safe hydration
- Structured blocks for:
	- plain text
	- thinking/reasoning deltas
	- SQL result tables
	- chart specs
- Markdown-style assistant text rendering (code fences, inline code, bold)
- Streaming status labels while events are in flight
- Suggested follow-up query chips that can be inserted back into the input
- Server-side Snowflake configuration via environment variables

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Recharts (table-derived charts)
- Vega / Vega-Lite / Vega-Embed (assistant-provided chart specs)

## Prerequisites

- Node.js 20+
- pnpm
- Access to a Snowflake Cortex Agent and an auth token
- Environment variables configured (see Environment Variables)

## Quick Start

Install dependencies:

```bash
pnpm install
```

Run the app:

```bash
pnpm dev
```

Open http://localhost:3000

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build production assets
- `pnpm start` - Run production server
- `pnpm lint` - Run ESLint

## Configure Snowflake

Set these environment variables for the Next.js server:

- `SNOWFLAKE_ACCOUNT_URL`
	- Example: `https://myaccount.snowflakecomputing.com`
	- Host-only values are accepted and normalized to HTTPS
- `SNOWFLAKE_DATABASE`
- `SNOWFLAKE_SCHEMA`
- `SNOWFLAKE_AGENT_NAME`
- `SNOWFLAKE_AUTH_TOKEN`
- `SNOWFLAKE_TOKEN_TYPE`
	- Allowed: `PROGRAMMATIC_ACCESS_TOKEN` (default), `OAUTH`, `KEYPAIR_JWT`

Notes:

- Snowflake credentials are read only on the server from environment variables
- Theme preference is still stored in browser `localStorage`
- The app sends requests from the Next.js API route to your Snowflake endpoint

## How Streaming Works

1. The chat page posts message history to `POST /api/chat`.
2. The API route calls Snowflake agent `:run` with `Accept: text/event-stream`.
3. The client parses streaming events and incrementally updates the UI.
4. Suggested queries are normalized from multiple payload shapes and surfaced as clickable follow-ups.

Supported stream event types include:

- `response.text.delta` -> text blocks
- `response.thinking.delta` -> thinking blocks
- `response.table` -> table blocks
- `response.chart` -> Vega-Lite chart blocks
- `response.status` -> transient streaming status text
- suggestion payloads (delta and aggregated forms)

## Data Storage

- Chats: `localStorage` key `cortex_chats` (latest first, capped to 100)
- Theme preference: `localStorage` key `cortex_theme_preference`
- Pending initial prompt handoff: `sessionStorage` key pattern `pending_<chatId>`

No server-side database is used by this app.

## Environment Variables

- `OPENAI_API_KEY`
	- Required for GPT-5 mini chat title generation
	- Title generation runs once per chat from the first user question only
	- The app keeps the initial question-derived title, then replaces it when OpenAI returns
- `SNOWFLAKE_ACCOUNT_URL`
- `SNOWFLAKE_DATABASE`
- `SNOWFLAKE_SCHEMA`
- `SNOWFLAKE_AGENT_NAME`
- `SNOWFLAKE_AUTH_TOKEN`
- `SNOWFLAKE_TOKEN_TYPE`
	- Optional
	- Defaults to `PROGRAMMATIC_ACCESS_TOKEN`

## Project Structure

```text
app/
	api/chat/route.ts        # Proxies chat requests to Snowflake Agent API
	api/chat/title/route.ts  # Generates first-turn chat title with OpenAI GPT-5 mini
	chat/[id]/page.tsx       # Chat session page and streaming lifecycle
	page.tsx                 # Home screen + chat bootstrap
components/
	MessageBubble.tsx        # Renders text/thinking/table/chart blocks
	SettingsModal.tsx        # Theme and UI settings
	TableBlock.tsx           # Result tables + CSV copy/download + quick charts
	VegaChart.tsx            # Renders assistant-provided Vega-Lite specs
lib/
	stream-parser.ts         # SSE parser and normalized stream events
	store.ts                 # localStorage helpers for chats
	types.ts                 # Shared app types
```

## Troubleshooting

- Missing Snowflake environment variables
	- Set required `SNOWFLAKE_*` variables before starting the app
- Invalid account URL
	- Use a valid value for `SNOWFLAKE_ACCOUNT_URL`
- Snowflake auth failures
	- Verify `SNOWFLAKE_AUTH_TOKEN` and `SNOWFLAKE_TOKEN_TYPE`
- No streamed response
	- Confirm network access to your Snowflake account and that the agent exists

## Development Notes

- The API route runs on Node.js runtime (`runtime = 'nodejs'`)
- Chat titles start from the first prompt and are auto-renamed once on first turn using GPT-5 mini
- Suggested queries may arrive in multiple payload shapes and are normalized client-side
