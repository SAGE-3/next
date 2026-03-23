# SAGE3 AI Documentation Index

> Written by analyzing the actual codebase (March 2026).
> Start here. Read the files relevant to your task rather than re-reading source code.

## Files in this folder

| File | What it covers |
|------|---------------|
| [overview.md](overview.md) | What SAGE3 is, repo layout, technology stack |
| [servers.md](servers.md) | The three server processes: homebase, homebase-files, homebase-yjs |
| [sagebase.md](sagebase.md) | SAGEBase — Redis abstraction, auth, PubSub, logging |
| [backend.md](backend.md) | Backend library — collections, WS router, RBAC, presence |
| [data_model.md](data_model.md) | All 13 collections, key schemas (App, Room, Board, etc.) |
| [frontend.md](frontend.md) | React app — board canvas, drag/resize, Zustand stores, WS client |
| [applications.md](applications.md) | App system — how apps work, the 21 supported apps, scaffolding |
| [request_lifecycle.md](request_lifecycle.md) | Full end-to-end traces for SUB, PUT, and file upload |
| [scaling_and_config.md](scaling_and_config.md) | Horizontal scaling, hjson configuration, Electron client |
| [tech_debt.md](tech_debt.md) | Known limitations, rough edges, and intentional shortcuts |
| [key_files.md](key_files.md) | Quick-reference map of the most important source files |

## Quick orientation

- **Main server entry**: `webstack/apps/homebase/src/main.ts`
- **React entry**: `webstack/apps/webapp/src/main.tsx`
- **All types/schemas**: `webstack/libs/shared/src/lib/`
- **Zustand stores**: `webstack/libs/frontend/src/lib/stores/`
- **App implementations**: `webstack/libs/applications/src/lib/`
- **Dev config**: `webstack/sage3-dev.hjson`

## The one-paragraph summary

SAGE3 is a web-based collaborative workspace. Users join **Rooms**, open **Boards** inside those rooms, and place **Apps** on boards in real time. Three Node.js servers handle state/auth (`homebase`), file processing (`homebase-files`), and collaborative text/drawing sync (`homebase-yjs`). All state lives in Redis. The frontend is a React app where the board is a CSS-transformed 3M×3M div. Apps are dragged and resized using native pointer capture APIs. Real-time sync uses WebSockets + Redis PubSub.
