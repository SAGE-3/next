# Reference: Config, AI Services & Known Limitations

---

## Configuration

**Files**: `webstack/sage3-dev.hjson` / `webstack/sage3-prod.hjson`

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
    sessionMaxAge: 691200000,   // 8 days
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

Proxied via homebase at `/api/agents/*`. Uses LangChain.

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

Proxied via homebase at `/api/kernels/*` with SSE streaming support. Used by SageCell.

### sage_seer/ — Advanced agent framework

Uses LangGraph for multi-step agents. Relationship to `seer/` unclear — may be a replacement or a parallel system. Written by a different team member; not fully documented.

---

## Electron Client (clients/electron)

Wraps the React webapp in an Electron BrowserWindow:
- Configurable server URL; `sage3://` URI scheme for deep-linking to a room/board
- IPC bridge for screen capture, auto-update, bookmark storage, opt-in analytics, window state persistence
- UI scale mirrors `uiScale` user setting to native window zoom
- Launch args (via `commander`): server URL, room/board IDs

---

## AI-Suggested Improvements

1. **WS auto-reconnect**: `api-socket.ts` has no reconnect logic. Adding exponential-backoff reconnect with subscription replay would eliminate the current requirement for a full page reload on dropped connections.

2. **PubSub message overhead**: Every write broadcasts to all subscribers regardless of relevance. A topic-per-board or delta-based approach would reduce overhead significantly at scale.

3. **Yjs horizontal scaling**: homebase-yjs stores documents in-memory. Adding a shared Yjs persistence backend (e.g. `y-redis`) would allow multiple instances and survive restarts.

4. **WebRTC endpoint authentication**: The `/rtc` endpoint in homebase-yjs has no authentication. Adding token verification consistent with `/yjs` would close the gap.

5. **Role storage**: Role is derived from auth provider name via a hardcoded map in `permissions.ts`. Storing role as a field on the user document would allow per-user role management without changing auth providers.

6. **Redis persistence**: Redis is the sole data store with no backup layer. Adding AOF/RDB persistence or a secondary replica would protect against data loss on restart.

7. **File storage portability**: homebase-files writes to local disk (`config.public`). Replacing this with an S3-compatible backend would simplify horizontal scaling and remove the shared filesystem requirement.

8. **Presence transport throttle**: Cursor/presence updates have no transport-level throttle — only application-level gating. A server-side rate limiter per client would reduce noise under high user counts.

9. **NX build system**: The build pipeline is tightly coupled to NX 14. Migrating to a lighter monorepo toolchain would simplify CI and local builds.
