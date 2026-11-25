/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Drawing app: pure geometry on shapes (no React, no Yjs).
 * Coordinates are drawing units; the view's zoom is applied by the caller.
 */

import { Anchor, BoxShape, End, LinkShape, Shape, Shapes, STROKE_WIDTH, byLayer, isBox, isLink, isPen } from './shape';

export type Point = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };
export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type OrderOp = 'front' | 'forward' | 'backward' | 'back';
export type Handle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export const ANCHORS: Anchor[] = ['top', 'right', 'bottom', 'left'];
const MIN_SIZE = 8;

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Middle of the side named by the anchor */
export function anchorPoint(box: Box, anchor: Anchor): Point {
  switch (anchor) {
    case 'top':
      return { x: box.x + box.w / 2, y: box.y };
    case 'right':
      return { x: box.x + box.w, y: box.y + box.h / 2 };
    case 'bottom':
      return { x: box.x + box.w / 2, y: box.y + box.h };
    case 'left':
      return { x: box.x, y: box.y + box.h / 2 };
  }
}

/** The closest anchor of any box shape within maxDist of p, if any */
export function nearestAnchor(
  shapes: Shapes,
  p: Point,
  maxDist: number,
  excludeId?: string,
): { shapeId: string; anchor: Anchor; point: Point } | null {
  let best: { shapeId: string; anchor: Anchor; point: Point } | null = null;
  let bestDist = maxDist;
  for (const s of Object.values(shapes)) {
    if (!isBox(s) || s.id === excludeId) continue;
    for (const anchor of ANCHORS) {
      const point = anchorPoint(s, anchor);
      const d = dist(point, p);
      if (d <= bestDist) {
        bestDist = d;
        best = { shapeId: s.id, anchor, point };
      }
    }
  }
  return best;
}

/** Where a line or arrow end is: its target's anchor, or its stored point when the target is gone */
export function resolveEnd(shapes: Shapes, end: End): Point {
  if (end.shapeId && end.anchor) {
    const target = shapes[end.shapeId];
    if (target && isBox(target)) return anchorPoint(target, end.anchor);
  }
  return { x: end.x, y: end.y };
}

/**
 * Path of a line or arrow. A bend of 0 is straight; otherwise a quadratic curve through
 * `handle`, which sits `bend` units from the middle on the left-hand normal of start→end.
 */
export function linkPath(start: Point, end: Point, bend: number): { d: string; control: Point; handle: Point } {
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const n = { x: dy / len, y: -dx / len };
  const handle = { x: mid.x + n.x * bend, y: mid.y + n.y * bend };
  const control = { x: mid.x + n.x * 2 * bend, y: mid.y + n.y * 2 * bend };
  const r = (v: number) => Math.round(v * 100) / 100 + 0; // + 0 turns -0 into 0
  const d =
    bend === 0
      ? `M ${r(start.x)} ${r(start.y)} L ${r(end.x)} ${r(end.y)}`
      : `M ${r(start.x)} ${r(start.y)} Q ${r(control.x)} ${r(control.y)} ${r(end.x)} ${r(end.y)}`;
  return { d, control, handle };
}

/** The resolved end points and the curve's handle of a link */
export function linkPoints(link: LinkShape, shapes: Shapes): { start: Point; end: Point; handle: Point; control: Point; d: string } {
  const start = resolveEnd(shapes, link.start);
  const end = resolveEnd(shapes, link.end);
  return { start, end, ...linkPath(start, end, link.bend) };
}

/** Point at t on the link's curve (quadratic Bézier, or the straight segment) */
function curvePoint(start: Point, control: Point, end: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
    y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
  };
}

function boxOf(points: Point[]): Box {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function penPoints(points: number[]): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points.length; i += 2) out.push({ x: points[i], y: points[i + 1] });
  return out;
}

/** Bounding box of a shape, in drawing units */
export function shapeBounds(shape: Shape, shapes: Shapes): Box {
  if (isBox(shape)) return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
  if (isPen(shape)) return shape.points.length ? boxOf(penPoints(shape.points)) : { x: 0, y: 0, w: 0, h: 0 };
  const { start, end, handle } = linkPoints(shape, shapes);
  return boxOf([start, end, handle]);
}

/** Union of the bounds of the given shapes, or null when there are none */
export function selectionBounds(ids: string[], shapes: Shapes): Box | null {
  const boxes = ids.filter((id) => shapes[id]).map((id) => shapeBounds(shapes[id], shapes));
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const x2 = Math.max(...boxes.map((b) => b.x + b.w));
  const y2 = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: x2 - x, h: y2 - y };
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

function distToPolyline(p: Point, pts: Point[]): number {
  if (pts.length === 1) return dist(p, pts[0]);
  let d = Infinity;
  for (let i = 1; i < pts.length; i++) d = Math.min(d, distToSegment(p, pts[i - 1], pts[i]));
  return d;
}

/** Points along a link's curve, for hit-testing */
function linkSamples(link: LinkShape, shapes: Shapes): Point[] {
  const { start, end, control } = linkPoints(link, shapes);
  if (link.bend === 0) return [start, end];
  const out: Point[] = [];
  for (let i = 0; i <= 32; i++) out.push(curvePoint(start, control, end, i / 32));
  return out;
}

/** Is p inside the box shape's outline (ignoring its fill)? */
function insideBox(s: BoxShape, p: Point, grow: number): boolean {
  const rx = s.w / 2 + grow;
  const ry = s.h / 2 + grow;
  const dx = p.x - (s.x + s.w / 2);
  const dy = p.y - (s.y + s.h / 2);
  if (rx <= 0 || ry <= 0) return false;
  if (s.type === 'ellipse') return (dx / rx) ** 2 + (dy / ry) ** 2 <= 1;
  if (s.type === 'diamond') return Math.abs(dx) / rx + Math.abs(dy) / ry <= 1;
  return Math.abs(dx) <= rx && Math.abs(dy) <= ry;
}

function hits(s: Shape, shapes: Shapes, p: Point, tolerance: number): boolean {
  const half = STROKE_WIDTH[s.size] / 2;
  if (isBox(s)) {
    // Text, filled shapes and labelled shapes are hit anywhere inside; hollow ones near their outline
    if (s.type === 'text' || s.fill !== 'none' || s.label) return insideBox(s, p, tolerance + half);
    return insideBox(s, p, tolerance + half) && !insideBox(s, p, -(tolerance + half));
  }
  if (isPen(s)) return distToPolyline(p, penPoints(s.points)) <= tolerance + half * 2;
  return distToPolyline(p, linkSamples(s, shapes)) <= tolerance + half;
}

/** Id of the topmost shape under p, or null */
export function hitTest(shapes: Shapes, p: Point, tolerance: number): string | null {
  const ordered = Object.values(shapes).sort((a, b) => byLayer(b, a));
  for (const s of ordered) if (hits(s, shapes, p, tolerance)) return s.id;
  return null;
}

/** Does the segment a–b cross or lie inside the box? (Liang–Barsky clipping) */
function segmentTouchesBox(a: Point, b: Point, box: Box): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const edges: [number, number][] = [
    [-dx, a.x - box.x],
    [dx, box.x + box.w - a.x],
    [-dy, a.y - box.y],
    [dy, box.y + box.h - a.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
  }
  return true;
}

const polylineTouchesBox = (pts: Point[], box: Box): boolean =>
  pts.length === 1 ? segmentTouchesBox(pts[0], pts[0], box) : pts.some((p, i) => i > 0 && segmentTouchesBox(pts[i - 1], p, box));

/** Outline of a box shape as a closed polygon (an ellipse approximated by 32 points) */
function outlinePoints(s: BoxShape): Point[] {
  const { x, y, w, h } = s;
  if (s.type === 'diamond')
    return [
      { x: x + w / 2, y },
      { x: x + w, y: y + h / 2 },
      { x: x + w / 2, y: y + h },
      { x, y: y + h / 2 },
    ];
  if (s.type === 'ellipse') {
    const pts: Point[] = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      pts.push({ x: x + w / 2 + (w / 2) * Math.cos(a), y: y + h / 2 + (h / 2) * Math.sin(a) });
    }
    return pts;
  }
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

/** Topmost box shape whose inside contains p, filled or not (for double-click to edit a label) */
export function boxShapeAt(shapes: Shapes, p: Point): string | null {
  const ordered = Object.values(shapes).sort((a, b) => byLayer(b, a));
  for (const s of ordered) if (isBox(s) && insideBox(s, p, 0)) return s.id;
  return null;
}

/** Ids of the shapes the box touches: crossing their outline or path, or inside them, or around them */
export function shapesTouchingBox(shapes: Shapes, box: Box): string[] {
  return Object.values(shapes)
    .filter((s) => {
      // Quick reject on the bounding box
      const b = shapeBounds(s, shapes);
      if (b.x > box.x + box.w || b.x + b.w < box.x || b.y > box.y + box.h || b.y + b.h < box.y) return false;
      if (isPen(s)) return polylineTouchesBox(penPoints(s.points), box);
      if (isLink(s)) return polylineTouchesBox(linkSamples(s, shapes), box);
      const outline = outlinePoints(s);
      // The box crosses the outline, lies inside the shape, or contains it
      return polylineTouchesBox([...outline, outline[0]], box) || insideBox(s, { x: box.x, y: box.y }, 0);
    })
    .map((s) => s.id);
}

/** Fields that move a shape by (dx, dy). Attached link ends stay attached. */
export function translate(shape: Shape, dx: number, dy: number): Partial<Shape> {
  if (isBox(shape)) return { x: shape.x + dx, y: shape.y + dy };
  if (isPen(shape)) return { points: shape.points.map((v, i) => v + (i % 2 === 0 ? dx : dy)) };
  const move = (e: End): End => (e.shapeId ? e : { x: e.x + dx, y: e.y + dy });
  return { start: move(shape.start), end: move(shape.end) };
}

/** New box when dragging one of the 8 handles to p. keepRatio keeps the width/height ratio. */
export function resize(shape: BoxShape, handle: Handle, p: Point, keepRatio: boolean): Pick<BoxShape, 'x' | 'y' | 'w' | 'h'> {
  let x1 = shape.x;
  let y1 = shape.y;
  let x2 = shape.x + shape.w;
  let y2 = shape.y + shape.h;
  if (handle.includes('w')) x1 = Math.min(p.x, x2 - MIN_SIZE);
  if (handle.includes('e')) x2 = Math.max(p.x, x1 + MIN_SIZE);
  if (handle.includes('n')) y1 = Math.min(p.y, y2 - MIN_SIZE);
  if (handle.includes('s')) y2 = Math.max(p.y, y1 + MIN_SIZE);
  let w = x2 - x1;
  let h = y2 - y1;
  if (keepRatio && shape.w > 0 && shape.h > 0) {
    const ratio = shape.w / shape.h;
    if (handle.length === 2) {
      // Corner: follow the larger change
      if (w / h > ratio) h = w / ratio;
      else w = h * ratio;
    } else if (handle === 'e' || handle === 'w') h = w / ratio;
    else w = h * ratio;
    if (handle.includes('w')) x1 = x2 - w;
    if (handle.includes('n')) y1 = y2 - h;
  }
  return { x: x1, y: y1, w, h };
}

/** The ids plus every member of every group they touch */
export function expandGroups(shapes: Shapes, ids: string[]): string[] {
  const groups = new Set(ids.map((id) => shapes[id]?.group).filter(Boolean));
  const out = new Set(ids.filter((id) => shapes[id]));
  for (const s of Object.values(shapes)) if (s.group && groups.has(s.group)) out.add(s.id);
  return [...out];
}

/** Align shapes; each group moves as one unit. Fewer than two units: nothing to do. */
export function align(shapes: Shapes, ids: string[], mode: AlignMode): Record<string, Partial<Shape>> {
  // Units: one per group, one per ungrouped shape
  const units = new Map<string, string[]>();
  for (const id of expandGroups(shapes, ids)) {
    const key = shapes[id].group ?? 'shape:' + id;
    units.set(key, [...(units.get(key) ?? []), id]);
  }
  if (units.size < 2) return {};
  const all = selectionBounds([...units.values()].flat(), shapes) as Box;
  const patches: Record<string, Partial<Shape>> = {};
  for (const members of units.values()) {
    const b = selectionBounds(members, shapes) as Box;
    let dx = 0;
    let dy = 0;
    if (mode === 'left') dx = all.x - b.x;
    if (mode === 'center') dx = all.x + all.w / 2 - (b.x + b.w / 2);
    if (mode === 'right') dx = all.x + all.w - (b.x + b.w);
    if (mode === 'top') dy = all.y - b.y;
    if (mode === 'middle') dy = all.y + all.h / 2 - (b.y + b.h / 2);
    if (mode === 'bottom') dy = all.y + all.h - (b.y + b.h);
    if (dx === 0 && dy === 0) continue;
    for (const id of members) patches[id] = translate(shapes[id], dx, dy);
  }
  return patches;
}

/** New z values for the ids only; other shapes keep theirs */
export function reorder(shapes: Shapes, ids: string[], op: OrderOp): Record<string, number> {
  const moving = new Set(ids.filter((id) => shapes[id]));
  const sorted = Object.values(shapes).sort(byLayer);
  const mine = sorted.filter((s) => moving.has(s.id));
  const others = sorted.filter((s) => !moving.has(s.id));
  const out: Record<string, number> = {};
  if (!mine.length) return out;
  if (op === 'front' || op === 'back') {
    // Keep the moved shapes' own order, after the maximum or before the minimum
    const zs = others.map((s) => s.z);
    if (op === 'front') {
      const top = zs.length ? Math.max(...zs) : 0;
      mine.forEach((s, i) => (out[s.id] = top + i + 1));
    } else {
      const bottom = zs.length ? Math.min(...zs) : 0;
      mine.forEach((s, i) => (out[s.id] = bottom - mine.length + i));
    }
    return out;
  }
  // forward / backward: step over the nearest other shape, landing between it and the next one
  for (const s of mine) {
    if (op === 'forward') {
      const above = others.filter((o) => o.z > s.z);
      if (!above.length) continue;
      out[s.id] = above.length > 1 ? (above[0].z + above[1].z) / 2 : above[0].z + 1;
    } else {
      const below = others.filter((o) => o.z < s.z).reverse();
      if (!below.length) continue;
      out[s.id] = below.length > 1 ? (below[0].z + below[1].z) / 2 : below[0].z - 1;
    }
  }
  return out;
}

/** Ramer–Douglas–Peucker on a flat [x0, y0, ...] list, then rounding to 0.1 */
export function simplifyPoints(points: number[], tolerance: number): number[] {
  const pts = penPoints(points);
  if (pts.length <= 2) return pts.flatMap((p) => [round1(p.x), round1(p.y)]);
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop() as [number, number];
    let maxD = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = distToSegment(pts[i], pts[a], pts[b]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx >= 0 && maxD > tolerance) {
      keep[idx] = true;
      stack.push([a, idx], [idx, b]);
    }
  }
  return pts.filter((_, i) => keep[i]).flatMap((p) => [round1(p.x), round1(p.y)]);
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** For links attached to removed shapes: those ends become free points where they are now */
export function detachFrom(shapes: Shapes, removedIds: string[]): Record<string, Partial<LinkShape>> {
  const removed = new Set(removedIds);
  const patches: Record<string, Partial<LinkShape>> = {};
  for (const s of Object.values(shapes)) {
    if (!isLink(s) || removed.has(s.id)) continue;
    const free = (e: End): End | null => {
      if (!e.shapeId || !removed.has(e.shapeId)) return null;
      const p = resolveEnd(shapes, e);
      return { x: p.x, y: p.y };
    };
    const start = free(s.start);
    const end = free(s.end);
    if (start || end) patches[s.id] = { ...(start ? { start } : {}), ...(end ? { end } : {}) };
  }
  return patches;
}
