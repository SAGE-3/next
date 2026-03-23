# Frontend Architecture (webapp)

---

## Routes

```
/                         → Login
/home                     → Room/board browser
/home/room/:roomId        → Room view
/board/:roomId/:boardId   → Board canvas (main experience)
/admin                    → Admin panel
/createuser               → Account setup
/enter/:roomId/:boardId   → Direct board join link
```

---

## Provider tree

```
ChakraProvider
  UserSettingsProvider          (localStorage-persisted user prefs)
    AuthProvider
      UserProvider
        [Routes]
          BoardPage:
            CursorBoardPositionProvider   (cursor position via refs, zero re-renders)
              YjsProvider                 (Yjs connection for collaborative apps)
                [Apps on board]
```

---

## Board Canvas

The board is **not** a `<canvas>` element — it uses **CSS transforms** on a giant `Box` (div).

- **Board dimensions**: 3,000,000 × 3,000,000 pixels
- **Zoom range**: 0.1× – 6×
- **Pan/zoom**: mouse wheel (Ctrl/Cmd = zoom, otherwise pan), touchpad (two-finger pan + pinch), touch screen (single-finger pan, two-finger pinch with deadzone and ratio clamping)
- **State**: `localBoardPosition: { x, y, scale }` tracked locally, synced to UIStore after a **250ms debounce**
- **File**: `apps/webapp/src/app/pages/board/layers/background/BackgroundLayer.tsx`

---

## AppWindow & Drag/Resize

Each app on the board is wrapped in an `AppWindow` component that implements drag and resize using the **native browser Pointer Capture API** (no third-party drag library):

- Min size: 200×100 px; Max size: 8192×8192 px
- Drag/resize updates local `{pos, size}` state, then commits to the server **on drop** via `useAppStore.update()`
- Pointer capture (`element.setPointerCapture(pointerId)`) ensures drag events continue even when the pointer leaves the element
- Pinned apps skip position updates; locked board prevents all movement
- Selected apps show a blue border and raised z-index
- **File**: `libs/applications/src/lib/components/AppWindow/AppWindow.tsx`

---

## App Rendering

`Apps.tsx` throttles the app list (250ms), maps each to its registered component, wraps in `AppWindow` and `ErrorBoundary`. Apps are **memoized** to prevent re-renders when their data hasn't changed.

---

## Board Entry / Exit Lifecycle

**On entering** (`/board/:roomId/:boardId`):
1. Parallel: subscribe assets, presence, users
2. Sequential: rooms, boards (by roomId), **apps (by boardId)**, insights, plugins, links
3. Update own presence, add to recent boards, clear selected app

**On leaving**:
1. `unsubBoard()` — unsubs from app updates; **auto-deletes the user's Screenshare apps**
2. Clear own presence
3. Unsub insights; remove event listeners

---

## Zustand Stores

One store per collection. Pattern: initial HTTP snapshot + WS subscription. Store patches array in-place on UPDATE messages.

Stores: `app`, `board`, `room`, `user`, `asset`, `presence`, `message`, `annotation`, `plugin`, `insight`, `link`, `ui`, `kernel`, `config`, `twilio`

**UIStore** is local-only (no WebSocket): tracks canvas scale/position, selection, interaction flags, drawing state.

---

## WebSocket Client

**File**: `libs/frontend/src/lib/api/ws/api-socket.ts`

Singleton. Connects to `ws[s]://host/api`. Routes messages by `msg.id` to subscription callbacks or REST promise resolvers. **No automatic reconnect** — a dropped connection requires a page reload.

---

## Presence & Cursors

Cursor position tracked via **refs** in `CursorBoardPositionProvider` (zero re-renders). Presence updates sent on position change with no transport-level throttle.

---

## User Settings

Persisted in `localStorage` under `'s3_user_settings'`. Includes: `showCursors`, `showViewports`, `showAppTitles`, `showLinks`, `primaryActionMode`, `aiModel` (`llama`|`openai`|`azure`), `uiScale`.

---

## Toolbar & Context Menu

**App Toolbar**: shown when an app is selected; position draggable; per-app toolbar from Applications registry.

**Board Context Menu**: right-click triggered; auto-repositions if off-screen; sub-menus: Users, Screenshare, Applications, Plugins, Assets, Kernels, Navigation.
