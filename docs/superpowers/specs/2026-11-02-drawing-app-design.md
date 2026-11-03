# Drawing app without tldraw: design

Date: 2026-11-02
Status: approved in conversation, awaiting review of this written spec

## Goal

Replace the tldraw-based `Drawing` app, whose library needs a licence, with a simple drawing app built in SAGE3. Several people edit a drawing together in real time. It is meant for quick diagrams and sketches during meetings, on a display wall or a laptop, not as a full design tool.

### What was asked

- Collaborative, over Yjs.
- Shapes, text, lines and arrows; a pen for freehand drawing; panning.
- Settings in plain words: small / medium / large instead of pixel sizes, and a short, fixed list of colours for lines and fills.
- Undo and redo.
- Export to SVG and PNG.
- Grouping, bring to front / send to back, and alignment.
- A bigger app window shows more canvas.
- Magnetic arrows that attach to a few anchor points on each shape.

### Decisions taken

| Question | Decision |
|---|---|
| Replace or add | Replace: the app keeps the name `Drawing`, and `tldraw` is removed from the project. |
| View | Personal: each person pans and zooms on their own; edits are shared live. |
| Zoom | Pan and zoom inside the app (buttons, fit, 100%). The mouse wheel and pinch zoom the drawing only while the app is selected. |
| Text | Text boxes, labels inside shapes, and labels on lines and arrows. |
| Arrows | Straight and curved (one bend handle). 4 anchors per shape. No elbow arrows. |
| Export | Download SVG or PNG, or save to the room's Asset Manager. |
| Approach | Our own SVG editor on the board's shared Yjs document (no new dependency), rather than Excalidraw or an HTML-canvas editor. |

### Not in this version

Rotation, dashed lines, images inside drawings, groups inside groups, elbow arrows, live cursors inside the drawing, a shared "show my view to everyone", copy and paste.

## 1. App identity and data model

**The app:** still named `Drawing`, in `libs/applications/src/lib/apps/Drawing`. Existing Drawing apps open the new editor.

**Dependencies:** `tldraw` and `@tldraw/*` are removed from `webstack/package.json` if nothing else uses them. Nothing new is added: the app uses `yjs`, `y-websocket` (through the board's existing connection), `perfect-freehand` and the SAGE3 UI components already in the project.

**App state** (zod schema in `index.ts`), replacing `fit`, `follow` and `camera`:

- `shapes`: the saved copy of the drawing, `{ [shapeId]: Shape }` (see section 3, Saving).
- `background`: `'white' | 'grid'`, default `'white'`.

**Shape** (one TypeScript type with a zod schema):

| Field | Meaning |
|---|---|
| `id` | random id |
| `type` | `rect`, `roundrect`, `ellipse`, `diamond`, `text`, `line`, `arrow`, `pen` |
| `x, y, w, h` | box of the shape in drawing coordinates (box shapes and text) |
| `start`, `end` | line and arrow ends: a free point `{x, y}` or an attachment `{shapeId, anchor}`, where `anchor` is `top`, `right`, `bottom` or `left` |
| `bend` | line and arrow: 0 is straight; another value bows the line through a point that far from its middle, measured at right angles |
| `heads` | arrow: `{start, end}`, each `none`, `arrow` or `dot` |
| `points` | pen: the stroke's points, simplified when the stroke ends |
| `stroke` | colour name from the palette |
| `fill` | colour name or `none` (box shapes only) |
| `size` | `S`, `M` or `L`: line thickness for shapes and lines, text size for text |
| `label` | text inside a shape, or on a line or arrow |
| `z` | layer order: a number between its neighbours, so reordering one shape does not renumber the others |
| `group` | group id, or none. One level of grouping only. |

**Palette:** 8 stroke colours (black, grey, red, orange, yellow, green, blue, purple), and the same 8 as light fills, plus "no fill". Shapes store the colour name, not its value, so the palette can be adjusted later without editing drawings.

**In Yjs:** one `Y.Map` per drawing, named `drawing:<appId>`, in the board's shared `yApps` document. It maps each shape id to a `Y.Map` of that shape's fields. Moving a shape changes only its `x` and `y`, so two people editing different shapes never conflict. A pen stroke's `points` are stored as one value, since a stroke does not change after it is drawn.

## 2. Editor, tools and interaction

**Canvas:** the drawing fills the app window. A bigger window shows more of the drawing at the same scale. Each person's view (position and zoom) is personal and saved in the browser, per app. The background is always white, or white with a dotted grid, including in dark mode, so colours look the same on screen and in exports.

**Controls:**

- Inside the app, along the left edge, a column of tool buttons: Select, Pan, Pen, Rectangle, Rounded rectangle, Ellipse, Diamond, Line, Arrow, Text.
- In the SAGE3 app toolbar, shown when the app is selected:
  - stroke colour, fill colour, size S/M/L and arrow heads, for the selected shapes or the next shape drawn;
  - undo and redo;
  - group and ungroup; front, forward, backward, back; align left, centre, right, top, middle, bottom;
  - zoom out, zoom in, fit the drawing, 100%;
  - export: download SVG, download PNG, save to the Asset Manager.

**Drawing:**

- Drag to draw a shape, line or arrow. Shift keeps a square, a circle, or a 45° line.
- After one shape, the tool returns to Select. The pen stays on until another tool is chosen.
- Text: click to place a text box and type.
- Labels: double-click a shape, line or arrow to type its label. Text wraps to the shape's width.

**Selecting and editing:**

- Click a shape; Shift-click to add to the selection; drag a box on empty canvas to select everything inside it.
- Drag to move. Box shapes have 8 resize handles. Lines and arrows have a handle at each end, and one in the middle that bends them.
- Clicking any shape in a group selects the whole group.

**Magnetic arrows:**

- While an arrow or line end is dragged near a shape, the shape's 4 anchors appear and the end snaps to the nearest one. Releasing there attaches the end.
- When an attached shape moves or is resized, its arrows follow.
- Deleting a shape keeps its arrows, with the attached ends turned into free points at their last position.

**Pan and zoom:** pan with the Pan tool, with the middle mouse button, or with the space bar held down. The mouse wheel and pinch zoom the drawing only while the app is selected; otherwise they zoom the board as usual.

**Keyboard,** only while the app is selected and no text is being typed. These keys must not also trigger the board's shortcuts.

| Key | Action |
|---|---|
| Delete, Backspace | delete the selection |
| Ctrl/Cmd+Z | undo |
| Ctrl/Cmd+Shift+Z, Ctrl+Y | redo |
| Ctrl/Cmd+G | group |
| Ctrl/Cmd+Shift+G | ungroup |
| Escape | clear the selection |
| Arrow keys | move the selection 1 unit, 10 with Shift |

**Other people:** shapes another person has selected get an outline in that person's SAGE3 colour, read from the Yjs presence (awareness) information.

**Text rendering:** real SVG `<text>` elements, wrapped by measuring the text. Not embedded HTML (`foreignObject`), which browsers leave out when drawing an SVG into a PNG.

## 3. Collaboration, undo and saving

**Live editing:**

- Each change updates one field of one shape's `Y.Map` and reaches others through the board's existing `yApps` connection. The app opens no connection of its own.
- During a drag, updates are sent at most about 30 times a second, and the final position is always sent.
- An action on several shapes (align, group, moving a selection) is one Yjs transaction.

**Undo and redo:**

- A Yjs `UndoManager` on `drawing:<appId>` that tracks only the local user's changes. Undo never reverts someone else's edit.
- A drag, a resize or an alignment is one undo step.
- The history lasts while the app is open in that browser; it is not saved.

**Saving:** the Yjs server keeps documents in memory only (`y-websocket/bin/utils`), so the drawing is also written to the app's state, as Stickie does.

- The write happens 2 seconds after the last change.
- Only one connected user writes: the one with the lowest Yjs client id among the users present.
- When `drawing:<appId>` is empty on opening, the app fills it from `state.shapes`. Two people opening at once cannot create duplicates, because shapes are keyed by id.
- Pen strokes are simplified (fewer points, coordinates rounded to 0.1) when they end.
- Above 2 MB, saving stops and the app shows "This drawing is too large to save; remove some pen strokes". Live editing continues.
- `state.shapes` is plain JSON that other tools, such as pysage3 or the AI features, can read.

**Existing Drawing apps:** their state has no `shapes`, so they open empty. The old `fit`, `follow` and `camera` fields are ignored and dropped at the first save. Their tldraw content was never saved to state, so no saved drawing is lost.

**Errors:**

- Lost connection: drawing continues, and Yjs sends the changes when it reconnects.
- A saved shape that fails the zod schema is skipped and logged; the rest of the drawing opens.
- An arrow attached to a shape that no longer exists is drawn with that end at its last known position.

## 4. Export and code structure

**Export:**

- The whole drawing, or only the selection if there is one. Cropped to the shapes plus a 16-unit margin, on white. The grid is not exported.
- SVG: produced by the same rendering code as the screen, without handles or anchors. Self-contained: plain SVG elements, `<text>`, and a common sans-serif font list.
- PNG: that SVG drawn onto a canvas at 2× scale.
- Download: `drawing.svg` or `drawing.png`, with the existing `downloadFile` helper.
- Save to Asset Manager: asks for a file name, then uploads to the room's assets with `apiUrls.assets.upload`, as Stickie does, and shows "Upload complete" or an error message. The file is not placed on the board.

**Files** in `libs/applications/src/lib/apps/Drawing/`:

| File | Job |
|---|---|
| `index.ts` | app name, zod schema (`shapes`, `background`), `init` |
| `model/shape.ts` | Shape type and zod schema, palette, S/M/L tables |
| `model/geometry.ts` | pure functions: bounds, anchors, nearest anchor, arrow paths with bend, hit-testing, alignment, layer order, pen simplification |
| `model/doc.ts` | reading and writing shapes in `drawing:<appId>`, transactions, `UndoManager`, filling from and saving to `state.shapes` |
| `render/Shapes.tsx` | SVG for each shape type, used for the screen and for export |
| `render/Overlay.tsx` | selection box, handles, anchors, other people's selections |
| `editor/useTools.ts` | pointer handling for each tool: create, select, move, resize, bend, attach, pan |
| `editor/useView.ts` | personal pan and zoom, saved in the browser |
| `editor/TextEditor.tsx` | the text area placed over a label while it is typed |
| `export.ts` | SVG string, PNG, download, upload |
| `Drawing.tsx` | the app: canvas, tool column, SAGE3 toolbar |

`useYjsStore.ts` and all tldraw code are deleted. `apps.json` and the generated registry files do not change, since the name stays `Drawing`.

**Integration with the app window:**

- `AppWindow.tsx` (`handleAppTouchMove`) lets pointer moves through to an app's content only while the app is selected. So drawing, dragging and panning inside the drawing work once the app is selected: the first click on an unselected Drawing app selects it, as with other apps. The comment there that names tldraw is updated.
- `apps/webapp/webpack.config.js` has a workaround for `url(%23...)` tokens in `tldraw.css`. It is removed with tldraw, after checking that the build no longer needs it for another stylesheet.

## 5. Testing

**Automated tests (Jest).** `libs/applications` has no test setup yet; one is added by copying `libs/shared`'s `jest.config.ts` and test target, so that `nx test applications` runs.

- `geometry.ts`:
  - anchors for each shape type, and snapping to the nearest anchor within the distance limit;
  - straight and curved arrow paths, and arrows following a moved or resized shape;
  - hit-testing of strokes and filled shapes;
  - the six alignments, for shapes and groups;
  - layer order without renumbering;
  - pen simplification: fewer points, staying within 0.5 units of the original.
- `shape.ts`: invalid shapes are rejected; colour names and S/M/L map to their values.
- `doc.ts`, with two in-memory `Y.Doc`s synced to each other:
  - an edit in one appears in the other;
  - undo reverts only local edits, and one drag is one step;
  - both filling an empty doc from `state.shapes` at once gives no duplicates;
  - only the elected user saves;
  - a drawing over 2 MB is not saved and raises the warning.
- `export.ts`: for a fixed drawing, the SVG has the expected crop and elements, no handles, and text in `<text>` elements.

**Checks before the PR** (AGENTS.md section 4): `nx run webapp:typecheck`, lint, the development build, `nx run-many -t test`, and the Electron client starts.

**Manual test,** with two browsers on one board, and the Electron client:

- every tool; labels; group, ungroup, align, reorder; undo and redo;
- arrows attached to shapes that are then moved and resized;
- both people drawing at once; each person's undo leaves the other's work; remote selections show in the other person's colour;
- a bigger window shows more canvas; personal pan and zoom; the wheel zooms the drawing only when the app is selected;
- after restarting the Yjs server, the drawing comes back from its state;
- an existing tldraw Drawing app opens empty, without errors;
- SVG and PNG export of the whole drawing and of a selection; save to the Asset Manager;
- with about 300 shapes, dragging stays smooth and sends about 30 updates a second (AGENTS.md section 8 treats rendering, pointer input and sync as high-risk areas).

**Delivery:** a feature branch from `dev` and a PR into `dev`. The Drawing entry in `doc/Applications.md` is rewritten. The PR names the removal of tldraw as a dependency change.
