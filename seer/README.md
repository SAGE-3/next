# Seer

Seer is SAGE3's AI proxy service.
It is not just an MCP server.
Seer is the FastAPI service that sits between the SAGE3 frontend/backend and external AI providers, then returns both human-readable answers and structured SAGE3 actions.

Today, Seer is responsible for:

- chat-style AI requests from SAGE3
- code-generation and code-refactor responses
- image-related AI workflows
- PDF question-answering
- web scraping and web screenshot workflows
- Mesonet-specific data workflows
- a local read-only MCP endpoint for board inspection and future approval-driven actions
- an Alfred-focused planning route that uses board-aware tools and returns approval-gated actions

## How Seer Fits Into SAGE3

At startup, Seer:

- loads environment variables from `.env`
- creates a `PySage3` client so it can read SAGE3 rooms, boards, apps, assets, and config
- initializes Fluentd AI logging
- instantiates its agent modules from `app/`
- starts a FastAPI application on port `9999`
- mounts a local MCP endpoint at `/mcp/`

In practice, Seer is the service that lets SAGE3 ask things like:

- "answer this question in chat"
- "summarize or refactor this code"
- "analyze this PDF"
- "look at this website"
- "generate board-ready follow-up apps"

The frontend or backend can then decide whether to apply any returned `actions`.

## Core Responsibilities

### 1. AI Proxy

Seer hides provider-specific details behind one SAGE3-facing API.
The incoming request usually specifies a `model` such as `openai`, `azure`, or `llama`, and Seer routes that request to the configured backend for that agent.

### 2. Board-Aware Responses

Most Seer request types include a SAGE3 `Context` object from [libs/localtypes.py](./libs/localtypes.py) with:

- previous questions and answers
- cursor or insertion position on the board
- `roomId`
- `boardId`

That context is what lets Seer respond in a board-aware way instead of acting like a generic chatbot.

### 3. Action Proposals

Seer does not only return plain text.
Many agents also return an `actions` array that SAGE3 can apply later, usually as `create_app` actions for things like Stickies, Markdown, or other board apps.

This is an important part of the current design:

- Seer proposes
- SAGE3 decides whether to apply
- the frontend/backend executes through normal SAGE3 paths

### 4. Local MCP Surface

Seer now also exposes a local MCP server at `/mcp/`.
The current MCP surface is intentionally read-only and is meant for local development plus future approval-driven AI workflows.

## Service Layout

### Entry Point

- [main.py](./main.py): FastAPI app setup, agent construction, route registration, MCP mount, and lifecycle wiring

### Agents

- [app/chat.py](./app/chat.py): general chat responses with optional SAGE3 action proposals
- [app/code.py](./app/code.py): code help, refactors, and code-oriented action proposals
- [app/image.py](./app/image.py): image-related AI workflows
- [app/pdf.py](./app/pdf.py): PDF understanding and follow-up content generation
- [app/web.py](./app/web.py): website extraction and screenshot-based workflows
- [app/mesonet.py](./app/mesonet.py): Mesonet-specific workflows
- [app/mcp_server.py](./app/mcp_server.py): local MCP tool server
- [app/summary.py](./app/summary.py): present in the codebase, but the route is currently disabled in `main.py`

### Shared Types and Helpers

- [libs/localtypes.py](./libs/localtypes.py): request and response schemas
- `libs/utils.py`: model/provider config helpers and parsing utilities
- `libs/ai_logging.py`: Fluentd logging setup and LangChain logging hooks

## Current HTTP Routes

Seer currently exposes these FastAPI routes from [main.py](./main.py):

| Route | Method | Purpose |
| --- | --- | --- |
| `/status` | `GET` | basic health/status check |
| `/ask` | `POST` | general chat and action proposal flow |
| `/mcp-agent` | `POST` | Alfred board-planning flow using board-aware tools and approval-gated actions |
| `/code` | `POST` | code generation/refactor flow |
| `/image` | `POST` | image-related AI flow |
| `/mesonet` | `POST` | Mesonet-specific data flow |
| `/pdf` | `POST` | PDF analysis flow |
| `/web` | `POST` | webpage extraction and analysis |
| `/webshot` | `POST` | webpage screenshot workflow |
| `/mcp/` | MCP Streamable HTTP | local read-only MCP endpoint |

Notes:

- the summary route exists in code but is currently commented out
- `/mcp/` is mounted as a sub-application and should be used with the trailing slash

## Request and Response Shapes

The main request/response contracts live in [libs/localtypes.py](./libs/localtypes.py).

Common patterns:

- `Question`, `CodeRequest`, `ImageQuery`, `PDFQuery`, `WebQuery`, and `MesonetQuery` are the incoming payloads
- most responses include `r`, `success`, and `actions`
- the Alfred planning response also includes `toolCalls` so the UI can show the planning/process trace

That means Seer is best understood as both:

- an AI answer service
- a structured action proposal service

## AI Providers

Seer currently wires provider/model settings through SAGE3 config plus environment variables loaded at startup.
The agent code supports provider selection per request using values like:

- `openai`
- `azure`
- `llama`

Availability depends on the configured keys, URLs, and model names visible to `pysage3` and the local Seer environment.

## Local Development

### Prerequisites

Before starting Seer locally, make sure:

- your local SAGE3 services are running and reachable
- the required provider credentials are configured in your local environment
- Python dependencies are installed

Seer creates its `PySage3` client during import/startup, so if the local SAGE3 stack is unavailable, startup or later tool calls can fail.

### Install Dependencies

```bash
./.venv/bin/pip install -r requirements.txt
```

### Run Seer

Development:

```bash
./dev.sh
```

Production-style local run:

```bash
./prod.sh
```

Direct Python entrypoint:

```bash
./.venv/bin/python main.py
```

By default, Seer listens on:

```text
http://127.0.0.1:9999
```

### Current MCP Support

The local MCP server is mounted at:

```text
http://127.0.0.1:9999/mcp/
```

Current MCP tools:

- `get_rooms`
- `get_boards`
- `get_apps`

Current MCP scope:

- read-only
- no delete tools
- no arbitrary mutation tools
- intended for local inspection and future approval-driven AI workflows

### Alfred Planning Route

Seer also exposes a non-MCP HTTP route for Alfred:

```text
http://127.0.0.1:9999/mcp-agent
```

This route is different from the mounted MCP server:

- `/mcp/` is the actual MCP endpoint
- `/mcp-agent` is the Alfred-facing AI planning route

Current behavior:

- uses the configured OpenAI or Azure chat model
- uses board-aware read tools, biased toward the current board
- returns a human-readable response
- returns `toolCalls` so Alfred can show the process used
- returns proposed `actions` for the user to apply
- does not execute deletes
- currently supports safe planning for Stickie creation on the current board

### Test MCP Locally With Inspector

You can inspect the MCP server locally with MCP Inspector:

```bash
npx -y @modelcontextprotocol/inspector
```

Connect it to:

```text
http://127.0.0.1:9999/mcp/
```

### Quick Python MCP Smoke Test

```bash
./.venv/bin/python - <<'PY'
import anyio
from mcp.client.streamable_http import streamablehttp_client
from mcp.client.session import ClientSession

async def main():
    async with streamablehttp_client("http://127.0.0.1:9999/mcp/") as streams:
        read_stream, write_stream, get_session_id = streams
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            tools = await session.list_tools()
            print([tool.name for tool in tools.tools])

anyio.run(main)
PY
```

## Important Notes

- Seer is a service for SAGE3, not a standalone product.
- The MCP server is only one part of Seer.
- The current MCP work is Step 1: local, read-only inspection.
- Write actions should continue to go through normal SAGE3 approval and execution paths.
- Web workflows depend on browser tooling initialized by the web agent.
- Some routes can generate SAGE3 app-creation actions even when they do not directly mutate the board themselves.
