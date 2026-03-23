# SAGE3 AI Documentation Index

> Written by analyzing the actual codebase (March 2026).
> Start here. Read the files relevant to your task rather than re-reading source code.

## Files

| File | What it covers |
|------|---------------|
| [overview.md](overview.md) | What SAGE3 is, repo layout, tech stack, key source files |
| [backend.md](backend.md) | Three servers, SAGEBase, data model, RBAC, request lifecycle, scaling |
| [frontend.md](frontend.md) | Board canvas, AppWindow drag/resize/lasso, Zustand stores, WS client, apps |
| [reference.md](reference.md) | Config reference, AI/Python services, known limitations & tech debt |

## One-paragraph summary

SAGE3 is a web-based collaborative workspace. Users join **Rooms**, open **Boards** inside those rooms, and place **Apps** on boards in real time. Three Node.js servers handle state/auth (`homebase`), file processing (`homebase-files`), and collaborative text/drawing sync (`homebase-yjs`). All state lives in Redis. The frontend is a React app where the board is a CSS-transformed 3M×3M div. Apps are dragged and resized using the native browser Pointer Capture API. Real-time sync uses WebSockets + Redis PubSub.

## Quick paths

- **Main server entry**: `webstack/apps/homebase/src/main.ts`
- **React entry**: `webstack/apps/webapp/src/main.tsx`
- **Shared types**: `webstack/libs/shared/src/lib/`
- **Zustand stores**: `webstack/libs/frontend/src/lib/stores/`
- **App implementations**: `webstack/libs/applications/src/lib/`
- **Dev config**: `webstack/sage3-dev.hjson`
