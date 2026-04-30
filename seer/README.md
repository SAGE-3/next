# Seer

Seer is SAGE3's AI proxy and board-aware agent service.

It sits between SAGE3 and external model providers, then returns:

- human-readable answers
- structured `actions` that SAGE3 can apply through normal app/store paths
- tool-call trace data for the SEER UI

The current direction is a **Seer-managed agent tool system**. Seer owns the tool list, runs those tools against live SAGE3 data, and sends the tool results back into the model loop before returning an approval-ready response.

## What Seer Does

Seer currently handles:

- general chat-style AI requests
- board-aware SEER planning requests
- code-generation and code-refactor workflows
- image analysis
- PDF question answering
- webpage extraction and screenshot workflows
- Mesonet-specific workflows

## How It Fits Into SAGE3

At startup, Seer:

- loads environment variables from `.env`
- creates a `PySage3` client
- initializes Fluentd AI logging
- instantiates the agent modules under `app/`
- starts the FastAPI service on port `9999`

For SEER board requests, the flow is:

1. the frontend sends a request to `/seer`
2. Seer gives the model a scoped set of board-aware tools
3. the model requests tool calls
4. Seer executes those tools against live SAGE3 state
5. Seer returns text, tool trace, and proposed `actions`
6. the user reviews and applies the actions in SAGE3

That means the model does the reasoning, but Seer controls the actual data access and action proposal shape.

## Service Layout

- [main.py](./main.py): FastAPI setup, agent construction, and route registration
- [app/seer/agent.py](./app/seer/agent.py): SEER's board-aware planning loop and tool-calling orchestration
- [app/seer/tools.py](./app/seer/tools.py): request-scoped SEER tools for board, scope, layout, asset, and planning actions
- [app/seer/helpers.py](./app/seer/helpers.py): shared formatting, filtering, and planning helpers for the SEER route
- [app/inspection.py](./app/inspection.py): shared room/board/app summarization helpers used by SEER tools
- [app/chat.py](./app/chat.py): general chat responses with optional SAGE3 action proposals
- [app/code.py](./app/code.py): code help and code-oriented action proposals
- [app/image.py](./app/image.py): image-related workflows
- [app/pdf.py](./app/pdf.py): PDF understanding and follow-up content generation
- [app/web.py](./app/web.py): website extraction and screenshot workflows
- [app/mesonet.py](./app/mesonet.py): Mesonet-specific workflows
- [libs/localtypes.py](./libs/localtypes.py): shared request/response schemas
- `libs/utils.py`: provider/model config helpers and error parsing
- `libs/ai_logging.py`: Fluentd logging setup and LangChain logging hooks

## Current HTTP Routes

Seer currently exposes these FastAPI routes from [main.py](./main.py):

| Route | Method | Purpose |
| --- | --- | --- |
| `/status` | `GET` | basic health/status check |
| `/seer` | `POST` | board-aware SEER planning flow using scoped tools and approval-gated actions |
| `/ask` | `POST` | general chat and action proposal flow |
| `/code` | `POST` | code generation/refactor flow |
| `/image` | `POST` | image-related AI flow |
| `/mesonet` | `POST` | Mesonet-specific data flow |
| `/pdf` | `POST` | PDF analysis flow |
| `/web` | `POST` | webpage extraction and analysis |
| `/webshot` | `POST` | webpage screenshot workflow |

Notes:

- the summary route exists in code history but is currently disabled
- `/seer` is the primary board-assistant route

## Request and Response Shapes

The main request/response contracts live in [libs/localtypes.py](./libs/localtypes.py).

Common patterns:

- most incoming requests include a `Context` with previous Q/A, cursor position, `roomId`, and `boardId`
- most responses include `r`, `success`, and `actions`
- the SEER planning response also includes `toolCalls` so the UI can show how the answer was produced

This makes Seer both:

- an AI answer service
- a structured action-planning service

## SEER Planning Route

The `/seer` route is the main board assistant path.

It is designed around:

- current-board awareness
- current selection/focus awareness
- asset-aware inspection
- planning rather than direct mutation
- approval-gated `create_app` and `update_app` actions

The current SEER tool layer includes patterns such as:

- inspecting rooms, boards, and apps
- inspecting the current board or current scope
- computing layout bounds
- analyzing selected asset-backed apps
- planning stickie creation
- planning single-app and multi-app updates

Seer re-queries live board state on the backend and only falls back to client-provided app context when needed as a safety net.

## Model Providers

Seer reads provider/model configuration from SAGE3 config plus the local environment.

The board-planning SEER route currently supports:

- `openai`
- `azure`

If an unsupported provider is selected for the SEER route, Seer returns a clear error message instead of trying to guess.

## Local Development

### Prerequisites

Before starting Seer locally, make sure:

- your local SAGE3 services are running and reachable
- the required provider credentials are configured in your local environment
- Python dependencies are installed

Seer creates its `PySage3` client during startup, so if the local SAGE3 stack is unavailable, startup or later tool calls can fail.

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

Useful endpoints during local development:

```text
http://127.0.0.1:9999/status
http://127.0.0.1:9999/docs
http://127.0.0.1:9999/seer
```

## Current Design Principles

- Seer proposes; SAGE3 applies
- no delete path for SEER-planned actions
- tool access is scoped and explicit
- the model never gets raw database access
- user approval stays in the loop for board changes

That keeps the assistant useful without turning it into a direct data mutation surface.
