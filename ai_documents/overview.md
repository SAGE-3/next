# SAGE3 Overview

## What is SAGE3?

SAGE3 is a web-based collaborative workspace. Users join **Rooms**, open **Boards** inside those rooms, and place **Apps** on those boards in real time. Apps range from sticky notes and PDF viewers to Jupyter notebooks, maps, and AI chat. Multiple users share the same board simultaneously with live cursor tracking and fully synchronized state.

---

## Repository Layout

```
next/
├── webstack/               # All TypeScript/Node/React code
│   ├── apps/
│   │   ├── homebase        # Main server (state, auth, WS) — port 3000
│   │   ├── homebase-files  # File server (upload/download) — port 3002
│   │   ├── homebase-yjs    # Yjs sync server — port 3001
│   │   └── webapp          # React frontend (served by homebase)
│   ├── libs/
│   │   ├── sagebase        # Redis abstraction + auth (SAGEBase)
│   │   ├── shared          # Shared types, schemas, constants
│   │   ├── applications    # All built-in app implementations
│   │   ├── frontend        # React hooks, Zustand stores, WS client
│   │   ├── backend         # Shared server utilities (collection base, permissions)
│   │   ├── sageplugin      # Plugin iframe messaging lib (npm-published)
│   │   └── workers         # BullMQ background job processors
│   └── clients/
│       ├── electron        # Electron desktop wrapper (Mac/Win/Linux)
│       ├── pycli           # Python CLI client
│       ├── cli             # Node CLI client
│       ├── csharp          # C# client (maintenance status unknown)
│       └── swift           # Swift client (maintenance status unknown)
├── seer/                   # Python AI service (FastAPI) — port 9999
├── foresight/              # Jupyter kernel proxy (Python)
├── sage_seer/              # LangGraph agent framework (Python, newer)
└── deployment/             # Docker/Kubernetes deployment configs
```

**Monorepo tooling**: NX 14 + Yarn. The team wants to remove NX but it is deeply embedded in the build pipeline.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 |
| Frontend state | Zustand |
| UI components | Chakra UI |
| Router | React Router v6 |
| Drag/resize | Native browser Pointer Capture API (custom implementation) |
| Collaborative drawing | TLDraw |
| Collaborative sync | Yjs (CRDT) |
| Build system | NX 14 + Webpack |
| Backend framework | Express.js |
| Database | Redis (document store via SAGEBase) |
| Query indexing | RediSearch |
| Job queue | BullMQ |
| Real-time | WebSockets (ws library) + Redis PubSub |
| Auth | Passport.js (guest, JWT RS256, Google, Apple, CILogon) |
| Permissions | CASL |
| File processing | sharp (images), pdfjs (PDFs), multer (uploads), exiftool (EXIF) |
| AI services | FastAPI + LangChain + LangGraph (Python) |
| Video | Twilio + WebRTC (signaling via homebase-yjs) |
| Desktop | Electron |
| Logging | Fluentd |
| Deployment | Docker / Kubernetes |
| Package manager | Yarn |

---

## Key Source Files

When touching any of these areas, read the file before making changes.

| File | Purpose |
|------|---------|
| `webstack/apps/homebase/src/main.ts` | Main server entry — startup sequence, WS auth |
| `webstack/apps/homebase/src/api/collections/` | All 13 collection definitions |
| `webstack/apps/homebase/src/api/routers/custom/` | Kernels proxy, agents proxy, NLP |
| `webstack/apps/homebase-files/src/main.ts` | File server entry |
| `webstack/apps/homebase-files/src/api/uploadHandler.ts` | Upload + BullMQ pipeline |
| `webstack/apps/homebase-yjs/src/main.ts` | Yjs + WebRTC server |
| `webstack/libs/sagebase/src/lib/core/SAGEBase.ts` | SAGEBase singleton |
| `webstack/libs/sagebase/src/lib/modules/database/SBCollection.ts` | Redis doc store |
| `webstack/libs/sagebase/src/lib/modules/auth/SBAuth.ts` | Auth + session setup |
| `webstack/libs/backend/src/lib/generics/SAGECollection.ts` | Collection base class |
| `webstack/libs/backend/src/lib/generics/SAGEWSRouter.ts` | WS dispatcher |
| `webstack/libs/backend/src/lib/generics/permissions.ts` | RBAC rules |
| `webstack/libs/backend/src/lib/utils/presence.ts` | Online/offline tracking |
| `webstack/libs/backend/src/lib/utils/subscription-cache.ts` | Per-socket sub tracking |
| `webstack/libs/shared/src/lib/types/` | All shared TypeScript types |
| `webstack/libs/shared/src/lib/types/server/serverconfig.ts` | ServerConfiguration type |
| `webstack/apps/webapp/src/app/pages/board/` | Board page (canvas, layers, lifecycle) |
| `webstack/apps/webapp/src/app/pages/board/layers/background/BackgroundLayer.tsx` | Pan/zoom, mouse routing |
| `webstack/apps/webapp/src/app/pages/board/layers/background/components/Lasso.tsx` | Lasso selection rectangle |
| `webstack/apps/webapp/src/app/pages/board/layers/ui/components/LassoToolbar.tsx` | Lasso group actions toolbar |
| `webstack/libs/applications/src/lib/components/AppWindow/AppWindow.tsx` | App drag/resize wrapper |
| `webstack/libs/applications/src/lib/apps/` | Individual app implementations |
| `webstack/libs/frontend/src/lib/stores/` | Zustand stores (one per collection) |
| `webstack/libs/frontend/src/lib/stores/ui.ts` | Local UI state (canvas, selection, lasso) |
| `webstack/libs/frontend/src/lib/api/ws/api-socket.ts` | WebSocket client singleton |
| `webstack/libs/frontend/src/lib/providers/useCursorBoardPosition.tsx` | Cursor coords |
| `webstack/libs/frontend/src/lib/providers/useUserSettings.tsx` | User preferences |
| `webstack/libs/sageplugin/src/lib/sageplugin.ts` | Plugin iframe lib |
| `webstack/sage3-dev.hjson` | Dev configuration |
| `seer/main.py` | AI service entry point |
