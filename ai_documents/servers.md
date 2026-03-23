# The Three Server Processes

---

## 1. homebase — Main Server (port 3000)

**Entry**: `apps/homebase/src/main.ts`

### Startup sequence (exact order)

1. DNS order forced to IPv4-first; config loaded from hjson
2. Express app created with: trust proxy, cookie parser, JSON body (5 MB limit), Helmet, CORS, compression
3. HTTP server created; listens on `config.port`
4. **SAGEBase initialized** — Redis client created, all four modules started (see [sagebase.md](sagebase.md))
5. NLP model loaded (`SAGEnlp`)
6. **Collections loaded** (`loadCollections()`) — all 13 collections created in Redis; default "Main Room" and "Main Board" created if none exist; orphaned link cleanup set up (throttled 5 s)
7. Twilio configured (video tokens, 6-hour TTL)
8. HTTP router registered (authenticated endpoints for all collections)
9. **Two WebSocket servers created**:
   - `apiWebSocketServer` at `/api` — main API, authenticated
   - `logsServer` at `/logs` — log broadcast, no auth
10. **HTTP upgrade handler** intercepts WebSocket handshakes:
    - `/logs` — passed through directly
    - `/api` — if JWT enabled: extracts bearer token, verifies RS256, calls `SBAuthDB.findOrAddAuth()`; otherwise: checks `session.passport.user`; connection destroyed if auth fails

**Horizontal scaling**: Yes — all state is in Redis; multiple homebase instances share the same Redis cluster.

### Key routes

| Route | Purpose |
|-------|---------|
| `WS /api` | Main WebSocket (authenticated) — all CRUD + subscriptions |
| `WS /logs` | Log stream (no auth) |
| `GET /info` | Server metadata (no auth) |
| `GET /time` | Server time (no auth) |
| `/api/agents/*` | Proxy to Python seer service |
| `/api/kernels/*` | Proxy to foresight (Jupyter), supports SSE streaming |
| `/api/nlp` | NLP intent endpoint |

### How collection HTTP routes work

`sageRouter<T>(collection)` auto-generates an Express router for every collection with standard REST endpoints (`GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`). Each route runs `checkPermissionsREST(collection)` middleware before executing. Collections can add custom routes on top (e.g. `POST /apps/preview`).

### How WebSocket routing works

`wsAPIRouter()` parses the route string from the incoming message, matches it to a collection's `wsRouter()`, and calls `sageWSRouter<T>()` which dispatches based on `method` (POST / GET / PUT / DELETE / SUB / UNSUB).

---

## 2. homebase-files — File Server (port 3002)

**Entry**: `apps/homebase-files/src/main.ts`

Express server. SAGEBase initialized identically to homebase (same Redis, same auth). No WebSocket.

### Routes

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /api/files/:id/:token` | UUID v5 token | Download file by ID with signed token |
| `GET /api/files/download/:url` | None | Proxy-fetch remote URL |
| `POST /api/assets/upload` | Session/JWT | Multipart file upload |
| `GET /api/assets/*` | Session/JWT | Asset queries |

**UUID v5 tokens**: generated from `(fileId + config.namespace)` — stateless, verifiable without a database lookup.

### Upload pipeline

```
POST /api/assets/upload (multipart/form-data)
  → multer stores files to local filesystem
  → for each file:
      1. MetadataProcessor (BullMQ) — exiftool extracts EXIF, detects creation date
      2. ProcessFile (BullMQ):
           images → ImageProcessor — generates multiple thumbnail sizes (sharp)
           PDFs   → PDFProcessor  — converts pages to images (pdfjs)
           others → skipped
      3. MessageCollection.add() — progress notifications pushed to clients via WS
  → AssetsCollection.addBatch() — stores asset metadata to Redis
  → returns array of asset IDs
```

**File storage**: Local filesystem under `config.public`. No S3 or object storage — scaling homebase-files requires a shared filesystem mount.

**Communication back to homebase**: homebase-files writes directly to the shared Redis (same SAGEBase instance). No HTTP calls between the two servers. Clients subscribed to the ASSETS collection via homebase automatically receive the new asset documents.

**Horizontal scaling**: Yes in theory, but requires a shared filesystem for the uploaded files (e.g. NFS or S3 swap-in).

### BullMQ Workers (libs/workers)

Three sandboxed workers run in homebase-files, each as a `SandboxedJob` (isolated Node.js process):

**MetadataProcessor** (`workers/src/lib/metadata.ts`)
- Runs `exiftool-vendored` (max 2 processes) on every uploaded file
- Cleans up result: strips `ProfileDescription` keys, converts `ExifDateTime/ExifTime/ExifDate` to strings, removes `Cells` (notebooks) and `Features` (GeoJSON) to avoid huge payloads
- Writes a `<filename>.json` sidecar file alongside the upload
- Returns: `{ file, id, data (exif tags), result (json filename) }`

**ImageProcessor** (`workers/src/lib/image.ts`)
- SVG files are passed through unchanged (no rasterisation)
- All other images: uses `sharp` to generate **4 WebP versions** at fractional widths (1/8, 1/4, 1/2, full) capped at the 16383px WebP limit, plus one **full-size JPEG** at 95% quality
- Respects EXIF orientation via `.rotate()` before processing
- Returns: `{ filename, url (smallest WebP), fullSize (JPEG), width, height, aspectRatio, sizes[] }`
- The `url` field points to the smallest WebP — this is the default display resolution; `fullSize` is used when the user requests full quality

**PDFProcessor** (`workers/src/lib/pdf.ts`)
- Uses `pdfjs-dist` (legacy build) + `node-canvas` as the render backend
- For each page: renders at ~2500px on the long axis (scale clamped 1–8), then generates **multiple WebP resolutions** halving down to 500px minimum using lanczos2 resampling
- Also extracts all page text content and saves as `<filename>-text.json` — this is what the AI PDF analysis endpoint reads
- Returns: array of per-page size arrays with URLs and dimensions

---

## 3. homebase-yjs — Yjs Sync Server (port 3001)

**Entry**: `apps/homebase-yjs/src/main.ts`

Express server with SAGEBase initialized for auth only (no collection usage).

### Why it cannot scale horizontally

Yjs documents live **in-memory** inside the `y-websocket` library. There is no shared persistence backend (no Redis Yjs provider, no LevelDB). Two instances would maintain independent document states and diverge immediately. To make this scalable, a shared Yjs persistence adapter (e.g. `y-redis`) would need to be added.

### WebSocket endpoints

**`WS /yjs`** (authenticated):
- HTTP upgrade checks `session.passport.user`; rejects if no session
- `YUtils.setupWSConnection()` from y-websocket handles the Yjs sync protocol
- Document state is in-memory only — **not persisted across server restarts**

**`WS /rtc`** (⚠️ no authentication):
- Public endpoint — anyone who knows a room ID can connect
- In-memory `Map<roomId, WebSocket[]>` tracks connected sockets per room
- Message types: `join` (add to room), `pixels` (broadcast cursor/data to room), `leave` (remove from room)
- Cleanup on socket close removes from all rooms
- Used for WebRTC peer-to-peer signaling and cursor pixel sharing
