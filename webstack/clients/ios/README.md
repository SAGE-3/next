# SAGE3 for iOS

A native SwiftUI client for iPhone and iPad (iOS 17+). No third-party packages.

**Phase 1** (this version):

- **Hubs:** the Electron client's default list, plus a local development hub in debug builds. You can add and remove hubs; each hub is checked with `GET /api/info`.
- **Sign in:** Apple, Google and guest, each shown when the hub allows it. Apple and Google run the hub's web login in the system's login sheet, which hands the app a one-time code (`SBMobileLogin` on the server, PKCE). Apple's callback is a cross-site form POST without the session cookie, so for Apple the app's challenge travels in the OAuth state.
- **Rooms and boards:** listed and kept up to date live; private ones ask for their PIN. The create buttons are there but disabled for guests, because the server refuses rooms and boards from guests.
- **Boards:** pan with one finger, zoom with two, double-tap or the toolbar button to show all apps. Images (the resized copy that fits the zoom) and Stickies (their saved text) are drawn; every other app is a placeholder with its type and title.

## Run

Open `SAGE3.xcodeproj` in Xcode 16 or later (tested with Xcode 27), pick an iPhone or iPad simulator, and run. For the local development hub, run the SAGE3 dev servers first (`http://localhost:4200`).

From the command line:

```sh
xcodebuild -project SAGE3.xcodeproj -scheme SAGE3 -destination 'platform=iOS Simulator,name=iPhone 17' build
```

Debug builds can open a hub's rooms, a room's boards, or a board directly as a guest, which is handy in the simulator:

```sh
xcrun simctl launch booted app.sage3.ios -SAGE3Hub http://localhost:4200 [-SAGE3Room <room id> [-SAGE3Board <board id>]]
```

## How it talks to the hub

The same APIs as the web client (`libs/frontend`):

- REST over HTTP (`/api/rooms`, `/api/boards?roomId=`, `/api/apps?boardId=`, `/api/assets/<id>`), with the session cookie kept in the shared cookie storage.
- The `/api` websocket for live updates: `{ id, route, method: "SUB" }`, then `CREATE` / `UPDATE` / `DELETE` events carrying the documents.
- A guest login is `POST /auth/guest`; the guest's user is then created with `POST /api/users/create`, as the web client does.
- Private PINs are stored as `uuidv5(pin, namespace)`, with the namespace from `/api/configuration`.

The Swift models in `SAGE3/Models` mirror the zod schemas in `libs/shared` and `libs/applications`: update them when those change.

## Annotations (Yjs)

The whiteboard's strokes are shared live through Yjs, as on the web: the app joins the
board's room (`annotations-<boardId>` on the hub's `/yjs` websocket) with the web
client's own `yjs`, run in JavaScriptCore. `YjsBridge/bridge.js` wraps it (sync
messages in and out, shapes as JSON, add, erase, load the saved copy); `YjsBridge/build.sh`
bundles it with webstack's webpack into `SAGE3/Resources/yjs-bridge.js`, which is
committed, so building the app needs only Xcode. Rebuild it after updating `yjs` in
webstack.

Strokes are saved to the board's annotations document as the web whiteboard saves them:
new strokes appended (`POST /api/annotations/<boardId>/lines`), the whole list rewritten
after an erase. The app doesn't announce itself in the room's awareness, so a web client
that arrives alone still loads the saved copy.

## Layout

- `SAGE3/Models`: server documents (rooms, boards, apps, assets, users) and a loose JSON type for app state
- `SAGE3/Network`: HTTP client, websocket client, Yjs engine, UUID v5, PKCE login
- `SAGE3/Stores`: saved hubs, the signed-in session, live collections
- `SAGE3/Views`: hubs, sign-in, rooms, boards, the board canvas, app tiles

`clients/swift` is an earlier 2022 websocket prototype, kept for reference.
