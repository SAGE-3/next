# SAGEBase (libs/sagebase)

The team's own framework wrapping Redis. Initialized as a singleton on each server startup.

```
SAGEBase.init(config)
  ├── SBDatabase  — document storage
  ├── SBPubSub    — event broadcasting
  ├── SBAuth      — authentication + sessions
  └── SBLogger    — Fluentd integration
```

---

## SBDatabase — Redis document store

Redis key structure:
```
SAGE3:DB:APPS:<docId>    → JSON string (full document)
SAGE3:DB:BOARDS:<docId>  → JSON string
...
index:APPS               → RediSearch index on {roomId, boardId, type}
```

Each collection is a `SBCollectionRef` that:
- Generates UUIDs for new documents
- Merges `_id`, `_createdAt`, `_updatedAt`, `_createdBy`, `_updatedBy` into every document
- Supports field-based queries via RediSearch index
- Supports optional TTL (used by MESSAGE collection: 60-second auto-expiry)
- On every write, publishes a `{type, col, doc}` message to PubSub

---

## SBPubSub — broadcast layer

Channel naming: `SAGE3:PUBSUB:APPS`, `SAGE3:PUBSUB:BOARDS`, etc.

Each subscriber gets a **dedicated Redis connection** (`client.duplicate()`) with a pattern subscription to `SAGE3:DB:<COLLECTION>:*`. This is what enables cross-instance broadcasts — Instance 1 writes to Redis, Instance 2's PubSub subscriber fires and pushes to its connected WebSocket clients.

---

## SBAuth — authentication

**Session config**:
```
Store:      RedisStore at SAGE3:AUTH:SESS:<sessionId>
httpOnly:   true
secure:     true (production only)
sameSite:   'lax'
maxAge:     691200000 ms (8 days default)
```

**Passport strategies** (each configured independently in hjson):

| Strategy | Library | ID field | Notes |
|----------|---------|----------|-------|
| `guest` / `spectator` | custom | generated | Anonymous; spectator = read-only |
| `jwt` | passport-jwt (RS256) | `payload.sub` | Name from `payload.name`; external API use |
| `google` | passport-google-oauth20 | `profile.id` | Name, email, photo from profile |
| `apple` | passport-apple | `profile.id` | — |
| `cilogon` | passport-oauth2 | `profile.id` | Academic federation SSO |

All strategies call `SBAuthDB.findOrAddAuth(provider, id, extras)` which finds or creates the user document in Redis.

**OAuth callback flow**: provider redirects with `code` + `state` → Passport verifies → `req.logIn(user)` creates session → redirect to `/` (or `/login?error=...` on failure).

**⚠️ Auth fragility points**:
1. Session and JWT both work, but concurrent use of both in the same request can cause conflicts
2. Role is determined by **provider name only** (hardcoded in `permissions.ts`) — there is no per-user role stored in the database
3. The WebRTC endpoint (`/rtc`) has **zero authentication**
4. Changing a user's role requires changing their auth provider, not a role field

---

## SBLogger — Fluentd

Wraps Fluentd client. Log level controlled by `config.fluentd.databaseLevel`:
- `all` — logs every read, write, subscribe
- `partial` — logs writes only
- `none` — disabled
