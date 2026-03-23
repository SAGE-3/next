# Frontend Architecture

---

## Routes

```
/                         → Login
/home                     → Room/board browser
/home/room/:roomId        → Room view
/board/:roomId/:boardId   → Board canvas (main experience)
/admin                    → Admin panel
/enter/:roomId/:boardId   → Direct board join link
```

---

## Provider Tree

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

The board is **not** a `<canvas>` element — it uses **CSS transforms** on a 3M×3M `div`.

- **Zoom range**: 0.1× – 6×
- **Pan/zoom**: mouse wheel (Ctrl/Cmd = zoom, otherwise pan), touchpad (two-finger pan + pinch with deadzone and ratio clamping), touch screen (single-finger pan, two-finger pinch)
- **Local position**: `localBoardPosition: { x, y, scale }` tracked in local state, synced to UIStore after a **250ms debounce**
- **File**: `apps/webapp/src/app/pages/board/layers/background/BackgroundLayer.tsx`

`BackgroundLayer` uses a window-level `mousedown` capture listener (fires before all element handlers) to classify where each click lands (`board`, `board-actions`, `app`, `app-resize`, `other`) and gate board panning accordingly.

---

## AppWindow — Drag, Resize & Selection

**File**: `libs/applications/src/lib/components/AppWindow/AppWindow.tsx`

Each app is wrapped in `AppWindow` which implements drag and resize using the **native browser Pointer Capture API** (no third-party drag library):

- **Drag**: `handleDragPointerDown` calls `element.setPointerCapture(pointerId)` on the `.handle` overlay div. Pointer events continue even when the cursor leaves the element. Position committed to server **on pointerup** via `useAppStore.update()`.
- **Resize**: 8 directional handles rendered around the app when selected in lasso mode. Each handle uses its own pointer capture. Aspect ratio locking supported.
- **Size limits**: min 200×100 px, max 8192×8192 px
- **Grouped drag**: when the app is part of a lasso group, `updateAppLocationByDelta` moves all selected apps together.
- **Double-click on resize handle**: snaps the app edge/corner to the viewport boundary. Alt+double-click snaps to the full viewport.

### Resize visibility rule

Resize handles are only rendered when the app is **both selected and in lasso mode** (`primaryActionMode === 'lasso' && selected`). This avoids accidental resizes and improves performance by not rendering handles for every visible app.

---

## Lasso Selection Mode

**Files**:
- `apps/webapp/src/app/pages/board/layers/background/components/Lasso.tsx`
- `apps/webapp/src/app/pages/board/layers/ui/components/LassoToolbar.tsx`

Two distinct concepts:
- `primaryActionMode === 'lasso'` — the user's current tool mode (set in settings)
- `lassoMode` (UIStore) — `true` only while the user is actively dragging a rectangle

### How lasso selection works

When the user draws a rectangle on the Lasso SVG, the `DrawBox` component checks overlap between the rectangle and all board apps every frame (throttled 250ms). Apps that overlap are added to `selectedAppsIds`; apps that leave the rectangle are removed. `clickSelectedApps` (local state seeded at DrawBox mount) carries apps that were selected before the rectangle started.

### Shift interactions

- **Shift+draw on empty board**: if one app is already single-selected, it is seeded into the new lasso group before the rectangle starts. `BackgroundLayer` skips clearing `selectedAppId` on shift+mousedown to allow this.
- **Shift+click on an app in lasso mode**: toggles the app in/out of the lasso group via `addSelectedApp`/`removeSelectedApp` — handled in `AppWindow.handleAppClick`, checked before the `appWasDragged` guard to prevent the first click being swallowed by micro-movement.

### UIStore lasso functions

`addSelectedApp` deduplicates on add; `removeSelectedApp` uses filter (no mutation). Both update `selectedAppsIds`.

### LassoToolbar

Shown when `selectedAppsIds.length > 0`. Actions: zoom to fit, pin/unpin, duplicate, duplicate to another board, auto-layout (compact or rectangle), delete, download assets, save session, open in SageCell, open in Chat (AI), add tags.

A live count badge next to the "Actions" title shows how many apps are selected and their type (e.g. "3 Stickies", "6 Apps").

---

## Board Entry / Exit Lifecycle

**On entering** (`/board/:roomId/:boardId`):
1. Parallel: subscribe assets, presence, users
2. Sequential: rooms → boards → **apps (by boardId)** → insights → plugins → links
3. Update own presence, add to recent boards, clear selected app

**On leaving**:
1. `unsubBoard()` — unsubs from app updates; **auto-deletes the user's Screenshare apps**
2. Clear own presence
3. Unsub insights; remove event listeners

---

## Zustand Stores

One store per collection. Pattern: initial HTTP snapshot + WS subscription. Store patches array in-place on UPDATE messages.

Stores: `app`, `board`, `room`, `user`, `asset`, `presence`, `message`, `annotation`, `plugin`, `insight`, `link`, `ui`, `kernel`, `config`, `twilio`

**UIStore** (`libs/frontend/src/lib/stores/ui.ts`) is local-only (no WebSocket). Tracks:
- Canvas `scale`, `boardPosition`, `boardDragging`, `boardLocked`, `boardSynced`
- `selectedAppId` (single selected app), `selectedAppsIds` (lasso group)
- `lassoMode` (actively drawing rectangle), `primaryActionMode`
- `viewport`, `zIndex`, `appDragging`, `focusedAppId`

---

## WebSocket Client

**File**: `libs/frontend/src/lib/api/ws/api-socket.ts`

Singleton. Connects to `ws[s]://host/api`. Routes messages by `msg.id` to subscription callbacks or REST promise resolvers. **No automatic reconnect** — a dropped connection requires a page reload.

---

## Presence & Cursors

Cursor position tracked via **refs** in `CursorBoardPositionProvider` (zero re-renders). Presence updates sent on position change with no transport-level throttle.

Viewports (wall users): rendered in `Presence/Viewports.tsx`. Title bar and box both use native pointer capture for drag; corner handle for resize. Both elements move together during drag.

---

## User Settings

Persisted in `localStorage` under `'s3_user_settings'`. Includes: `showCursors`, `showViewports`, `showAppTitles`, `showLinks`, `primaryActionMode`, `aiModel` (`llama`|`openai`|`azure`), `uiScale`.

---

## Applications System

### How apps work

Each app is a self-contained module registered in a central map:

```typescript
{
  name: AppName;
  AppComponent: React.FC<AppProps>;
  ToolbarComponent: React.FC<AppProps>;
  GroupedToolbarComponent: React.FC<{ apps }>;
}
```

Apps read/write state via:
```typescript
const s = props.data.state as MyAppState;
updateState(props._id, { key: newValue });
updateStateBatch([{ id, state }]);
```

### Officially Supported Apps (21)

| App | Description |
|-----|-------------|
| AssetLink | Download button for an asset manager file |
| BoardLink | Miniature preview of another board with navigation |
| Calculator | Basic arithmetic with history |
| Chat | Real-time messaging + AI chat (multi-modal) |
| Clock | Current time for any timezone |
| CodeEditor | Collaborative multi-language code editor (Yjs) |
| CSVViewer | Tabular viewer for CSV files (virtually rendered) |
| DeepZoomImage | High-resolution tiled image viewer |
| Drawing | Collaborative drawing via TLDraw (Yjs) |
| ImageViewer | Image display with multi-resolution support |
| Map | Interactive map via MapGL with data layer overlays |
| Notepad | Rich-text collaborative editor (Yjs) |
| PDFViewer | PDF viewer for assets |
| Poll | Real-time voting with live result graphs |
| SageCell | Computational code cell backed by a Jupyter kernel |
| Screenshare | Screen/window sharing with auto quality adjustment |
| Stickie | Virtual sticky notes with color options |
| Timer | Synchronized countdown timer |
| VideoViewer | Web-compatible video playback |
| WebpageLink | URL metadata card with multiple open options |
| Webview | Embedded browser on the canvas |

> **`libs/applications` contains more code than this list.** Apps not listed are dead/unused — do not assume they work.

**AI-enabled**: `Chat`, `ImageViewer`, `PDFViewer`, `Stickie`, `CodeEditor`, `Webview`, `Map`, `SageCell`

**Yjs-backed** (require homebase-yjs): `Drawing`, `Notepad`, `CodeEditor`, `Annotations`

### Scaffolding a new app

```bash
nx workspace-generator newapp --name MyApp --username yourname --statetype string --statename myField --val ""
```

Automatically: copies template files, adds to `apps.json`, regenerates `apps.ts`, `types.ts`, `initialValues.ts`. Do not edit these generated files by hand.

### Plugin System

Third-party apps run in an `<iframe>` via `PluginApp`. Communication via `window.postMessage()`.

```typescript
const plugin = new SAGE3Plugin<MyState>();
plugin.subscribeToUpdates((state, userId) => { /* handle push */ });
plugin.update({ state: { myField: newValue } });
```
