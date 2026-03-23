# Data Model

## Base document shape

All documents share a base shape:

```typescript
{
  _id: string;          // UUID
  _createdAt: number;   // epoch ms
  _updatedAt: number;   // epoch ms
  _updatedBy: string;   // user ID
  _createdBy: string;   // user ID
  data: T;              // collection-specific payload
}
```

---

## Collections (13 total)

| Collection | TTL | Cascade on delete | Queryable fields |
|------------|-----|-------------------|-----------------|
| APPS | — | — | roomId, boardId, type |
| BOARDS | — | Deletes APPS, ANNOTATIONS, INSIGHT | roomId |
| ROOMS | — | Deletes BOARDS, ASSETS, PLUGINS, ROOMMEMBERS | — |
| USERS | — | — | — |
| ASSETS | — | — | file, room, owner |
| PRESENCE | — | — | userId |
| MESSAGE | **60 s** | — | userId |
| PLUGINS | — | — | — |
| ANNOTATIONS | — | — | boardId |
| LINKS | — | — | boardId |
| ROOMMEMBERS | — | — | roomId |
| INSIGHT | — | — | boardId |
| KERNEL | — | — | — |

---

## Key schemas

### App — most important document type

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

### Room

```typescript
{ name, description, color, ownerId, isPrivate, privatePin, isListed }
```

### Board

```typescript
{ name, description, color, roomId, ownerId, isPrivate, privatePin, code, whiteboardLines, executeInfo }
```

### Presence

```typescript
{ userId, roomId, boardId, cursor: {x,y}, viewport: {..}, status: 'online'|'offline', following: string }
```

### Asset

```typescript
{ originalfilename, mimetype, filename, fullpath, size, date, derived, metadata, room, owner }
```

### Message

```typescript
{ type, payload, close, userId }
```
TTL 60 s — used only for upload progress notifications, not for persistent messaging.
