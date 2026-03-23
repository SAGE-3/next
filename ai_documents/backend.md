# Backend Architecture

---

## The Three Server Processes

### 1. homebase — Main Server (port 3000)

**Entry**: `apps/homebase/src/main.ts`

Startup sequence (exact order):
1. DNS forced to IPv4-first; config loaded from hjson
2. Express with: trust proxy, cookie parser, JSON body (5 MB limit), Helmet, CORS, compression
3. HTTP server created and listening
4. **SAGEBase initialized** — Redis client, all four modules (database, pubsub, auth, logger)
5. NLP model loaded (`SAGEnlp`)
6. **Collections loaded** — all 13 created in Redis; default "Main Room" and "Main Board" created if none exist; orphaned link cleanup throttled at 5 s
7. Twilio configured (video tokens, 6-hour TTL)
8. HTTP router registered
9. **Two WebSocket servers**: `apiWebSocketServer` at `/api` (authenticated), `logsServer` at `/logs` (no auth)
10. **HTTP upgrade handler**: JWT path extracts bearer token, verifies RS256, calls `SBAuthDB.findOrAddAuth()`; session path checks `session.passport.user`; rejects on failure

Horizontally scalable — all state is in Redis.

Key routes:

| Route | Purpose |
|-------|---------|
| `WS /api` | Main WebSocket (authenticated) — all CRUD + subscriptions |
| `WS /logs` | Log stream (no auth) |
| `GET /info` | Server metadata (no auth) |
| `/api/agents/*` | Proxy to Python seer service |
| `/api/kernels/*` | Proxy to foresight (Jupyter), supports SSE streaming |
| `/api/nlp` | NLP intent endpoint |

`sageRouter<T>(collection)` auto-generates a standard REST router (`GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`) with `checkPermissionsREST()` middleware on each route.

---

### 2. homebase-files — File Server (port 3002)

**Entry**: `apps/homebase-files/src/main.ts`

Express server. SAGEBase initialized identically to homebase (same Redis, same auth). No WebSocket.

Routes:

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /api/files/:id/:token` | UUID v5 token | Download file |
| `POST /api/assets/upload` | Session/JWT | Multipart upload |
| `GET /api/assets/*` | Session/JWT | Asset queries |

**Download tokens**: UUID v5 generated from `(fileId + config.namespace)` — stateless, no DB lookup needed.

**Upload pipeline**:
```
POST /api/assets/upload
  → multer stores to local filesystem
  → MetadataProcessor (BullMQ) — exiftool extracts EXIF
  → ProcessFile (BullMQ):
       images → ImageProcessor — sharp generates 4 WebP sizes + 1 JPEG
       PDFs   → PDFProcessor  — pdfjs converts pages to multi-res WebP
  → AssetsCollection.addBatch() → writes to shared Redis → PubSub → clients
```

**File storage**: Local filesystem (`config.public`). No S3. Horizontal scaling requires a shared filesystem mount (e.g. NFS).

homebase-files writes directly to shared Redis — no HTTP calls between servers. Clients subscribed to ASSETS via homebase receive new documents automatically via PubSub.

---

### 3. homebase-yjs — Yjs Sync Server (port 3001)

**Entry**: `apps/homebase-yjs/src/main.ts`

Express + SAGEBase (auth only, no collections).

**`WS /yjs`** (authenticated): `y-websocket` handles the Yjs sync protocol. Documents are **in-memory only** — not persisted across restarts.

**`WS /rtc`** (⚠️ no authentication): WebRTC peer-to-peer signaling. In-memory `Map<roomId, WebSocket[]>`. Message types: `join`, `pixels`, `leave`. Anyone who knows a room ID can connect.

**Cannot scale horizontally** — Yjs documents live in-memory with no shared backend. Adding `y-redis` would be required.

---

## SAGEBase (libs/sagebase)

The team's own Redis wrapper. Initialized as a singleton on each server.

```
SAGEBase.init(config)
  ├── SBDatabase  — document storage + RediSearch indexing
  ├── SBPubSub    — event broadcasting across instances
  ├── SBAuth      — authentication + sessions
  └── SBLogger    — Fluentd integration
```

**Redis key structure**:
```
SAGE3:DB:APPS:<docId>      → JSON string (full document)
SAGE3:AUTH:SESS:<sessionId> → session data
index:APPS                 → RediSearch index on {roomId, boardId, type}
```

Every document has base fields: `_id`, `_createdAt`, `_updatedAt`, `_updatedBy`, `_createdBy`, `data: T`.

On every write, SBDatabase publishes a `{type, col, doc}` message to PubSub channel `SAGE3:PUBSUB:<COLLECTION>`. Each subscriber holds a **dedicated Redis connection** (`client.duplicate()`).

**Auth**: Sessions stored in RedisStore. Passport strategies: `guest`, `spectator`, `jwt` (RS256), `google`, `apple`, `cilogon`. All call `SBAuthDB.findOrAddAuth(provider, id, extras)`.

**Logging**: Fluentd via `SBLogger`. Level controlled by `config.fluentd.databaseLevel`: `all` (every read/write), `partial` (writes only), `none`.

---

## Backend Library (libs/backend)

### SAGE3Collection\<T\> — base class for all 13 collections

**File**: `libs/backend/src/lib/generics/SAGECollection.ts`

Wires together: `SBCollectionRef` (Redis ops), auto-generated Express router, WS handler, cascaded deletes (e.g. deleting a Room cascades to Boards then Apps).

CRUD: `add`, `addBatch`, `get`, `getBatch`, `getAll`, `query`, `update`, `updateBatch`, `delete`, `deleteBatch`, `deleteAll`

Subscriptions: `subscribe(id)`, `subscribeAll()`, `subscribeByQuery(field, value)`

### sageWSRouter\<T\> — WebSocket dispatcher

**File**: `libs/backend/src/lib/generics/SAGEWSRouter.ts`

Dispatches based on `method`: `POST` → add, `GET` → get/getAll, `PUT` → update, `DELETE` → delete, `SUB` → subscribeByQuery + store unsub in SubscriptionCache, `UNSUB` → retrieve + call unsub fn.

### Permissions (RBAC)

Role is derived from **auth provider name only** — there is no role field in the database.

| Provider | Role |
|----------|------|
| email in `config.admins` list | `admin` |
| `google`, `apple`, `jwt`, `cilogon` | `user` |
| `guest` | `guest` |
| `spectator` | `spectator` |

Checked via `SAGE3Ability.can(role, action, resource)` (CASL) on every HTTP and WS request.

### Presence — online/offline tracking

**File**: `libs/backend/src/lib/utils/presence.ts`

Redis TTL keys: `SAGE3:SOCKET:PRESENCE:<socketId>:<userId>` with 30-second TTL, refreshed every 15 s. Background check every 30 s scans for expired keys and marks users offline. Works across multiple homebase instances because Redis is shared.

---

## Data Model

### Collections (13 total)

| Collection | TTL | Cascade on delete |
|------------|-----|-------------------|
| APPS | — | — |
| BOARDS | — | Deletes APPS, ANNOTATIONS, INSIGHT |
| ROOMS | — | Deletes BOARDS, ASSETS, PLUGINS, ROOMMEMBERS |
| USERS | — | — |
| ASSETS | — | — |
| PRESENCE | — | — |
| MESSAGE | **60 s** | — |
| PLUGINS | — | — |
| ANNOTATIONS | — | — |
| LINKS | — | — |
| ROOMMEMBERS | — | — |
| INSIGHT | — | — |
| KERNEL | — | — |

MESSAGE TTL: used only for upload progress notifications, not for persistent messaging.

### Key schemas

**App** (most important):
```typescript
{
  title: string;
  roomId: string;
  boardId: string;
  position: { x, y, z };
  size: { width, height, depth };
  rotation: { x, y, z };
  type: AppName;        // 'Stickie' | 'PDFViewer' | 'Chat' | ...
  state: AppState;      // app-specific typed state
  raised: boolean;
  dragging: boolean;
  pinned: boolean;
  sourceApps?: string[];
}
```

**Room**: `{ name, description, color, ownerId, isPrivate, privatePin, isListed }`

**Board**: `{ name, description, color, roomId, ownerId, isPrivate, privatePin, code, whiteboardLines, executeInfo }`

**Presence**: `{ userId, roomId, boardId, cursor: {x,y}, viewport: {...}, status: 'online'|'offline', following: string }`

**Asset**: `{ originalfilename, mimetype, filename, fullpath, size, date, derived, metadata, room, owner }`

---

## Request Lifecycle Traces

### SUB — client subscribes to a board's apps

```
Client → WS: { id:'sub-1', route:'/api/apps', method:'SUB', body:{boardId:'board123'} }

homebase: socket.on('message') → wsAPIRouter() → AppsCollection.wsRouter()

SAGEWSRouter (SUB):
  checkPermissionsWS(user, 'SUB', 'APPS') ✓
  AppsCollection.subscribeByQuery('boardId', 'board123', callback)
  → SBCollection: redis.duplicate() → pSubscribe('SAGE3:DB:APPS:*')
  → filter docs where data.boardId === 'board123'
  cache.add('sub-1', [unsubscribeFn])
  → sends initial snapshot to client

Any future UPDATE to an APPS doc:
  SBDocumentRef writes to Redis
  SBPubSub publishes to SAGE3:PUBSUB:APPS
  subscriber callback fires → filters boardId match
  → socket.send({ id:'sub-1', event:{ type:'UPDATE', col:'APPS', doc:[...] } })

Client UNSUB:
  cache.delete('sub-1') → unsubscribeFn() → Redis connection closed
```

### PUT — client updates an app

```
Client → HTTP: PUT /api/apps/app123  body:{ 'state.position': {x:100,y:200} }

homebase: checkPermissionsREST('APPS') → SAGECollection.update()
  → SBDocumentRef.update():
      1. fetch SAGE3:DB:APPS:app123 from Redis
      2. merge patch into data field
      3. set _updatedAt, _updatedBy
      4. write back to Redis
      5. SBPubSub.publish('APPS', { type:'UPDATE', col:'APPS', doc:[updatedDoc] })

Redis PubSub broadcasts to ALL homebase instances
  → each instance's subscriber callbacks fire
  → push to matching subscribed WebSocket clients

HTTP response: 200 + updated document
```

### File upload

```
Client → POST /api/assets/upload (multipart)

homebase-files:
  multer → local filesystem
  MessageCollection.add('Uploading') → Redis → PubSub → clients notified
  for each file:
    MetadataProcessor BullMQ job → exiftool EXIF extraction
    ImageProcessor or PDFProcessor BullMQ job → thumbnails/page images
  MessageCollection.add('Assets Ready', close:true)
  AssetsCollection.addBatch() → Redis → PubSub → clients receive new assets

Response: { ids: ['asset-uuid-1', ...] }
```

---

## Horizontal Scaling

| Component | Scales? | Why |
|-----------|---------|-----|
| homebase | ✅ Yes | Stateless; all state in Redis |
| homebase-files | ⚠️ Partial | Scales compute, but requires shared filesystem |
| homebase-yjs | ❌ No | Yjs docs are in-memory, no shared backend |

Multiple homebase instances: each connects to same Redis; a write on Instance 2 triggers PubSub on all instances, which push to their own WebSocket clients. Sessions stored in Redis so any instance can validate any session.
