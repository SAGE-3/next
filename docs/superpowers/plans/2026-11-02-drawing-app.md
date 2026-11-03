# Drawing App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tldraw-based `Drawing` app with a collaborative SVG drawing editor built in SAGE3, then remove tldraw from the project.

**Architecture:** Shapes live as one `Y.Map` per shape inside a `Y.Map` named `drawing:<appId>` in the board's shared `yApps` Yjs document. Pure model code (shape schema, geometry, Yjs document wrapper, SVG rendering and export) is unit tested under Node. React code (view, tools, overlay, toolbar) sits on top of it and is tested by hand. The drawing is also saved, debounced, into the app's state for durability.

**Testing scope (user's choice):** quick checks only: the model unit tests, the type-check and the build. The user tests the behaviour by running the app.

**Tech Stack:** TypeScript, React 18, Chakra UI, zustand, zod, yjs / y-websocket (through `useYjs()`), perfect-freehand, throttle-debounce, Jest with ts-jest (Node environment), Nx.

**Spec:** `docs/superpowers/specs/2026-11-02-drawing-app-design.md`

All paths below are relative to `webstack/` unless they start with `doc/` or `docs/`. `D/` means `webstack/libs/applications/src/lib/apps/Drawing/`.

## Global Constraints

- No new runtime dependency. Use only packages already in `webstack/package.json`: `yjs`, `y-websocket`, `perfect-freehand`, `throttle-debounce`, `zustand`, `zod`, `@chakra-ui/react`, `react-icons`, `react-dom/server`.
- App name stays `Drawing`. `apps.json` and the generated files (`apps.ts`, `types.ts`, `initialValues.ts`) are not edited.
- Yjs map name: `drawing:<appId>`, in `useYjs().yApps.doc`. The app opens no Yjs connection of its own.
- Palette: 8 colour names, `black, grey, red, orange, yellow, green, blue, purple`; fill can also be `none`. Shapes store names, never hex values.
- Sizes: `S | M | L`.
- One level of groups. No rotation, dashes, images, elbow arrows, live cursors, copy/paste.
- 4 anchors per box shape: `top, right, bottom, left`, at the middle of each side.
- Drag updates are throttled to 33 ms (about 30 per second); the last position is always written.
- Save to state 2000 ms after the last change, only by the elected user (the lowest Yjs client id present); stop saving above `2 * 1024 * 1024` bytes of JSON and show: `This drawing is too large to save; remove some pen strokes`.
- Export margin 16 drawing units; PNG at 2× scale; white background; the grid is never exported.
- Text is SVG `<text>`/`<tspan>`, never `foreignObject`.
- Font family in SVG: `Helvetica, Arial, sans-serif`.
- Keyboard and wheel handling only while the app is selected and no label is being edited; events handled by the app must not reach the board (`stopPropagation`).
- Match the surrounding code style (Prettier config of the repo, the copyright header used in other app files).

## Review Focus

1. **Two people seeding an empty drawing at the same moment** from `state.shapes` must not duplicate shapes. Test in Task 4 (`seed twice from two docs gives one copy`).
2. **A saved drawing containing an invalid or unknown shape** (older or hand-edited state) must open with the rest of the shapes. Test in Task 1 (`parseShapes skips invalid entries`).
3. **An arrow whose target shape was deleted by someone else** (no local delete ran) must still draw, at its stored position. Test in Task 2 (`resolveEnd falls back to stored point`).
4. **Undo after a remote user edited the same shape** must revert only the local change and keep the remote one. Test in Task 4 (`undo keeps a remote edit to another field`).
5. **Very long or empty labels, and text with line breaks,** must wrap or render without throwing, and the export must escape `<`, `&` and quotes. Tests in Task 5 (`wrapText` cases, `exportSvg escapes text`).

---

### Task 1: Jest for `libs/applications`, and the shape model

**Files:**
- Create: `libs/applications/jest.config.js`, `libs/applications/tsconfig.spec.json`
- Modify: `libs/applications/tsconfig.json` (add a reference to `./tsconfig.spec.json`)
- Create: `D/model/shape.ts`
- Test: `D/model/shape.spec.ts`

**Interfaces:**
- Produces:
  - `type ColorName = 'black'|'grey'|'red'|'orange'|'yellow'|'green'|'blue'|'purple'`
  - `type Fill = ColorName | 'none'`, `type Size = 'S'|'M'|'L'`, `type Anchor = 'top'|'right'|'bottom'|'left'`, `type Head = 'none'|'arrow'|'dot'`
  - `type BoxType = 'rect'|'roundrect'|'ellipse'|'diamond'|'text'`, `type LinkType = 'line'|'arrow'`
  - `type End = { x: number; y: number; shapeId?: string; anchor?: Anchor }`: `x, y` is always set; it is the free point, or the last known point of an attachment.
  - `type Base = { id: string; stroke: ColorName; size: Size; label: string; z: number; group?: string }`
  - `type BoxShape = Base & { type: BoxType; x: number; y: number; w: number; h: number; fill: Fill }`
  - `type LinkShape = Base & { type: LinkType; start: End; end: End; bend: number; heads: { start: Head; end: Head } }`
  - `type PenShape = Base & { type: 'pen'; points: number[] }`: flat `[x0, y0, x1, y1, ...]`
  - `type Shape = BoxShape | LinkShape | PenShape`; `type Shapes = Record<string, Shape>`
  - `shapeSchema: z.ZodType<Shape>`
  - `parseShapes(raw: unknown): { shapes: Shapes; rejected: string[] }`
  - `PALETTE: Record<ColorName, { stroke: string; fill: string }>`
  - `STROKE_WIDTH: Record<Size, number>`, `FONT_SIZE: Record<Size, number>`
  - `isBox(s: Shape): s is BoxShape`, `isLink(s): s is LinkShape`, `isPen(s): s is PenShape`
  - `newId(): string`: `crypto.randomUUID()`

- [ ] **Step 1: Add the Jest setup.** Copy `libs/shared/jest.config.js`, changing `displayName` to `'applications'` and `coverageDirectory` to `'../../coverage/libs/applications'`. Copy `libs/shared/tsconfig.spec.json` unchanged, and add `"jsx": "react-jsx"` to its `compilerOptions`. In `libs/applications/tsconfig.json`, add `{ "path": "./tsconfig.spec.json" }` to `references`. The `@nx/jest/plugin` in `nx.json` infers the `test` target from `jest.config.js`.

- [ ] **Step 2: Verify the target exists.** Run `npx nx show project applications --json | grep -c '"test"'`. Expected: `1` or more.

- [ ] **Step 3: Write the failing tests** in `D/model/shape.spec.ts`:
  - `shapeSchema accepts each shape kind`: a `rect` box, an `arrow` with one attached end `{x: 10, y: 20, shapeId: 'a', anchor: 'left'}`, and a `pen` all parse.
  - `shapeSchema rejects bad values`: `stroke: 'pink'`, `size: 'XL'`, `fill: 'red'` on a `line`, and `points: [1, 2, 3]` (odd length) are rejected.
  - `parseShapes skips invalid entries`: `{ a: validRect, b: { id: 'b', type: 'star' }, c: 42 }` gives `shapes` with only `a`, and `rejected` equal to `['b', 'c']`.
  - `parseShapes keys by the record key`: an entry stored under key `k` whose `id` is `'x'` is rejected (`id` must equal its key).
  - `palette and sizes`: `PALETTE.blue.stroke === '#2b6cb0'`, `STROKE_WIDTH` is `{ S: 2, M: 4, L: 8 }`, `FONT_SIZE` is `{ S: 16, M: 24, L: 36 }`.

- [ ] **Step 4: Run the tests and see them fail.** Run `npx nx test applications --testFile=shape.spec.ts`. Expected: FAIL, `Cannot find module './shape'`.

- [ ] **Step 5: Implement `D/model/shape.ts`.** Write a zod schema per variant, combined with `z.union`. `points` is refined to an even length. Use these palette values (stroke / fill):

  | name | stroke | fill |
  |---|---|---|
  | black | `#1a202c` | `#e2e8f0` |
  | grey | `#718096` | `#f7fafc` |
  | red | `#c53030` | `#fed7d7` |
  | orange | `#dd6b20` | `#feebc8` |
  | yellow | `#d69e2e` | `#fefcbf` |
  | green | `#2f855a` | `#c6f6d5` |
  | blue | `#2b6cb0` | `#bee3f8` |
  | purple | `#6b46c1` | `#e9d8fd` |

- [ ] **Step 6: Run the tests and see them pass.** Run `npx nx test applications --testFile=shape.spec.ts`. Expected: PASS.

- [ ] **Step 7: Commit.**
  ```bash
  git add libs/applications/jest.config.js libs/applications/tsconfig.spec.json libs/applications/tsconfig.json libs/applications/src/lib/apps/Drawing/model/shape.ts libs/applications/src/lib/apps/Drawing/model/shape.spec.ts
  git commit -m "feat(drawing): shape model with zod schema, and a Jest target for libs/applications"
  ```

### Task 2: Geometry: bounds, anchors, arrows, hit-testing

**Files:**
- Create: `D/model/geometry.ts`
- Test: `D/model/geometry.spec.ts`

**Interfaces:**
- Consumes: Task 1 types.
- Produces:
  - `type Point = { x: number; y: number }`, `type Box = { x: number; y: number; w: number; h: number }`
  - `anchorPoint(box: Box, anchor: Anchor): Point`
  - `nearestAnchor(shapes: Shapes, p: Point, maxDist: number, excludeId?: string): { shapeId: string; anchor: Anchor; point: Point } | null`. Only box shapes are considered. The nearest anchor within `maxDist` wins.
  - `resolveEnd(shapes: Shapes, end: End): Point`: the anchor point if the target exists and is a box, else `{ x: end.x, y: end.y }`.
  - `linkPath(start: Point, end: Point, bend: number): { d: string; control: Point; handle: Point }`
  - `shapeBounds(shape: Shape, shapes: Shapes): Box`
  - `selectionBounds(ids: string[], shapes: Shapes): Box | null`
  - `hitTest(shapes: Shapes, p: Point, tolerance: number): string | null`: the topmost (highest `z`) shape hit.
  - `shapesInBox(shapes: Shapes, box: Box): string[]`: shapes whose bounds are fully inside `box`.

- [ ] **Step 1: Write the failing tests** in `D/model/geometry.spec.ts`:
  - `anchorPoint`: for box `{x: 0, y: 0, w: 100, h: 50}`, `top` is `(50, 0)`, `right` is `(100, 25)`, `bottom` is `(50, 50)`, `left` is `(0, 25)`.
  - `nearestAnchor snaps within distance`: with a rect at `(0, 0, 100, 50)`, the point `(103, 27)` with `maxDist` 16 gives `right`; the point `(140, 25)` gives `null`; `excludeId` of that rect gives `null`.
  - `resolveEnd follows the target`: an end attached to `left` of a rect moved to `x = 200` resolves to `(200, 25)`.
  - `resolveEnd falls back to stored point`: an end `{x: 7, y: 9, shapeId: 'gone', anchor: 'top'}` resolves to `(7, 9)`.
  - `linkPath straight`: bend 0 gives `d === 'M 0 0 L 100 0'` and `handle` `(50, 0)`.
  - `linkPath curved passes through the handle`: start `(0, 0)`, end `(100, 0)`, bend 20 gives `handle` `(50, -20)`, `control` `(50, -40)`, and `d === 'M 0 0 Q 50 -40 100 0'`. The handle is on the left-hand normal of the start-to-end direction, so a positive bend bows upwards on screen for a left-to-right line.
  - `shapeBounds`: a pen stroke `[0, 0, 10, 5, -3, 8]` gives `(-3, 0, 13, 8)`; a curved link's bounds include its handle point.
  - `hitTest picks the topmost`: two overlapping filled rects with `z` 1 and 2 return the one with `z` 2. A rect with `fill: 'none'` is hit near its outline (within the tolerance) but not at its centre. A diamond is not hit at its box corner. A line is hit 3 units from its segment with tolerance 4.
  - `shapesInBox`: only shapes entirely inside the box are returned.

- [ ] **Step 2: Run the tests and see them fail.** Run `npx nx test applications --testFile=geometry.spec.ts`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement `D/model/geometry.ts`.** The curve is a quadratic Bézier. With `m` the midpoint and `n` the unit left-hand normal `(dy, -dx) / len` of `end - start`: `handle = m + n * bend` and `control = m + n * 2 * bend`, so the curve passes through `handle` at t = 0.5. Hit-testing links samples the curve at 32 points. Inside tests: rect and roundrect use the box; ellipse uses `((x-cx)/rx)^2 + ((y-cy)/ry)^2 <= 1`; diamond uses `|dx|/rx + |dy|/ry <= 1`. Text is always hit inside its box.

- [ ] **Step 4: Run the tests and see them pass.** Expected: PASS.

- [ ] **Step 5: Commit.** `git commit -m "feat(drawing): geometry for anchors, curved links, bounds and hit-testing"` (stage both files).

### Task 3: Geometry: moving, alignment, layer order, groups, pen simplification

**Files:**
- Modify: `D/model/geometry.ts`
- Test: `D/model/geometry-edit.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces:
  - `translate(shape: Shape, dx: number, dy: number): Partial<Shape>`: for a box, new `x, y`; for a link, only the **free** ends move (attached ends keep their `shapeId`); for a pen, the shifted `points`.
  - `resize(shape: BoxShape, handle: 'n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw', p: Point, keepRatio: boolean): Pick<BoxShape, 'x'|'y'|'w'|'h'>`, with a minimum `w` and `h` of 8.
  - `type AlignMode = 'left'|'center'|'right'|'top'|'middle'|'bottom'`
  - `align(shapes: Shapes, ids: string[], mode: AlignMode): Record<string, Partial<Shape>>`: groups move as one unit; nothing happens with fewer than 2 units.
  - `type OrderOp = 'front'|'forward'|'backward'|'back'`
  - `reorder(shapes: Shapes, ids: string[], op: OrderOp): Record<string, number>`: new `z` values for `ids` only.
  - `expandGroups(shapes: Shapes, ids: string[]): string[]`: adds every member of every group touched.
  - `simplifyPoints(points: number[], tolerance: number): number[]`: Ramer–Douglas–Peucker, then rounding to 0.1.
  - `detachFrom(shapes: Shapes, removedIds: string[]): Record<string, Partial<LinkShape>>`: for links attached to removed shapes, ends become free at their resolved point.

- [ ] **Step 1: Write the failing tests** in `D/model/geometry-edit.spec.ts`:
  - `translate a link keeps attachments`: an arrow with an attached start and a free end `(10, 10)`, translated by `(5, 0)`, keeps `start.shapeId`, and its end becomes `(15, 10)`.
  - `align left`: rects at `x` 10, 40 and 70 all get `x: 10`. `align center` aligns their centres on the centre of the union of their boxes.
  - `align moves a group as one`: a group of two rects plus one other rect, aligned `top`, moves both group members by the same `dy`, keeping their relative offset.
  - `align needs two units`: one group alone returns `{}`.
  - `reorder front and back`: with `z` values 1, 2 and 3, `front` on the first gives it `z` greater than 3; `back` on the last gives it `z` less than 1; the other shapes' `z` are unchanged.
  - `reorder forward lands between neighbours`: with `z` 1, 2, 3, `forward` on `z` 1 gives a value strictly between 2 and 3.
  - `expandGroups`: selecting one member returns all members.
  - `simplifyPoints`: 1000 points along a straight line reduce to 2; a zigzag of amplitude 5 with tolerance 0.5 keeps its corners; all coordinates have at most one decimal.
  - `detachFrom`: an arrow attached to a removed rect gets `start` `{x, y}` equal to the old anchor point, with no `shapeId`.

- [ ] **Step 2: Run the tests and see them fail.** Run `npx nx test applications --testFile=geometry-edit.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implement them in `D/model/geometry.ts`.** For `forward`, take the nearest `z` above the shape, `a`, and the next one above it, `b`: the new `z` is `(a + b) / 2`, or `a + 1` when there is no `b`. `backward` is symmetrical. `front` and `back` place the moved shapes after the maximum, or before the minimum, keeping their own relative order.

- [ ] **Step 4: Run the tests and see them pass.** Expected: PASS.

- [ ] **Step 5: Commit.** `git commit -m "feat(drawing): move, resize, align, layer order, groups and pen simplification"`

### Task 4: The Yjs document: edits, undo, seeding and saving

**Files:**
- Create: `D/model/doc.ts`
- Test: `D/model/doc.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–3 (`Shape`, `parseShapes`, `detachFrom`).
- Produces:
  - `class DrawingDoc` with `constructor(ydoc: Y.Doc, appId: string)`. It uses `ydoc.getMap('drawing:' + appId)`, where each value is a `Y.Map` of one shape's fields. Methods:
    - `getShapes(): Shapes`
    - `add(shape: Shape): void`
    - `update(patches: Record<string, Partial<Shape>>): void`: one transaction; only the listed fields change.
    - `remove(ids: string[]): void`: one transaction; applies `detachFrom` first.
    - `undo(): void`, `redo(): void`, `canUndo(): boolean`, `canRedo(): boolean`
    - `stopCapturing(): void`: call at the start and at the end of a drag, so the drag is one undo step.
    - `seed(saved: unknown): void`: only when the map is empty; runs `parseShapes` (rejected ids are logged with `console.warn`); uses an origin the undo manager does not track.
    - `observe(cb: () => void): () => void`: deep observation; returns the unsubscribe function.
    - `destroy(): void`
  - The `UndoManager` tracks only the instance's own origin object, with `captureTimeout: 500`.
  - `isElectedSaver(clientIds: number[], localId: number): boolean`: `true` when `localId` is the minimum of `clientIds`, or when the list is empty.
  - `MAX_SAVE_BYTES = 2 * 1024 * 1024`
  - `prepareSave(shapes: Shapes): { ok: true } | { ok: false; bytes: number }`: measures the UTF-8 length of `JSON.stringify(shapes)` with `TextEncoder`.

- [ ] **Step 1: Write the failing tests** in `D/model/doc.spec.ts`. Use two `Y.Doc`s connected by applying each other's updates (`doc.on('update', u => Y.applyUpdate(other, u, 'remote'))`):
  - `edits reach the other doc`: `add`, then `update({ id: { x: 5 } })` on A, and B's `getShapes()` shows `x: 5`.
  - `undo reverts only local edits`: A moves shape s1 and B moves shape s2. `A.undo()` restores s1 and leaves s2 moved.
  - `undo keeps a remote edit to another field`: A changes s1's `stroke`, B changes s1's `x`. `A.undo()` restores the stroke and keeps B's `x`.
  - `a drag is one undo step`: `stopCapturing()`, then 10 `update`s of `x` in quick succession, then `stopCapturing()`. One `undo()` returns to the original `x`.
  - `seed fills an empty doc only`: `seed({a})` on an empty doc adds `a`; a second `seed({b})` does nothing; `canUndo()` is `false` after seeding.
  - `seed twice from two docs gives one copy`: A and B, not yet synced, both `seed` the same saved record. After syncing, there is one entry per id.
  - `remove frees attached arrows`: removing a rect turns an attached arrow end into a free point.
  - `isElectedSaver`: `([7, 3, 9], 3)` is `true`; `([7, 3, 9], 7)` is `false`; `([], 5)` is `true`.
  - `prepareSave limit`: a pen with about 2.2 MB of points returns `ok: false`; a small drawing returns `ok: true`.

- [ ] **Step 2: Run the tests and see them fail.** Run `npx nx test applications --testFile=doc.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implement `D/model/doc.ts`.** Fields are stored as plain values in each shape's `Y.Map`: `start`, `end`, `heads` and `points` as whole values. `getShapes()` reads each map with `toJSON()` and validates it with `shapeSchema`, skipping invalid entries.

- [ ] **Step 4: Run the tests and see them pass.** Expected: PASS.

- [ ] **Step 5: Commit.** `git commit -m "feat(drawing): Yjs document with local undo, seeding and save election"`

### Task 5: SVG rendering, text wrapping and export

**Files:**
- Create: `D/render/text.ts`, `D/render/Shapes.tsx`, `D/export.ts`
- Test: `D/render/text.spec.ts`, `D/export.spec.tsx`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `type Measure = (text: string, fontSize: number) => number`
  - `canvasMeasure: Measure`: browser only; a cached 2D canvas context with font `${fontSize}px Helvetica, Arial, sans-serif`.
  - `wrapText(text: string, maxWidth: number, fontSize: number, measure: Measure): string[]`: splits on `\n`, then wraps on spaces; a single word wider than `maxWidth` is kept whole on its own line.
  - `FONT_FAMILY = 'Helvetica, Arial, sans-serif'`
  - `<ShapeView shape={Shape} shapes={Shapes} measure={Measure} />` and `<ShapesLayer shapes={Shapes} ids?: string[] measure={Measure} />`: sorted by `z`, rendering only `ids` when given. These are pure SVG elements, with no event handlers.
    - Box labels: centred.
    - Link labels: at the handle point, on a white rectangle behind the text.
    - Arrow heads: a filled triangle (`arrow`) or a circle (`dot`), sized from `STROKE_WIDTH`.
    - Pen: perfect-freehand's `getStroke` with `size = STROKE_WIDTH[size] * 2`, filled with the stroke colour.
    - Roundrect: corner radius `min(w, h) * 0.15`.
  - `exportSvg(shapes: Shapes, ids: string[] | null, measure: Measure): string | null`: `null` when there is nothing to export. The output is a complete `<svg xmlns="http://www.w3.org/2000/svg" viewBox=...>`, cropped to the bounds plus 16 units of margin, with a white background `<rect>` first. It's built with `renderToStaticMarkup`.
  - `svgToPng(svg: string, scale = 2): Promise<Blob>`: browser only; draws the SVG into an `Image`, then onto a canvas.
  - `uploadToAssets(file: File, roomId: string): Promise<void>`: `POST` to `apiUrls.assets.upload` with `files` and `room` fields, as in `Stickie.tsx`. It throws on a non-OK response.

- [ ] **Step 1: Write the failing tests:**
  - In `D/render/text.spec.ts`, using `measure = (t, fs) => t.length * fs * 0.5`:
    - `wraps on spaces`: `wrapText('aa bb cc', 50, 10, measure)` gives `['aa bb', 'cc']`.
    - `keeps explicit line breaks`: `'a\nb'` gives `['a', 'b']`.
    - `empty text`: `''` gives `[]`.
    - `long word stays whole`: a 40-character word with width 50 gives one line.
  - In `D/export.spec.tsx`:
    - `exportSvg crops with margin`: a rect at `(100, 100, 50, 20)` gives `viewBox="84 84 82 52"`.
    - `exportSvg of a selection`: only the selected ids appear.
    - `exportSvg has no handles and uses text`: the output contains `<text` and no `foreignObject`, and its first child is a white rect.
    - `exportSvg escapes text`: a label `a < b & "c"` appears escaped (`&lt;`, `&amp;`, `&quot;`).
    - `exportSvg of nothing`: an empty drawing gives `null`.

- [ ] **Step 2: Run the tests and see them fail.** Run `npx nx test applications --testFile=text.spec.ts` and `--testFile=export.spec.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement the three files.**

- [ ] **Step 4: Run the tests and see them pass.** Expected: PASS.

- [ ] **Step 5: Commit.** `git commit -m "feat(drawing): SVG shapes, text wrapping, and SVG/PNG export"`

### Task 6: Editor state and the personal view

**Files:**
- Create: `D/editor/store.ts`, `D/editor/useView.ts`
- Test: `D/editor/view.spec.ts` (the pure view math only)

**Interfaces:**
- Consumes: Task 1 types, Task 2 `Box` and `Point`.
- Produces:
  - `type Tool = 'select'|'pan'|'pen'|'rect'|'roundrect'|'ellipse'|'diamond'|'line'|'arrow'|'text'`
  - `type Style = { stroke: ColorName; fill: Fill; size: Size; heads: { start: Head; end: Head } }`, with default `{ stroke: 'black', fill: 'none', size: 'M', heads: { start: 'none', end: 'arrow' } }`
  - `useDrawingStore`, a zustand store keyed by app id, with:
    - `get(appId)`, which returns `{ tool, selection: string[], style, editingId: string | null }`;
    - setters `setTool`, `setSelection`, `setStyle(appId, Partial<Style>)`, `setEditing`;
    - `docs: Record<string, DrawingDoc>` and `setDoc(appId, doc | null)`, so the toolbar reaches the app's document.
  - `type View = { x: number; y: number; zoom: number }`: the screen point is `(p - (x, y)) * zoom`.
  - Pure helpers in `useView.ts`:
    - `toDrawing(view: View, screen: Point): Point`
    - `zoomAt(view: View, factor: number, screen: Point): View`, which keeps the point under `screen` fixed, with `zoom` clamped to `[0.1, 8]`
    - `fitView(box: Box, viewport: { w: number; h: number }, margin = 32): View`, which never zooms past 1
  - `useView(appId: string): { view: View; setView(v: View): void }`: persisted under the localStorage key `sage3-drawing-view:<appId>`. Each read and write is wrapped in try/catch, falling back to `{ x: 0, y: 0, zoom: 1 }`.

- [ ] **Step 1: Write the failing tests** in `D/editor/view.spec.ts`:
  - `toDrawing inverts the transform`.
  - `zoomAt keeps the cursor point fixed`: the same drawing point is under `screen` before and after.
  - `zoomAt clamps`: 100 doublings stay at 8; 100 halvings stay at 0.1.
  - `fitView`: a 1000×500 box in a 520×270 viewport gives zoom `0.456`, rounded to 3 decimals; a 10×10 box gives zoom 1.

- [ ] **Step 2: Run the tests and see them fail.** Expected: FAIL.

- [ ] **Step 3: Implement `store.ts` and `useView.ts`.**

- [ ] **Step 4: Run the tests and see them pass.** Expected: PASS.

- [ ] **Step 5: Commit.** `git commit -m "feat(drawing): editor store and personal pan/zoom view"`

### Task 7: Canvas, tools, overlay and label editing

**Files:**
- Create: `D/editor/useTools.ts`, `D/render/Overlay.tsx`, `D/editor/TextEditor.tsx`, `D/editor/Canvas.tsx`
- Modify: none yet. `Drawing.tsx` uses `Canvas` in Task 8.

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces:
  - `<Canvas appId={string} doc={DrawingDoc} selected={boolean} background={'white'|'grid'} remoteSelections={Array<{ ids: string[]; color: string }>} />`: it fills its parent and renders the SVG, `ShapesLayer`, `Overlay`, the left tool column and `TextEditor`.
  - `useTools({ appId, doc, view, setView, svgRef, selected }): { onPointerDown, onPointerMove, onPointerUp, onDoubleClick, cursor: string, preview: Shape | null, marquee: Box | null, snap: { shapeId: string; anchor: Anchor; point: Point } | null }`

Behaviour, from spec section 2:
- Creating a shape adds it on pointer up, with the current `Style`. Text and labels only use `stroke` and `size`. Shift keeps a square, circle or 45° angle. Shapes smaller than 4×4 units (a click) are dropped, except text, where a click places a box 200×40 units. After a shape, the tool returns to `select`; `pen` stays on.
- Pen points are simplified with `simplifyPoints(points, 0.5)` on pointer up.
- Select:
  - a click selects the `hitTest` result, extended with `expandGroups`; Shift adds to the selection; a drag on empty canvas draws the marquee (`shapesInBox`);
  - dragging the selection moves it with `translate`, throttled to 33 ms with `throttle-debounce`, with the last position always written;
  - box handles use `resize`; link handles move an end, with snapping from `nearestAnchor`, `maxDist` 16 screen pixels divided by `zoom`, attaching on release; the bend handle sets `bend`;
  - `doc.stopCapturing()` runs at every drag start and end.
- Pan: the Pan tool, the middle mouse button, or space held while dragging.
- A double-click on a shape, or on text, opens `TextEditor` (a positioned `<textarea>`) on its `label`. Enter with Shift adds a new line; Escape or a click outside commits the label.
- Pointer events call `setPointerCapture`.

- [ ] **Step 1: Implement `Overlay.tsx`.** It draws:
  - the selection box and the 8 box handles (only for a single box shape);
  - link end handles and the bend handle;
  - the 4 anchors of the shape under `snap`;
  - the marquee;
  - an outline in each remote user's colour around their selected shapes.

  Handle sizes are in screen pixels, divided by `zoom`.
- [ ] **Step 2: Implement `useTools.ts` and `TextEditor.tsx`.**
- [ ] **Step 3: Implement `Canvas.tsx`.**
  - The SVG gets `transform="scale(zoom) translate(-x, -y)"`, and the `grid` background is a pattern of dots every 20 units.
  - The left tool column uses Chakra `IconButton`s with tooltips naming each tool.
  - **Wheel and pinch:** `wheel` is registered with `{ passive: false }`. When `selected`, it calls `preventDefault()` and `stopPropagation()`, and zooms with `zoomAt(view, exp(-deltaY * 0.002), cursor)`. When not selected, the event is left alone.
- [ ] **Step 4: Type-check.** Run `npx nx run webapp:typecheck`. Expected: `Successfully ran target typecheck`.
- [ ] **Step 5: Commit.** `git commit -m "feat(drawing): canvas with tools, selection overlay and label editing"`

### Task 8: The app component, toolbar, saving and presence; remove tldraw

**Files:**
- Modify (rewrite): `D/index.ts`, `D/Drawing.tsx`
- Delete: `D/useYjsStore.ts`
- Modify: `package.json` and `yarn.lock` (remove `tldraw`), `apps/webapp/webpack.config.js` (the tldraw.css workaround around lines 38–60), `libs/applications/src/lib/components/AppWindow/AppWindow.tsx:466` (the comment)

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `D/index.ts`: `schema = z.object({ shapes: z.record(z.string(), z.unknown()), background: z.enum(['white', 'grid']) })`, and `init: Partial<state> = { shapes: {}, background: 'white' }`. Keep `name = 'Drawing'` and `export type DrawingApp = App<typeof name>`.
  - `D/Drawing.tsx` default export: `{ AppComponent, ToolbarComponent, GroupedToolbarComponent }`. `GroupedToolbarComponent` returns `null`.

- [ ] **Step 1: Rewrite `index.ts`.** Existing apps whose state has `fit`, `follow` and `camera` must still load: the schema is only used for new apps and types, and the app reads `state.shapes ?? {}`.
- [ ] **Step 2: Write `AppComponent`:**
  - **The document:**
    - `const { yApps } = useYjs()`; one `DrawingDoc` per `yApps.doc` and app id, created in `useMemo`, then `setDoc(appId, doc)`, and `destroy()` and `setDoc(appId, null)` on unmount;
    - when `yApps.provider` is synced (`provider.synced`, or on its `'sync'` event), `doc.seed(props.data.state.shapes)`.
  - **Saving:**
    - `doc.observe` triggers a debounce of 2000 ms;
    - on firing, if `isElectedSaver([...provider.awareness.getStates().keys()], yApps.doc.clientID)` and `prepareSave(shapes).ok`, call `updateState(props._id, { shapes })`;
    - if the save isn't ok, show a toast once per session: `This drawing is too large to save; remove some pen strokes`.
  - **Presence:** `provider.awareness.setLocalStateField('drawing:' + appId, selection)` whenever the selection changes. Remote selections are read from the other awareness states, each with the colour from `state.user.color`, which `useYjs` already sets.
  - **Keyboard,** from spec section 2: `onKeyDown` on a focusable wrapper `div` (`tabIndex={0}`, focused when the app is selected). It applies only when `selected` and no label is being edited, and it calls `stopPropagation()` on every key it handles.
  - **Rendering:** `<AppWindow app={props}><Canvas ... /></AppWindow>`.
- [ ] **Step 3: Write `ToolbarComponent`**, with the doc and selection from `useDrawingStore`. It uses Chakra `ButtonGroup`s, `Tooltip`s and `react-icons`, as the other app toolbars do:
  - stroke colour, fill colour (including "no fill"), S/M/L, and arrow heads. Each applies to the selection through `doc.update`, and also sets `style`.
  - undo and redo, disabled by `canUndo()` / `canRedo()`;
  - group (sets a new `group` id on the selection) and ungroup (removes `group`);
  - front / forward / backward / back with `reorder`, and the six alignments with `align`;
  - zoom out / zoom in / fit (`fitView` of `selectionBounds` of all shapes) / 100%;
  - background white / grid with `updateState`;
  - export:
    - download SVG / PNG with `exportSvg` + `svgToPng` + `downloadFile` (as `drawing.svg` / `drawing.png`);
    - save to the Asset Manager with a `ConfirmValueModal`. Title `Save Drawing in Asset Manager`, initial value `'drawing-' + format(new Date(), 'yyyy-MM-dd-HH:mm:ss') + '.png'`; an `.svg` ending uploads the SVG, otherwise PNG. Then `uploadToAssets`, and the toasts `Upload complete` / `Upload failed: <message>`.
- [ ] **Step 4: Remove tldraw.**
  - Delete `D/useYjsStore.ts`.
  - Run `yarn remove tldraw`, then `grep -rn tldraw package.json` (expected: no output).
  - Remove the tldraw.css workaround from `apps/webapp/webpack.config.js`, then run `npx nx build webapp --configuration=development`. Expected: success. If the build fails with a `url(%23` error from another stylesheet, restore the workaround with its comment updated instead.
  - Change the `AppWindow.tsx:466` comment to `e.g. the Drawing app draws on pointermove`.
- [ ] **Step 5: Check.**
  - `npx nx run webapp:typecheck`: success.
  - `npx nx run-many -t test`: all pass, including `applications`.
  - `npx nx run applications:lint`: no new errors in `D/`.
- [ ] **Step 6: Commit.** `git commit -m "feat(drawing): new Drawing app on Yjs with toolbar, saving and presence; remove tldraw"`

### Task 9: Documentation, manual test and PR

**Files:**
- Modify: `doc/Applications.md` (the `## Drawing` section, around line 243)

- [ ] **Step 1: Rewrite the `## Drawing` section** of `doc/Applications.md`, in the style of the neighbouring app sections (a description, then a toolbar table using `/icons/...`-style `<img>` tags like the other entries). It should cover the tools, labels, magnetic arrows, personal pan and zoom, undo, grouping, ordering, alignment and export. Remove "built on the TLDraw library".
- [ ] **Step 2: Hand over for the manual test.** The user runs the app and checks the behaviour themselves (spec section 5 "Manual test" is the checklist). The implementer only runs the quick checks in Step 3.
- [ ] **Step 3: Final checks** (AGENTS.md section 4):
  - `npx nx run webapp:typecheck`;
  - `npx nx build webapp --configuration=development`;
  - `npx nx test applications`.
- [ ] **Step 4: Commit the docs,** then push and open a PR against `dev`, after the user approves. The PR description covers the summary, the justification (the tldraw licence), the dependency change (tldraw removed, nothing added), the risks (old tldraw drawings open empty, though they were never saved; a new Jest target), and the manual test results.
