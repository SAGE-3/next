# Applications System (libs/applications)

---

## How apps work

Each app is a self-contained module registered in a central map:

```typescript
{
  name: AppName;
  AppComponent: React.FC<AppProps>;
  ToolbarComponent: React.FC<AppProps>;
  GroupedToolbarComponent: React.FC<{ apps }>;
}
```

Apps read/update state via:
```typescript
const s = props.data.state as MyAppState;
updateState(props._id, { key: newValue });        // single app
updateStateBatch([{ id, state }]);                // multiple apps
```

---

## Officially Supported Apps (21)

| App | Description |
|-----|-------------|
| AssetLink | Download button for an asset manager file |
| BoardLink | Miniature preview of another board with navigation |
| Calculator | Basic arithmetic with history |
| Chat | Real-time messaging + AI chat (multi-modal) |
| Clock | Current time for any timezone |
| CodeEditor | Collaborative multi-language code editor |
| CSVViewer | Tabular viewer for CSV files (virtually rendered) |
| DeepZoomImage | High-resolution tiled image viewer |
| Drawing | Collaborative drawing via TLDraw (Yjs-backed) |
| ImageViewer | Image display with multi-resolution support |
| Map | Interactive map via MapGL with data layer overlays |
| Notepad | Rich-text collaborative editor (Yjs-backed) |
| PDFViewer | PDF viewer for assets |
| Poll | Real-time voting with live result graphs |
| SageCell | Computational code cell backed by a Jupyter kernel |
| Screenshare | Screen/window sharing with auto quality adjustment |
| Stickie | Virtual sticky notes with color options |
| Timer | Synchronized countdown timer |
| VideoViewer | Web-compatible video playback |
| WebpageLink | URL metadata card with multiple open options |
| Webview | Embedded browser on the canvas |

> **`libs/applications` contains more code than this list.** Apps not listed here are dead/unused — do not assume they work.

**AI-enabled** (can send context to Seer): `Chat`, `ImageViewer`, `PDFViewer`, `Stickie`, `CodeEditor`, `Webview`, `Map`, `SageCell`

**Yjs-backed** (require homebase-yjs): `Drawing`, `Notepad`, `CodeEditor`, `Annotations`

---

## Scaffolding a new app (tools/generators)

An NX generator automates all the boilerplate for adding a new app:

```bash
nx workspace-generator newapp
# or with args:
nx workspace-generator newapp --name MyApp --username yourname --statetype string --statename myField --val ""
```

What it does automatically:
1. Copies template files into `libs/applications/src/lib/apps/<AppName>/`
2. Adds the app name to `libs/applications/src/lib/apps.json`
3. Regenerates `apps.ts` — the central `Applications` registry map
4. Regenerates `types.ts` — the `AppState` and `AppName` union types
5. Regenerates `initialValues.ts` — the default state for each app

**Important**: `apps.ts`, `types.ts`, and `initialValues.ts` are **generated files** — do not edit them by hand. They are rebuilt from `apps.json` by the generator. If you add an app manually without the generator, run `nx workspace-generator regen` afterward to sync these files.

---

## Plugin System (libs/sageplugin)

Third-party apps run inside an `<iframe>` in a `PluginApp` instance. Communication via `window.postMessage()`.

```typescript
const plugin = new SAGE3Plugin<MyState>();
plugin.subscribeToUpdates((state, userId) => { /* handle push */ });
plugin.update({ state: { myField: newValue } });
```

Lifecycle: PluginApp created → iframe loads → parent sends `type:'init'` → plugin subscribes → plugin sends `type:'update'` → SAGE3 broadcasts to all clients.
