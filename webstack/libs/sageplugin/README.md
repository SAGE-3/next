# SAGEPlugin — API 1

`@sage3/sageplugin` 0.1.0 lets browser extensions contribute board commands, app toolbar/context-menu commands, keyboard shortcuts, local panels, overlays, and persistent custom board apps. Use the SDK rather than SAGE3's DOM, cookies, stores, or backend endpoints.

This is the first release of the manifest-based SDK. Legacy plugin packages do not run. Existing board apps and saved data remain. The SDK has no `S3`, `frameElement`, `subscribeToUpdates`, or `update` compatibility interfaces.

## Build the library and examples

Use Node.js 22.13+ in the 22.x series, or Node.js 24, with the workspace dependencies installed. From `webstack/`:

```sh
yarn nx build sageplugin
npm pack ./dist/libs/sageplugin --pack-destination /tmp
node libs/sageplugin/examples/reading/build.cjs
node libs/sageplugin/examples/study-notes/build.cjs
```

The library artifact lives in `dist/libs/sageplugin`: CommonJS `index.js`, `index.d.ts` and their `lib/` modules, the reusable builder, package metadata, and this README. Examples, starter sources, tests, and repository configs are not shipped. `yjs` and `y-textarea` are runtime dependencies; TypeScript, webpack, and JSZip support the installed builder. No publish step is needed or performed.

The example ZIPs are `dist/plugins/sage-reading.zip` and `dist/plugins/study-notes.zip`. Both accept an optional output path and `--watch`:

```sh
node libs/sageplugin/examples/study-notes/build.cjs /tmp/study-notes.zip --watch
```

Upload a ZIP through **Plugins → Upload**. The room owner enables it for the current board after reviewing its capabilities. Uploading alone does not run code. The owner can explicitly opt into auto-approval of future uploads by this package's uploader on this board within the approved capability set. Additional capabilities need fresh consent. Watch only rebuilds the local ZIP; it does not upload, change permissions, or bypass consent.

Reading adds page-linked notes and bookmarks. Select a PDF before selecting its text. Study notes demonstrates collaborative card bodies, flashcards, comparison, source navigation, and portable import/export using explicit app/link/asset identity remapping. Both use the installed SDK import name, with a source alias supplied only by their repository build wrappers.

### Study notes and portable boards

Choose **New note card**, **New flashcards**, or **New comparison table** explicitly from the board menu. The card's in-view double-click and **edit note** command open its app-bound editor. Card metadata is field-patched; its body is one Yjs text document shared by the editor, card renderer, and **quote into note card** command. Quote provenance uses idempotent native links, not a second remembered link list.

**Export or import board** packages `board.json`, original asset binaries, and referenced PDF page previews in a downloadable ZIP. `ui.download` hands the blob to the host under `downloads.write`; use its visible save confirmation if prompted. An acknowledgement means the host accepted the download, not proof that the browser saved a file. Import uploads those binaries through the host, creates apps in the current installation, and remaps board/installation/app/asset/link identities—including SDK document references inside note text—before restoring metadata, text, and board state. Asset names are display labels, never identity matches. New Yjs documents receive exported plaintext; CRDT client identities are not copied.

Cards use `{assetId, page?}` for polaroid images, and body lines `img: ASSET_ID | caption | ZERO_BASED_PAGE` for figures (omit the page for an original image). These read scoped blobs through the host and display local object URLs. PDF reference chips use the SDK's structured document-reference formatter/parser; ordinary HTTP(S) links use `ui.openUrl`.

Unsupported apps remain named in export/import diagnostics. SageCells are never executed or recreated through REST. Native Notepads export their saved plain-text Delta; rich formatting is explicitly reported as non-portable, and embedded non-text content is unsupported. Close or save active edits before exporting. Imports retain already-created records if a later operation fails and report the failure rather than silently dropping it.

Example regression checks (from `webstack/`):

```sh
node --test libs/sageplugin/examples/reading/source.test.cjs libs/sageplugin/examples/study-notes/portable.test.cjs
```

## Independent starter from a local tarball

The `starter/` directory is a complete shared-note extension. Copy it outside the repository and install the tarball built above; do not install the SDK source directory:

```sh
# From webstack/, after the build and pack commands above:
cp -R libs/sageplugin/starter /tmp/sage3-shared-note
cd /tmp/sage3-shared-note
npm install --save-exact /tmp/sage3-sageplugin-0.1.0.tgz
npm run build
npm run watch
```

The explicit tarball install replaces the starter's `0.1.0` dependency with the local file dependency, without requiring a published release. The starter imports only `@sage3/sageplugin`, contains no repository aliases or relative SDK imports, and gets all build dependencies through that package. Its output is `dist/shared-note.zip`. Stop watch with Ctrl+C; upload the ZIP, enable it, then choose **New shared note** from the board menu. The app binds its textarea to shared Yjs text and provides **Save now** to await acknowledgement. Change the manifest ID before distributing a distinct extension.

### Reusable builder

The installed package exposes `sageplugin-build` and the CommonJS subpath `@sage3/sageplugin/build`. The CLI reads `sageplugin.config.cjs` from the current directory, or a file passed with `--config`:

```js
module.exports = {
  entries: ['controller', 'note'],
  assets: ['manifest.json', 'controller.html', 'note.html', 'style.css'],
  output: 'dist/my-extension.zip',
};
```

Entry names are relative paths without `.ts`; each emits the matching `.js` path. List static files or directories explicitly; directory contents are included recursively. Include `manifest.json` and every declared HTML entry. Use relative URLs in HTML/CSS, and import JavaScript dependencies from TypeScript so webpack bundles them locally. Dependencies must be installed in the extension project; the builder does not download code. Static assets may not collide with bundled output, and symlink assets are rejected.

```sh
npx sageplugin-build
npx sageplugin-build /tmp/my-extension.zip --watch
npx sageplugin-build --config ./sageplugin.config.cjs
```

The builder typechecks the reachable TypeScript graph, emits it, bundles all entries for browsers, and packages static assets and generated chunks. It uses sorted ZIP paths, fixed timestamps/permissions, and deterministic webpack IDs. Failed builds retain the last good ZIP. Watch debounces file changes and serializes complete builds; Ctrl+C/SIGTERM closes watchers and allows an active build to clean up its temporary files. It watches extension sources/static assets, not `node_modules`; restart after dependency or build-configuration changes. It intentionally does not provide an upload server or automatic reload.

For scripts, `build(options)` returns the ZIP path; `watchBuild(options)` returns an async close function; `run(options)` adds the optional output argument and `--watch` CLI handling. `root` defaults to the working directory. Repository wrappers alone supply `sdkSource: '../../src/index.ts'`; independent projects must omit that option and use the installed SDK.

## Local host prerequisites

An extension ZIP is not a standalone web page: it needs SAGE3's authenticated host handshake. Use an existing configured local SAGE3 instance. Do not replace signing keys, weaken guest roles, or change another developer's secrets/config to make a demo run.

- **Redis:** use Redis Stack with RedisJSON, not bare Redis. Existing `deployment/docker-compose-backend-amd64.yml` and `-arm64.yml` define the development Redis service. Start only the services you need, for example `docker compose -f deployment/docker-compose-backend-amd64.yml up -d redis-server` from the repository root. The servers must use the same configured Redis instance and credentials. Plugin JSON revisions and Yjs snapshots are persisted there.
- **Services:** existing `yarn homebase`, `yarn homebase-files`, and `yarn homebase-yjs` scripts in `webstack/` run the three local services. Do not also start containerized files/Yjs servers on the same ports. `yarn stage` is the existing full build/staging mechanism for the webapp served by homebase; it clears `dist`, so stage before building the SDK/example artifacts you want to retain.
- **One proxy origin:** prefer the built webapp through the existing deployment-style proxy. Route `/plugins`, `/auth`, ordinary `/api` traffic and the app shell to homebase (3000); `/api/assets/plugins`, `/api/assets/upload`, `/api/assets/static`, and `/api/files` to homebase-files (3002); `/yjs` and `/rtc` with WebSocket upgrades to homebase-yjs (3001). Preserve authentication cookies and headers. Both deployment Compose architectures and `apps/webapp/proxy.conf.json` contain these routes. `yarn webapp` uses the latter for development, but webpack-dev-server origin validation can reject opaque sandbox-origin requests; do not weaken the sandbox to bypass that. A raw homebase origin without the files/Yjs routes is incomplete.
- **Keys and authentication:** services must share the already provisioned JWT public/private key setup and compatible auth/session configuration. Sign in using an enabled non-guest strategy (for example configured LDAP/OIDC). Guest and spectator sessions are read-only, not suitable for plugin upload, approval, app writes, or asset uploads. Existing `webstack/keys/genJWT.js` is an operator tool for configured JWT clients, not a browser-auth bypass; never commit or paste generated tokens. See the repository developer guide and `deployment/README.md` for the existing auth setup.
- **Permissions:** use a room and board where the signed-in user has the native app/asset permissions required by the example. Only the current room owner can grant board approval and its optional future-upload policy. A configured non-guest account does not imply room ownership.

A missing Redis module, mismatched keys, read-only account, or missing proxy route must be fixed in the operator's existing environment, not worked around inside the extension. Use disposable local data for concurrency and import/export exercises.

## Manifest

The ZIP contains `manifest.json` at its root (the host also accepts a single enclosing directory) and all referenced HTML, scripts, styles, and assets. Package dependencies locally; CDN script imports, direct network calls, workers, nested frames, server code, unrestricted WebAssembly, and eval are unavailable. HTTPS stylesheets and fonts may be linked, for example web fonts. Packages are limited to 50 MB compressed, 100 MB expanded, and 10,000 entries; the host validates paths, the manifest, and HTML entries before installation.

```json
{
  "id": "reading-tools",
  "apiVersion": 1,
  "name": "Reading tools",
  "description": "Shared reading bookmarks",
  "entry": "controller.html",
  "capabilities": ["apps.read", "documents.read", "documents.navigate"],
  "commands": [
    {
      "id": "bookmark",
      "title": "Save this page",
      "placements": ["toolbar", "context-menu"],
      "target": { "appTypes": ["PDFViewer"] }
    },
    {
      "id": "show-bookmarks",
      "title": "Bookmarks",
      "placements": ["board-menu"],
      "action": { "type": "panel", "viewId": "bookmarks" }
    }
  ],
  "views": [
    {
      "id": "bookmarks",
      "title": "Bookmarks",
      "kind": "panel",
      "scope": "board",
      "entry": "panel.html",
      "width": 440
    }
  ]
}
```

Commands use `toolbar`, `context-menu`, and/or `board-menu` placements. `target` is either `{appTypes: [...]}` or `{viewIds: [...]}`; view IDs match only this installation's own PluginApp views. The same eligibility predicate is checked at dispatch. Optional shortcuts use the same command and avoid ordinary text inputs. Commands without `action` call `onCommand`; built-in `{type: 'panel', viewId}`, `{type: 'create', viewId}`, and `{type: 'overlay', viewId}` actions open a panel, create an app, or toggle a targeted overlay without a handler.

Views are `app`, `panel`, or `overlay`. Panels are modeless: the board remains usable while a panel is open. They require `scope: 'board' | 'app'`; app panels stay bound to a real matching app ID when local selection changes, not a caller-supplied context snapshot. Overlays and app panels can declare targets. Declaring a view never creates a menu entry: add an explicit command. Panel/overlay visibility is local UI, while custom app content belongs to the shared board.

## SDK

```ts
import { SAGE3Plugin } from '@sage3/sageplugin';

const plugin = new SAGE3Plugin();

plugin.on('error', (error) => console.error(error));
plugin.onCommand('bookmark', async (context) => {
  if (!context.document || !context.app) {
    throw new Error('Select a PDF first.');
  }

  await plugin.request('state.patch', {
    changes: [
      {
        op: 'set',
        path: ['bookmark'],
        value: {
          appId: context.app._id,
          assetId: context.document.assetId,
          page: context.document.page,
        },
      },
    ],
  });
});

plugin.on('state', (snapshot) => console.log(snapshot.revision, snapshot.value.bookmark));

await plugin.ready;
```

Requests resolve after acknowledgement and reject on failure. Command failures are reported by the host; local async handler/channel errors emit `error`. Call `dispose()` when removing an SDK instance. Protocol types are readonly; validate/narrow your own JSON values before consuming them.

Context contains board/room/selection, capability-filtered app/document data, command position, local viewport position/size/scale, and host theme colors/fonts. With `apps.read`, `appOrder` lists this client's rendered app windows back to front, preserving DOM order for equal z-indices and including focused/background windows. Without that capability it is empty. Context events track paint-order changes as well as local theme and viewport changes; the order is not a persisted or cross-client stacking model. Command positions are board coordinates. PDF pages are zero-based; page navigation is shared. Selected text and normalized rectangles remain local unless explicitly saved.

When `apps.create` omits `position`, the host uses SAGE3's native placement rules near the command position or viewport center, avoiding other apps when space is available. An explicit position is preserved.

| Operation | Scope and permission |
| --- | --- |
| `context.get` | Current live context, with capability-filtered app/document details. |
| `state.get`, `state.patch` | This extension's board JSON namespace; returns `{revision, value}`. |
| `apps.list` | Current board app records; `apps.read`. |
| `apps.create` | Safe native adapters require `apps.write`; own declared PluginApp creation does not, but still requires native POST APPS permission. |
| `apps.update`, `apps.remove` | Native/common app updates/removal; `apps.write` plus native permissions. Not a PluginApp content write path. |
| `app.content.get`, `app.content.patch` | Own plugin app content; omit `appId` for the bound app, or identify another own app on this board. |
| `links.list`, `links.create`, `links.remove` | Current-board links; `links.read` / `links.write` plus native permissions. |
| `annotations.list` | All committed shapes from the current board's live Yjs document, including offscreen shapes; `annotations.read`. |
| `documents.navigate` | Shared in-range PDF page navigation; `documents.navigate`. |
| `assets.list`, `assets.read` | Room-scoped metadata / original Blob or derived zero-based PDF page image; `assets.read` plus native GET ASSETS. |
| `assets.upload` | `{name, data: Blob}` → asset metadata; `assets.write` plus native POST ASSETS; maximum 50 MB input. |
| `ui.openUrl` | Host-mediated HTTP(S) link opening; `urls.open`; a visible host confirmation supplies the required user gesture. |
| `ui.download` | Host-mediated Blob download; `downloads.write`; browser save confirmation may be needed after asynchronous preparation. |
| `ui.panel.open`, `ui.panel.close` | Own declared local panel; app panels bind by `appId`. |
| `text.get` | Named SDK plaintext documents on current-board PluginApps; other extensions' apps require `apps.read`. Own-app reads do not. |
| `text.apply` | Own-plugin app text only, with native PUT APPS permission; read/write capabilities never grant another extension's text ownership. |

`context`, `state`, `app`, `text`, and `error` events are available. `plugin.state` is a snapshot; `plugin.app` is the bound app record. App/document read capabilities remain independent; merely binding a native app panel is not an implicit read grant. Asset bytes travel as Blobs through the host, not base64 data URLs, cookie-bearing plugin fetches, or arbitrary file paths. Use explicit asset IDs, not filename matching, for provenance and portable packages.

`annotations.list` returns `PluginAnnotation` records in annotation paint order: `id`, `type`, paired board-space `points`, and optional `color`, `alpha`, `size`, `isComplete`, and `text`. Colors retain the renderer's color tokens. Reads reflect live geometry edits, not a database snapshot or the viewport-culled subset; unfinished local draft strokes are excluded. Legacy shape IDs need not be unique. This API grants neither annotation writes nor access to the board's Yjs document.

### JSON metadata and revisions

```ts
const previous = await plugin.request('app.content.get', {});

await plugin.request('app.content.patch', {
  expectedRevision: previous.revision,
  changes: [
    { op: 'set', path: ['label'], value: 'Reviewed' },
    { op: 'delete', path: ['draft'] },
  ],
});
```

Patch paths address object keys, not array indices; replace an array as a value. Batches commit atomically, preserving unrelated fields. `expectedRevision` makes a stale write reject with a conflict rather than overwrite a newer value. Re-read and reconcile intentionally; do not blindly retry stale whole objects. Revision counters are separate from user data. JSON patches are not a collaborative text algorithm.

### Collaborative plain text

```ts
const body = await plugin.openText('body'); // bound own app; an explicit own appId is optional
const unbind = body.bindTextarea(document.querySelector('textarea')!);
const stopObserving = body.observe((value) => console.log(value));
body.text.insert(body.text.length, '\nA quoted passage');
await body.flush();
// On teardown: unbind(); stopObserving(); body.dispose(); plugin.dispose();
```

`PluginText` exposes `appId`, `field`, native `text: Y.Text`, a `value` getter, observation, textarea binding, `flush()`, and `dispose()`. Edit via Y.Text insert/delete operations, not replacing a JSON body string on every keystroke. Updates merge through the authorized host channel and Redis-backed own-app snapshots; the extension never receives the full board Y.Doc or an unrestricted Yjs socket. `flush()` awaits pending writes and rejects visibly on failure; retain the editor until unsaved changes are resolved. Disposing disconnects bindings/observers and rejects unfinished work, not a substitute for saving.

For a read-only value, use `await plugin.readText('body', otherAppId)`. It returns a string from the supported `text.get` transport without exposing an editable handle or requiring knowledge of stored Yjs fields. Omit `appId` only in an app-bound view. Cross-extension reads require `apps.read` and stay on the current board and room; `openText` remains the editing API for your own apps. These are named SDK plaintext documents, not an adapter for native Notepad/PDF editor contents. Successful `text.get` requests also subscribe to the existing `text` snapshot events while the frame is active.

Each `openText` call owns an independent handle; disposing one does not close another editor of the same field. Local edits are buffered for 150 ms, and `flush()` explicitly drains them. A failed acknowledgement keeps the pending updates for a later `flush()` and emits `error`; applications must show that unsaved state rather than silently clearing it. Fields use safe state-key identifiers and stored snapshots are limited to 1 MiB. Plain text only: embedded objects, formatting attributes, and foreign Yjs roots are rejected.

### Native adapters and links

Creation supports `Notepad`, `Stickie`, `PDFViewer`, `ImageViewer`, and own declared PluginApp views. Notepads accept initial text-only Delta inserts; subsequent edits belong to their native Yjs editor. Stickies support their safe text/format/source fields. PDF/image asset IDs must identify assets in the current room. Unknown native state, worker commands, and executable IFrame/SageCell creation are not exposed.

Own PluginApp identity is immutable. Use `app.content.patch` for structured metadata and `openText` for collaborative text, not `apps.update` state replacement. `links.create` requires a plugin-defined stable `key`; replaying that key with the same endpoints is idempotent, while different endpoints conflict instead of overwriting the existing link.

## Consent, persistence, and isolation

Approval is bound to the uploaded ZIP's exact SHA-256 digest. Identical deterministic builds preserve the digest; changed uploads require fresh consent unless the current room owner explicitly opted into the bounded future-upload policy. Changing owner or adding capabilities does not silently inherit consent. Disabling the policy prevents later uploads from restoring it.

Disabling an extension unloads controllers, menus, panels, and overlays; existing custom apps become unavailable without losing their data. Explicit catalogue deletion removes the catalogue, approvals, and extension-level board state; existing native notes, links, and board apps remain. Immutable package files are retained to avoid racing concurrent installation; retained files alone cannot acquire a bridge session.

A trusted host page confines the inner opaque-origin iframe to its immutable package directory. CSP blocks scripts and connections to other origins, workers, nested frames, and navigation escape. It allows HTTPS stylesheets and fonts, so an approved extension can encode data it can read into those request URLs. Only the initial handshake uses window messaging; app traffic uses a dedicated MessagePort bound to the approved package, board, and optional app instance. Server checks enforce digest/capabilities, native permissions, and board/room/ownership scope. Read capabilities still disclose data to trusted extension code; this is not permission to execute backend code.

## Integration checks (run by the integration owner)

```sh
node --test libs/sageplugin/*.test.cjs libs/sageplugin/tools/*.test.cjs libs/sageplugin/examples/*/*.test.cjs
node libs/applications/src/lib/apps/PDFViewer/PDFSelection.test.cjs
yarn nx test homebase
SAGE3_TEST_REDIS_URL=redis://127.0.0.1:16379 yarn nx run-many --target=test --projects=sagebase,homebase --skip-nx-cache
```

Use a disposable Redis Stack instance for storage/concurrency tests. Also build/pack the SDK, install that tarball in the copied starter, build/watch its ZIP, and exercise two authenticated browser clients for metadata conflicts, shared text/reload, links, assets, panel targets, and owner-approved uploads. These commands describe the verification workflow, not evidence that it has run. npm publication requires the SAGE team's authorization and credentials and is outside this local workflow.
