# Backend Library (libs/backend)

Shared utilities used by all three servers.

---

## SAGE3Collection\<T\> — base class for all 13 collections

**File**: `libs/backend/src/lib/generics/SAGECollection.ts`

Every collection (Apps, Boards, Rooms, etc.) extends this. It wires together:
- A `SBCollectionRef` (Redis operations)
- An auto-generated **Express router** via `sageRouter<T>()`
- A **WebSocket handler** via `sageWSRouter<T>()`
- Cascaded deletes (e.g. deleting a Room cascades to its Boards, then Apps)

CRUD methods: `add`, `addBatch`, `get`, `getBatch`, `getAll`, `query`, `update`, `updateBatch`, `delete`, `deleteBatch`, `deleteAll`

Subscription methods: `subscribe(id)`, `subscribeAll()`, `subscribeByQuery(field, value)`

---

## sageWSRouter\<T\> — WebSocket dispatcher

**File**: `libs/backend/src/lib/generics/SAGEWSRouter.ts`

Handles all six WS methods:
- `POST` → `collection.add()`
- `GET` → `collection.get()` or `collection.getAll()`
- `PUT` → `collection.update()`
- `DELETE` → `collection.delete()`
- `SUB` → parses query params, calls `collection.subscribeByQuery()`, stores unsub fn in SubscriptionCache
- `UNSUB` → retrieves unsub fn from SubscriptionCache, calls it (closes Redis subscriber connection)

---

## SubscriptionCache — per-connection subscription tracking

**File**: `libs/backend/src/lib/utils/subscription-cache.ts`

Created fresh for each WebSocket connection. Maps `messageId → [unsubscribeFn]`. On `UNSUB` or socket close, all stored functions are called, closing their dedicated Redis connections. This is how the system avoids Redis connection leaks.

---

## Permissions (RBAC)

**File**: `libs/backend/src/lib/generics/permissions.ts`

Role derived from auth provider:

| Provider | Role |
|----------|------|
| `admin` (config list) | `admin` |
| `google`, `apple`, `jwt`, `cilogon` | `user` |
| `guest` | `guest` |
| `spectator` | `spectator` |

Roles are checked via `SAGE3Ability.can(role, action, resource)` (CASL rules engine from `@sage3/shared`) **on every HTTP and WS request**.

---

## SocketPresence — online/offline tracking

**File**: `libs/backend/src/lib/utils/presence.ts`

Uses Redis TTL keys to detect disconnected users across multiple homebase instances:

- On connect: `SAGE3:SOCKET:PRESENCE:<socketId>:<userId>` set with 30-second TTL; Presence document set to `status:'online'`
- Every 15 s: key refreshed (keepalive)
- On disconnect: key deleted immediately
- Background check every 30 s (`AllUserCheck`): for every user with `status:'online'`, scans for their Redis keys — if none found (all expired), sets `status:'offline'`

This works across instances because Redis is shared.
