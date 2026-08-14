# Cortex Chat

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
- Per-user Snowflake connection settings saved locally in browser storage

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

Use the in-app settings modal and provide:

- Account URL
	- Example: `https://myaccount.snowflakecomputing.com`
	- Host-only values are accepted and normalized to HTTPS
- Database
- Schema
- Agent Name
- Token Type
	- `PROGRAMMATIC_ACCESS_TOKEN` (PAT)
	- `OAUTH`
	- `KEYPAIR_JWT`
- Auth Token

Notes:

- Configuration is stored in browser `localStorage`
- Theme preference is stored in browser `localStorage`
- The app sends requests from the Next.js API route to your Snowflake endpoint

## How Streaming Works

1. The chat page posts message history + Snowflake config to `POST /api/chat`.
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
- Config: `localStorage` key `cortex_config`
- Theme preference: `localStorage` key `cortex_theme_preference`
- Pending initial prompt handoff: `sessionStorage` key pattern `pending_<chatId>`

No server-side database is used by this app.

## Project Structure

```text
app/
	api/chat/route.ts        # Proxies chat requests to Snowflake Agent API
	chat/[id]/page.tsx       # Chat session page and streaming lifecycle
	page.tsx                 # Home screen + chat bootstrap
components/
	MessageBubble.tsx        # Renders text/thinking/table/chart blocks
	SettingsModal.tsx        # Snowflake configuration UI
	TableBlock.tsx           # Result tables + CSV copy/download + quick charts
	VegaChart.tsx            # Renders assistant-provided Vega-Lite specs
lib/
	stream-parser.ts         # SSE parser and normalized stream events
	store.ts                 # localStorage helpers for chats/config
	types.ts                 # Shared app types
```

## Troubleshooting

- Missing Snowflake settings
	- Open Settings and verify all fields are filled
- Invalid account URL
	- Use a valid Snowflake account host or full URL
- Snowflake auth failures
	- Verify token value and selected token type match
- No streamed response
	- Confirm network access to your Snowflake account and that the agent exists

## Development Notes

- The API route runs on Node.js runtime (`runtime = 'nodejs'`)
- Chat titles are derived from the first prompt (truncated)
- Suggested queries may arrive in multiple payload shapes and are normalized client-side
