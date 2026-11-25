/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Drawing app: pointer handling for each tool. Creating, selecting, moving, resizing,
 * bending and attaching line ends, panning. Live edits are written to the shared document
 * at most every 33 ms; the final position is always written.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { throttle } from 'throttle-debounce';

import { Anchor, BoxShape, End, LinkShape, Shape, Shapes, isBox, isLink, newId } from '../model/shape';
import {
  Box,
  Handle,
  Point,
  boxShapeAt,
  expandGroups,
  hitTest,
  linkPoints,
  nearestAnchor,
  resize,
  shapeBounds,
  shapesTouchingBox,
  simplifyPoints,
  translate,
} from '../model/geometry';
import { DrawingDoc } from '../model/doc';
import { HANDLES, HANDLE_PX, handlePoint } from '../render/Overlay';
import { Tool, View, useDrawingStore, useEditor } from './store';
import { toDrawing } from './useView';

const SNAP_PX = 16;

// Cursor over each box resize handle
const RESIZE_CURSOR: Record<Handle, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
};
const MIN_CREATE = 4;

type Drag =
  | { kind: 'create'; start: Point; startEnd: End }
  | { kind: 'pen'; points: number[] }
  | { kind: 'move'; start: Point; ids: string[]; orig: Shapes }
  | { kind: 'resize'; id: string; handle: Handle; orig: BoxShape }
  | { kind: 'end'; id: string; which: 'start' | 'end'; orig: LinkShape }
  | { kind: 'bend'; id: string; orig: LinkShape }
  | { kind: 'marquee'; start: Point; base: string[] }
  | { kind: 'pan'; screen: Point; orig: View };

type Snap = { shapeId: string; anchor: Anchor; point: Point } | null;

const isCreateTool = (t: Tool) =>
  t === 'rect' || t === 'roundrect' || t === 'ellipse' || t === 'diamond' || t === 'line' || t === 'arrow' || t === 'text';

const normBox = (a: Point, b: Point): Box => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(b.x - a.x),
  h: Math.abs(b.y - a.y),
});

type Options = {
  appId: string;
  doc: DrawingDoc;
  shapes: Shapes;
  view: View;
  setView: (v: View) => void;
  svgRef: React.RefObject<SVGSVGElement>;
  spaceDown: React.MutableRefObject<boolean>;
};

export function useTools({ appId, doc, shapes, view, setView, svgRef, spaceDown }: Options) {
  const editor = useEditor(appId);
  const setSelection = useDrawingStore((s) => s.setSelection);
  const setTool = useDrawingStore((s) => s.setTool);
  const setEditing = useDrawingStore((s) => s.setEditing);

  const drag = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<Shape | null>(null);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [snap, setSnap] = useState<Snap>(null);
  const [dragging, setDragging] = useState(false);
  // Select tool: the cursor for what is under the pointer (a handle, the selection), kept during a drag
  const [hoverCursor, setHoverCursor] = useState('default');
  // Changes of the current drag, drawn right away; the shared document gets them at most every 33 ms
  const [live, setLive] = useState<Record<string, Partial<Shape>> | null>(null);

  const sendThrottled = useMemo(
    () => throttle(33, (patches: Record<string, Partial<Shape>>) => doc.update(patches, { drag: true })),
    [doc],
  );
  const last = useRef<Record<string, Partial<Shape>> | null>(null);
  const send = (patches: Record<string, Partial<Shape>>) => {
    last.current = patches;
    setLive(patches);
    sendThrottled(patches);
  };

  /** Pointer position in canvas pixels (the board's zoom and the app window's scale removed) */
  const local = useCallback(
    (e: { clientX: number; clientY: number }): Point => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const r = svg.getBoundingClientRect();
      const k = r.width ? svg.clientWidth / r.width : 1;
      return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
    },
    [svgRef],
  );

  const px = (v: number) => v / view.zoom;
  const nextZ = () => Math.max(0, ...Object.values(shapes).map((s) => s.z)) + 1;

  /** A free or attached end at p; attached when an anchor is close */
  const endAt = (p: Point, excludeId?: string): End => {
    const a = nearestAnchor(shapes, p, px(SNAP_PX), excludeId);
    setSnap(a);
    return a ? { x: a.point.x, y: a.point.y, shapeId: a.shapeId, anchor: a.anchor } : { x: p.x, y: p.y };
  };

  /** The shape being drawn from drag start to p, with the current style */
  const shapeFor = (tool: Tool, start: Point, startEnd: End, p: Point, shift: boolean): Shape | null => {
    const { style } = editor;
    const common = { id: 'preview', stroke: style.stroke, size: style.size, label: '', z: nextZ() };
    if (tool === 'line' || tool === 'arrow') {
      let end: End;
      if (shift) {
        // Lock to multiples of 45°
        const a = Math.round(Math.atan2(p.y - start.y, p.x - start.x) / (Math.PI / 4)) * (Math.PI / 4);
        const len = Math.hypot(p.x - start.x, p.y - start.y);
        end = { x: start.x + len * Math.cos(a), y: start.y + len * Math.sin(a) };
        setSnap(null);
      } else {
        end = endAt(p);
      }
      const heads = tool === 'arrow' ? style.heads : { start: 'none' as const, end: 'none' as const };
      return { ...common, type: tool, start: startEnd, end, bend: 0, heads };
    }
    if (tool === 'rect' || tool === 'roundrect' || tool === 'ellipse' || tool === 'diamond' || tool === 'text') {
      let b = normBox(start, p);
      if (shift) {
        const s = Math.max(b.w, b.h);
        b = { x: p.x < start.x ? start.x - s : start.x, y: p.y < start.y ? start.y - s : start.y, w: s, h: s };
      }
      return { ...common, type: tool, ...b, fill: tool === 'text' ? 'none' : style.fill };
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    // Capture on the svg itself: the shape under the pointer may re-render or disappear mid-drag
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const screen = local(e);
    const p = toDrawing(view, screen);
    const { tool, selection } = editor;
    setDragging(true);

    // Pan: the Pan tool, the middle button, or the space bar held
    if (tool === 'pan' || e.button === 1 || spaceDown.current) {
      drag.current = { kind: 'pan', screen, orig: view };
      if (tool === 'select') setHoverCursor('grabbing');
      return;
    }
    if (tool === 'pen') {
      drag.current = { kind: 'pen', points: [p.x, p.y] };
      return;
    }
    if (isCreateTool(tool)) {
      const startEnd = tool === 'line' || tool === 'arrow' ? endAt(p) : { x: p.x, y: p.y };
      drag.current = { kind: 'create', start: { x: startEnd.x, y: startEnd.y }, startEnd };
      return;
    }

    // Select tool: handles of a single selected shape first
    doc.stopCapturing();
    const single = selection.length === 1 ? shapes[selection[0]] : undefined;
    const near = (q: Point) => Math.hypot(q.x - p.x, q.y - p.y) <= px(HANDLE_PX);
    if (single && isLink(single)) {
      const { start, end, handle } = linkPoints(single, shapes);
      if (near(start)) return void (drag.current = { kind: 'end', id: single.id, which: 'start', orig: single });
      if (near(end)) return void (drag.current = { kind: 'end', id: single.id, which: 'end', orig: single });
      if (near(handle)) return void (drag.current = { kind: 'bend', id: single.id, orig: single });
    }
    if (single && isBox(single)) {
      const h = HANDLES.find((h) => near(handlePoint(single, h)));
      if (h) return void (drag.current = { kind: 'resize', id: single.id, handle: h, orig: single });
    }

    let hit = hitTest(shapes, p, px(4));
    // Inside an already selected shape (even a hollow one): drag the selection
    if (!hit && !e.shiftKey) {
      hit =
        selection.find((id) => {
          const b = shapes[id] && shapeBounds(shapes[id], shapes);
          return b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
        }) ?? null;
    }
    if (hit) {
      const unit = expandGroups(shapes, [hit]);
      let next = selection;
      if (e.shiftKey) {
        next = selection.includes(hit) ? selection.filter((id) => !unit.includes(id)) : [...new Set([...selection, ...unit])];
      } else if (!selection.includes(hit)) {
        next = unit;
      }
      setSelection(appId, next);
      drag.current = { kind: 'move', start: p, ids: next, orig: shapes };
      setHoverCursor('move');
    } else {
      const base = e.shiftKey ? selection : [];
      if (!e.shiftKey) setSelection(appId, []);
      drag.current = { kind: 'marquee', start: p, base };
    }
  };

  /** The Select tool's cursor at p: resize over box handles, move over line ends and the selection */
  const cursorAt = (p: Point): string => {
    const { selection } = editor;
    const near = (q: Point) => Math.hypot(q.x - p.x, q.y - p.y) <= px(HANDLE_PX);
    const single = selection.length === 1 ? shapes[selection[0]] : undefined;
    if (single && isLink(single)) {
      const { start, end, handle } = linkPoints(single, shapes);
      if (near(start) || near(end)) return 'move';
      if (near(handle)) return 'pointer';
    }
    if (single && isBox(single)) {
      const h = HANDLES.find((h) => near(handlePoint(single, h)));
      if (h) return RESIZE_CURSOR[h];
    }
    const inside = selection.some((id) => {
      const b = shapes[id] && shapeBounds(shapes[id], shapes);
      return b && p.x >= b.x - px(4) && p.x <= b.x + b.w + px(4) && p.y >= b.y - px(4) && p.y <= b.y + b.h + px(4);
    });
    return inside ? 'move' : 'default';
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) {
      // Hovering with the Select tool: show what a drag would do here
      if (editor.tool === 'select') {
        const c = cursorAt(toDrawing(view, local(e)));
        if (c !== hoverCursor) setHoverCursor(c);
      }
      return;
    }
    const screen = local(e);
    const p = toDrawing(view, screen);
    if (d.kind === 'pan') {
      setView({ ...d.orig, x: d.orig.x - (screen.x - d.screen.x) / view.zoom, y: d.orig.y - (screen.y - d.screen.y) / view.zoom });
    } else if (d.kind === 'pen') {
      d.points.push(p.x, p.y);
      const { style } = editor;
      setPreview({ id: 'preview', type: 'pen', stroke: style.stroke, size: style.size, label: '', z: nextZ(), points: [...d.points] });
    } else if (d.kind === 'create') {
      setPreview(shapeFor(editor.tool, d.start, d.startEnd, p, e.shiftKey));
    } else if (d.kind === 'move') {
      const dx = p.x - d.start.x;
      const dy = p.y - d.start.y;
      const patches: Record<string, Partial<Shape>> = {};
      for (const id of d.ids) if (d.orig[id]) patches[id] = translate(d.orig[id], dx, dy);
      send(patches);
    } else if (d.kind === 'resize') {
      send({ [d.id]: resize(d.orig, d.handle, p, e.shiftKey) });
    } else if (d.kind === 'end') {
      send({ [d.id]: { [d.which]: endAt(p, undefined) } as Partial<LinkShape> });
    } else if (d.kind === 'bend') {
      const { start, end } = linkPoints(d.orig, shapes);
      const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      const len = Math.hypot(end.x - start.x, end.y - start.y) || 1;
      const n = { x: (end.y - start.y) / len, y: -(end.x - start.x) / len };
      const bend = Math.round((p.x - mid.x) * n.x + (p.y - mid.y) * n.y);
      // A small bend snaps back to straight
      send({ [d.id]: { bend: Math.abs(bend) < px(6) ? 0 : bend } });
    } else if (d.kind === 'marquee') {
      const b = normBox(d.start, p);
      setMarquee(b);
      setSelection(appId, [...new Set([...d.base, ...expandGroups(shapes, shapesTouchingBox(shapes, b))])]);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    setSnap(null);
    setMarquee(null);
    if (!d) return;
    const p = toDrawing(view, local(e));
    if (d.kind === 'pan' && editor.tool === 'select') setHoverCursor('default');

    if (d.kind === 'pen') {
      setPreview(null);
      if (d.points.length >= 4) {
        const { style } = editor;
        doc.add({
          id: newId(),
          type: 'pen',
          stroke: style.stroke,
          size: style.size,
          label: '',
          z: nextZ(),
          points: simplifyPoints(d.points, 0.5),
        });
      }
      return;
    }
    if (d.kind === 'create') {
      setPreview(null);
      const tool = editor.tool;
      let shape = shapeFor(tool, d.start, d.startEnd, p, e.shiftKey);
      setSnap(null);
      if (!shape) return;
      const id = newId();
      if (isBox(shape) && (shape.w < MIN_CREATE || shape.h < MIN_CREATE)) {
        // A click: only text gets a default box, other shapes are dropped
        if (tool !== 'text') return;
        shape = { ...shape, x: d.start.x, y: d.start.y, w: 200, h: 40 };
      }
      if (isLink(shape)) {
        const a = linkPoints(shape, shapes);
        if (Math.hypot(a.end.x - a.start.x, a.end.y - a.start.y) < MIN_CREATE) return;
      }
      doc.add({ ...shape, id });
      setSelection(appId, [id]);
      setTool(appId, 'select');
      if (tool === 'text') setEditing(appId, id);
      return;
    }
    // End of a drag on existing shapes: write the last position and close the undo step
    if (last.current) {
      sendThrottled.cancel({ upcomingOnly: true });
      doc.update(last.current, { drag: true });
      last.current = null;
    }
    setLive(null);
    doc.stopCapturing();
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const p = toDrawing(view, local(e));
    // A shape or line under the pointer, or else any shape whose inside was clicked (hollow ones too)
    const hit = hitTest(shapes, p, px(4)) ?? boxShapeAt(shapes, p);
    if (hit && shapes[hit].type !== 'pen') {
      setSelection(appId, [hit]);
      setEditing(appId, hit);
    }
  };

  const tool = editor.tool;
  const cursor = tool === 'pan' ? (dragging ? 'grabbing' : 'grab') : tool === 'select' ? hoverCursor : 'crosshair';

  return { onPointerDown, onPointerMove, onPointerUp, onDoubleClick, cursor, preview, marquee, snap, dragging, live };
}
