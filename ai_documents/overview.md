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
| Drag/resize | Native pointer capture API (custom implementation) |
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
