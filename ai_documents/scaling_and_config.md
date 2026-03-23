# Horizontal Scaling & Configuration

---

## What scales and what doesn't

| Component | Scales? | Why |
|-----------|---------|-----|
| homebase | ✅ Yes | Stateless; all state in Redis |
| homebase-files | ⚠️ Partial | Scales compute, but requires shared filesystem for files |
| homebase-yjs | ❌ No | Yjs docs are in-memory with no shared backend |

## How multiple homebase instances coordinate

All instances connect to the same Redis. Because SBPubSub uses `pSubscribe` on each instance independently, a write on Instance 2 triggers PubSub callbacks on **all** instances including Instance 1 — which then pushes to its own connected WebSocket clients. Sessions are stored in Redis so any instance can validate any session.

## Presence across instances

Uses Redis TTL keys (30 s TTL, refreshed every 15 s). A background check every 30 s scans Redis for expired keys and marks offline users. Works correctly across instances because Redis is the shared source of truth.

---

## Configuration

`webstack/sage3-dev.hjson` / `webstack/sage3-prod.hjson`

```hjson
{
  production: false,
  port: 3000, port_yjs: 3001, port_files: 3002,
  serverName: "My SAGE3 Hub",
  root: "...", public: "...", assets: "...",

  redis:   { url: "redis://localhost:6379" },
  kernels: { url: "http://localhost:8888" },
  agents:  { url: "http://localhost:9999" },

  fluentd: { server, port, databaseLevel: "partial" },
  webserver: { logLevel: "partial", uploadLimit: "5GB" },

  services: {
    twilio: { accountSid, apiKey, apiSecret },
    openai: { apiKey, model, label },
    llama:  { url, model, apiKey, label, max_tokens },
    azure:  { text, embedding, transcription, reasoning, vision }
  },

  features: {
    plugins: true,
    apps: ["Stickie", "PDFViewer", ...]
  },

  auth: {
    sessionSecret: "...",
    sessionMaxAge: 691200000,
    strategies: ["guest", "jwt", "google"],
    admins: ["admin@example.com"],
    guestConfig:  { routeEndpoint: "/auth/guest" },
    googleConfig: { clientID, clientSecret, callbackURL },
    jwtConfig:    { issuer, audience, publicKey },
  },

  namespace: "uuid-v5-namespace-for-this-deployment"
}
```

---

## AI / Python Services

### seer/ — Main AI service (FastAPI, port 9999)

Proxied via homebase `/api/agents/*`. Uses LangChain.

| Endpoint | Purpose |
|----------|---------|
| `POST /ask` | Chat / general Q&A |
| `POST /code` | Code generation |
| `POST /image` | Image analysis (vision) |
| `POST /pdf` | PDF Q&A |
| `POST /web` | Web content analysis |
| `POST /webshot` | Screenshot analysis |
| `POST /mesonet` | Sensor/weather data queries |
| `GET /status` | Health check |

### foresight/ — Jupyter kernel proxy

Proxied via homebase `/api/kernels/*` with SSE streaming support. Used by SageCell.

### sage_seer/ — Advanced agent framework

Uses LangGraph for multi-step agents. Relationship to `seer/` unclear — may be replacement or parallel. Written by a different team member; not fully documented.

---

## Electron Client (clients/electron)

Wraps the React webapp in an Electron BrowserWindow:
- Configurable server URL; `sage3://` URI scheme for deep-linking to a room/board
- IPC bridge for screen capture, auto-update, bookmark storage, opt-in analytics, window state persistence
- UI scale mirrors `uiScale` user setting to native window zoom
- Launch args (via `commander`): server URL, room/board IDs
