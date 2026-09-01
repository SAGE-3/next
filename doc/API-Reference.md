# API Reference

SAGE3 provides two communication channels between clients and the server: a RESTful **HTTP API** and a **WebSocket API**. The HTTP API handles standard CRUD operations, while the WebSocket API enables real-time subscriptions and live updates.

- [HTTP API](#http-api) — RESTful endpoints for CRUD operations
- [WebSocket API](#websocket-api) — Real-time subscriptions and event streaming

---

# HTTP API

The API is built with Express.js and split into two tiers:

- **Public** — accessible without authentication
- **Protected** — requires a valid session cookie or JWT token (`Authorization: Bearer <token>`)

All protected responses share this envelope:

```json
{
  "success": true | false,
  "message": "Human-readable status",
  "data": [ ...documents ] | true | undefined
}
```

Each document in `data` follows the `SBDocument` shape:

```typescript
type SBDocument<T> = {
  _id: string;          // UUID
  _createdAt: number;   // Unix ms
  _createdBy: string;   // User ID
  _updatedAt: number;   // Unix ms
  _updatedBy: string;   // User ID
  data: T;              // Collection-specific payload
};
```

---

## Public Endpoints

### `GET /api/info`

Returns basic server information. No authentication required.

**Response:**
```json
{
  "serverName": "Hawaii",
  "port": 443,
  "production": true,
  "version": "1.4.0",
  "logins": ["google", "cilogon", "guest", "jwt"],
  "isSage3": true
}
```

| Field | Type | Description |
|---|---|---|
| `serverName` | string | Display name of the server |
| `port` | number | Port the server is running on |
| `production` | boolean | Whether this is a production deployment |
| `version` | string | SAGE3 server version |
| `logins` | string[] | Enabled login strategies |
| `isSage3` | boolean | Always `true` — used to verify a URL is a SAGE3 server |

---

### `GET /api/time`

Returns the current server time. No authentication required.

**Response:**
```json
{ "epoch": 1714256400000 }
```

| Field | Type | Description |
|---|---|---|
| `epoch` | number | Server time in milliseconds since Unix epoch |

---

### `GET /api/files/:id/:token`

Downloads a file asset by ID using a pre-computed UUIDv5 token. This endpoint makes assets publicly accessible without requiring a session.

The token is a UUIDv5 derived from the asset ID and the server's namespace secret. The frontend receives the `namespace` from `GET /api/configuration` and computes the token client-side using `uuidv5(assetId, namespace)` from the `uuid` package.

**Route parameters:**
- `id` — asset UUID
- `token` — UUIDv5 token

**Response:** The raw file content (`200`) or an error (`404`/`403`).

---

## Protected Endpoints

All endpoints below require authentication.

---

### `GET /api/info`

Public endpoint — no authentication required. Returns minimal server identity used by the Electron client to validate a server URL.

**Response:**
```json
{
  "serverName": "Hawaii",
  "production": true,
  "version": "1.4.0",
  "logins": ["google", "cilogon", "guest", "jwt"],
  "isSage3": true,
  "onlineUsers": 12
}
```

---

### `GET /api/configuration`

Returns the full server configuration for authenticated users. Includes the server `namespace` (needed to compute asset download tokens), enabled features, and AI service configuration.

**Response:**
```json
{
  "serverName": "Hawaii",
  "production": true,
  "version": "1.4.0",
  "namespace": "<uuid-v4>",
  "logins": ["google", "cilogon", "guest"],
  "admins": ["user-id-1"],
  "features": {
    "plugins": true,
    "apps": ["Chat", "SageCell", "Stickie", "Webview"]
  },
  "token": "<jupyter-token>",
  "openai": {},
  "llama": {},
  "azure": {},
  "fluentd": {},
  "veoServer": {}
}
```

| Field | Type | Description |
|---|---|---|
| `namespace` | string | Server UUID namespace for computing asset download tokens |
| `features.plugins` | boolean | Whether plugin uploads are enabled |
| `features.apps` | string[] | List of enabled application names |
| `token` | string | Jupyter kernel token (used by SageCell) |

---

## Collections

All collections share the same CRUD pattern. The examples below use `/api/apps` but the same methods apply to all collections: `/api/rooms`, `/api/boards`, `/api/users`, `/api/assets`, `/api/presence`, `/api/message`, `/api/plugins`, `/api/annotations`, `/api/links`, `/api/insight`, `/api/roommembers`.

---

### Applications (`/api/apps`)

Each application instance on a board is stored as a document in the `apps` collection.

**Schema:**
```typescript
type AppSchema = {
  title: string;
  roomId: string;
  boardId: string;
  position: { x: number; y: number; z: number };
  size: { width: number; height: number; depth: number };
  rotation: { x: number; y: number; z: number };
  type: AppName;     // e.g. "Stickie", "SageCell", "Map"
  state: AppState;   // App-specific data, varies by type
  raised: boolean;
};
```

#### `POST /api/apps` — Create one or more apps

Create a single app or a batch.

**Single:**
```json
{
  "title": "My Note",
  "roomId": "...",
  "boardId": "...",
  "position": { "x": 100, "y": 200, "z": 0 },
  "size": { "width": 400, "height": 300, "depth": 0 },
  "rotation": { "x": 0, "y": 0, "z": 0 },
  "type": "Stickie",
  "state": { "text": "Hello!", "color": "yellow", "fontSize": 24, "lock": false },
  "raised": true
}
```

**Batch:**
```json
{ "batch": [ <AppSchema>, <AppSchema>, ... ] }
```

**Response:** `{ "success": true, "data": [ <SBDocument<AppSchema>>, ... ] }`

---

#### `GET /api/apps` — Get all apps

Returns every app document on the server.

**Response:** `{ "success": true, "data": [ <SBDocument<AppSchema>>, ... ] }`

---

#### `GET /api/apps?roomId=<id>` — Query apps by field

Filter by a single field. Supported query fields: `roomId`, `boardId`, `type`.

**Response:** `{ "success": true, "data": [ <SBDocument<AppSchema>>, ... ] }`

---

#### `GET /api/apps/:id` — Get one app

**Response:** `{ "success": true, "data": [ <SBDocument<AppSchema>> ] }`

---

#### `PUT /api/apps/:id` — Update one app

Send only the fields you want to change.

**Request body:** Partial `AppSchema`

**Response:** `{ "success": true, "data": [ <SBDocument<AppSchema>> ] }`

---

#### `PUT /api/apps` — Batch update apps

**Request body:**
```json
{ "batch": [ { "id": "<app-id>", "update": <Partial<AppSchema>> }, ... ] }
```

**Response:** `{ "success": true, "data": true }`

---

#### `DELETE /api/apps/:id` — Delete one app

**Response:** `{ "success": true, "data": [ <SBDocument<AppSchema>> ] }`

---

#### `DELETE /api/apps` — Batch delete apps

**Request body:** `{ "batch": ["<id1>", "<id2>", ...] }`

**Response:** `{ "success": true, "data": true }`

---

### Rooms (`/api/rooms`)

**Schema:**
```typescript
type RoomSchema = {
  name: string;
  description: string;
  color: string;
  ownerId: string;
  isPrivate: boolean;
  privatePin: string;   // SHA-1 hashed PIN; empty string if not private
  isListed: boolean;    // Whether the room appears in the public room list
};
```

Supports all standard CRUD endpoints (`POST`, `GET`, `GET /:id`, `GET ?field=value`, `PUT /:id`, `PUT` batch, `DELETE /:id`, `DELETE` batch).

**Queryable fields:** `ownerId`

> Deleting a room also deletes all its boards, apps, assets, plugins, and room membership records.

---

### Boards (`/api/boards`)

**Schema:**
```typescript
type BoardSchema = {
  name: string;
  description: string;
  color: string;
  roomId: string;
  ownerId: string;
  isPrivate: boolean;
  privatePin: string;   // SHA-1 hashed PIN
  code: string;
  whiteboardLines: any; // Serialized whiteboard annotation data
  executeInfo: {
    executeFunc: string;
    params: any;
  };
};
```

Supports all standard CRUD endpoints.

**Queryable fields:** `roomId`, `ownerId`

---

### Users (`/api/users`)

**Schema:**
```typescript
type UserSchema = {
  name: string;
  email: string;
  color: string;
  profilePicture: string;
  userType: 'wall' | 'client';
  userRole: 'admin' | 'user' | 'guest' | 'spectator';
  savedBoards: string[];   // Array of board IDs the user has bookmarked
  recentBoards: string[];  // Recently visited board IDs
};
```

Supports all standard CRUD endpoints.

**Additional endpoints:**

#### `POST /api/users/create`
Creates a user record for the currently authenticated session. Called automatically on first login.

#### `POST /api/users/accountDeletion`
Deletes a user account. Can be called by the user themselves or by an admin.

**Request body:**
```json
{
  "id": "<user-id>",
  "deleteAllData": true
}
```
- `deleteAllData: true` — permanently deletes all the user's rooms, boards, apps, assets, and plugins.
- `deleteAllData: false` — transfers ownership of all content to the first admin account.

---

### Assets (`/api/assets`)

**Schema:**
```typescript
type AssetSchema = {
  file: string;              // Unique server filename (UUID-based)
  owner: string;             // User ID of uploader
  room: string;              // Room ID the asset belongs to
  originalfilename: string;  // Original filename at upload time
  path: string;              // Server storage directory
  dateCreated: string;
  dateAdded: string;
  mimetype: string;
  destination: string;
  size: number;              // File size in bytes
  metadata?: string;         // Path to JSON metadata file (EXIFTool output)
  derived?: ExtraImageType | ExtraPDFType | ExtraVideoType;
};
```

The `derived` field contains pre-processed data used by the viewer apps:
- **Images** → `ExtraImageType` with multiple resolution URLs and dimensions.
- **PDFs** → `ExtraPDFType` (array of pages, each an array of image resolutions).
- **Videos** → `ExtraVideoType` with dimensions, duration, framerate, codec info.

Supports all standard CRUD endpoints.

**Queryable fields:** `owner`, `room`

> Files are uploaded via `POST /api/assets/upload` on Homebase-Files (not this endpoint). This collection stores metadata only.

---

### Presence (`/api/presence`)

Presence documents track the live state of each connected user: their cursor position, viewport, and current board.

**Schema:**
```typescript
type PresenceSchema = {
  userId: string;
  status: 'online' | 'away' | 'offline';
  roomId: string;
  boardId: string;
  cursor: { x: number; y: number; z: number };
  viewport: {
    position: { x: number; y: number; z: number };
    size: { width: number; height: number; depth: number };
    selfUpdate: boolean;
  };
  following: string;      // ID of user being followed, empty if not following
  goToViewport: string;   // Triggers a viewport jump when set
};
```

Supports all standard CRUD endpoints.

> Presence updates are throttled server-side (~10 Hz) to reduce bandwidth.

---

### Messages (`/api/message`)

Board-level chat messages.

**Schema:**
```typescript
type MessageSchema = {
  userId: string;
  roomId: string;
  boardId: string;
  message: string;
  timestamp: number;
};
```

Supports all standard CRUD endpoints.

**Queryable fields:** `roomId`, `boardId`

---

### Plugins (`/api/plugins`)

Plugin app metadata. Only available when `features.plugins: true` is set in the server config.

**Schema:**
```typescript
type PluginSchema = {
  name: string;
  description: string;
  ownerId: string;
  roomId: string;
  filename: string;   // ZIP file stored on server
  dateCreated: string;
  size: number;
};
```

Supports all standard CRUD endpoints.

---

### Annotations (`/api/annotations`)

Whiteboard drawing strokes on a board.

**Schema:**
```typescript
type AnnotationSchema = {
  boardId: string;
  roomId: string;
  data: any;   // Serialized stroke data
};
```

---

### Links (`/api/links`)

App-to-app property links created by the Linker app.

**Schema:**
```typescript
type LinkSchema = {
  boardId: string;
  roomId: string;
  appId1: string;
  appId2: string;
  label: string;
};
```

---

### Insights (`/api/insight`)

AI analysis results attached to apps or assets.

---

### Room Members (`/api/roommembers`)

Tracks which users are members of which rooms. Used for access control on private rooms.

---

## AI Agent Endpoints (`/api/agents`)

These endpoints proxy requests to the Seer AI service. All require authentication.

| Endpoint | Method | Description |
|---|---|---|
| `POST /api/agents/ask` | POST | General AI chat query |
| `POST /api/agents/code` | POST | Code assistance |
| `POST /api/agents/image` | POST | Image analysis |
| `POST /api/agents/web` | POST | Web page summarization |
| `POST /api/agents/webshot` | POST | Screenshot a URL and return as image |
| `POST /api/agents/pdf` | POST | PDF document analysis |
| `POST /api/agents/mesonet` | POST | Hawaii sensor data queries |

---

## Kernel Endpoints (`/api/kernels`)

Manage Jupyter kernel sessions for SageCell.

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/kernels` | GET | List all running kernels |
| `POST /api/kernels` | POST | Create a new kernel |
| `DELETE /api/kernels/:id` | DELETE | Shut down a kernel |
| `POST /api/kernels/:id/interrupt` | POST | Interrupt a running kernel |

---

# WebSocket API

SAGE3 uses a single persistent WebSocket connection per client for all real-time communication. The connection is established at `wss://<server>/api` after authentication.

All CRUD operations available over HTTP can also be sent over WebSocket, and subscriptions are WebSocket-only.

---

## Connecting

The WebSocket endpoint is `wss://<server-host>/api`.

Authentication is handled via the session cookie established during login. The connection is rejected if the user is not authenticated.

```javascript
const socket = new WebSocket('wss://sage3.example.com/api');
```

---

## Message Format

Every message sent to or received from the server is a JSON-encoded object.

### Client → Server

```typescript
type APIClientWSMessage = {
  id: string;    // A unique ID for this message (use a UUID/nanoid)
  route: string; // e.g. "/api/apps", "/api/apps/<id>"
  method: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'SUB' | 'UNSUB';
  body?: Record<string, unknown> | { batch: any[] | string[] };
};
```

### Server → Client (REST response)

```json
{
  "id": "<same-id-as-request>",
  "success": true,
  "message": "Successfully retrieved documents.",
  "data": [ ... ]
}
```

### Server → Client (Subscription event)

```json
{
  "id": "<subscription-id>",
  "event": {
    "col": "APPS",
    "type": "CREATE" | "UPDATE" | "DELETE",
    "doc": { "_id": "...", "_createdAt": 0, "data": { ... } }
  }
}
```

---

## Sending CRUD Over WebSocket

Any HTTP CRUD operation can be sent over the WebSocket instead. The `route` mirrors the HTTP path and `method` mirrors the HTTP verb:

```json
{
  "id": "abc123",
  "route": "/api/apps",
  "method": "GET"
}
```

```json
{
  "id": "def456",
  "route": "/api/apps/5cbfca4c-3636-47a7-a368-57ebe7443818",
  "method": "PUT",
  "body": { "state": { "text": "Updated text" } }
}
```

---

## Subscriptions

Subscriptions receive live `CREATE`, `UPDATE`, and `DELETE` events for a collection or document. The subscription stays active until explicitly unsubscribed or the WebSocket closes.

### Subscribe to a collection

```json
{
  "id": "sub-001",
  "route": "/api/apps",
  "method": "SUB"
}
```

All future `CREATE`, `UPDATE`, and `DELETE` events for any document in `apps` will be sent to the client with `"id": "sub-001"`.

### Subscribe to a single document

```json
{
  "id": "sub-002",
  "route": "/api/apps/5cbfca4c-3636-47a7-a368-57ebe7443818",
  "method": "SUB"
}
```

### Subscribe to a filtered query

```json
{
  "id": "sub-003",
  "route": "/api/apps?boardId=678c900a-e9fd-4448-b370-84aed6bf3766",
  "method": "SUB"
}
```

### Unsubscribe

Send `UNSUB` with the same `id` used when subscribing:

```json
{
  "id": "sub-001",
  "route": "/api/apps",
  "method": "UNSUB"
}
```

---

## Composite Subscriptions

SAGE3 provides two special subscription routes that bundle multiple collections into a single subscription for efficiency.

### Subscribe to a Room and all its Boards and Apps

```json
{
  "id": "room-sub",
  "route": "/api/subscription/rooms/<roomId>",
  "method": "SUB"
}
```

This single subscription fires events for the room document, all boards in the room, and all apps in the room.

### Subscribe to a Board and all its Apps

```json
{
  "id": "board-sub",
  "route": "/api/subscription/boards/<boardId>",
  "method": "SUB"
}
```

---

## Subscribable Collections

All collections support WebSocket subscriptions:

`/api/apps`, `/api/boards`, `/api/rooms`, `/api/users`, `/api/assets`, `/api/presence`, `/api/message`, `/api/plugins`, `/api/annotations`, `/api/links`, `/api/insight`, `/api/roommembers`
