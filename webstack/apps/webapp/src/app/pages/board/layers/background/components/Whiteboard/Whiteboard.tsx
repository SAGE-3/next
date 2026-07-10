/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// This is a complete React component for the SAGE whiteboard.  It supports
// drawing free‑hand lines and rectangles using pointer events.  Lines and
// rectangles are stored in Yjs maps and synchronised with other users via
// the SAGE annotation store.  Rectangles are drawn by clicking once to
// set the first corner, dragging to the opposite corner, and releasing to
// finalise the shape.  Lines are drawn by pressing down and moving.

/* 
<--------------------------------------------------------------------------------------------TODO-------------------------------------------------------------------------------------------->
When making rectangle, thickness of marker does not reflect the 'start' point
Implement circle drawing tool
Can't select and move lines/shapes
<--------------------------------------------------------------------------------------------TODO-------------------------------------------------------------------------------------------->
*/

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Simplify from 'simplify-js';

// Yjs Imports
import * as Y from 'yjs';

// SAGE Imports
import {
  YjsRoomConnection,
  useAbility,
  useAnnotationStore,
  useHotkeys,
  useThrottleScale,
  useUIStore,
  useUser,
  useUserSettings,
  useYjs,
} from '@sage3/frontend';

import { Line, ShapeView } from './Line';
import { useDragAndDropBoard } from '../DragAndDropBoard';

/**
 * Minimum pointer travel (in screen pixels) between stored samples while a
 * freehand stroke is in progress.  Larger values yield a smaller/cheaper draft
 * path at the cost of finer detail; the pointer-up Simplify pass runs regardless.
 */
const MIN_DRAFT_SAMPLE_PX = 2;

/**
 * Freehand simplification tolerance, expressed in SCREEN pixels and converted to
 * board units at commit time (divided by the current scale).  A fixed board-unit
 * tolerance would over-simplify strokes drawn while zoomed in (discarding the
 * detail the draft decimation preserved) and under-simplify strokes drawn while
 * zoomed out.  0.5px matches the previous hard-coded 0.5 board-unit value at 1x.
 */
const SIMPLIFY_TOL_PX = 0.5;

/**
 * Trailing debounce (ms) for persisting annotations.  Rapid stroke commits are
 * coalesced into a single save; forced flushes on tab-hide/unload and tool/board
 * change guarantee durability.  Persisting each stroke immediately would PUT the
 * entire whiteboardLines array (O(board)) on every stroke.
 */
const SAVE_DEBOUNCE_MS = 1500;

/**
 * Cold-load hydration tuning.  Persisted annotations are loaded into Yjs in
 * chunks — each chunk is a SINGLE Yjs transaction plus one batched array push
 * (vs. a transaction + push per stroke) — and the loop yields to the event loop
 * between chunks so a very large board (tens of thousands of strokes) renders
 * progressively instead of freezing the main thread.  To bound the O(n) bbox
 * re-index, the visible set is refreshed only every RENDER_EVERY_CHUNKS chunks
 * (plus the first and last).
 */
const HYDRATE_CHUNK_SIZE = 2000;
const RENDER_EVERY_CHUNKS = 4;

/**
 * Round to 0.1 board units — matching the stroke renderer's own `toFixed(1)`
 * precision.  Finer than integer rounding so strokes stay smooth when zoomed in
 * (up to 6x, 0.1 unit ≈ 0.6 screen px), while not exceeding what the SVG path
 * can represent.  Rendered path size is unaffected (it depends on point count).
 */
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Metadata for the shape currently being drawn (kept local until finalized). */
type DraftShape = {
  id: string;
  type: string;
  userColor: string;
  alpha: number;
  size: number;
  userId?: string;
};

/**
 * Extra viewport margin (fraction of the visible board rect) used when culling
 * off-screen annotations, so shapes are rendered slightly before they scroll
 * into view during a pan.
 */
const VIEWPORT_CULL_MARGIN = 0.25;

type ShapeBBox = { minX: number; minY: number; maxX: number; maxY: number };

/** An indexed shape: the live Y.Map plus its cached bounding box for culling. */
type IndexedLine = { line: Y.Map<any>; bbox: ShapeBBox | null };

/**
 * Compute the (board-space) bounding box of a shape from its stored points,
 * expanded by half the stroke width so the outline is fully covered.  Reads the
 * Yjs points array directly — no React subscription — so off-screen shapes can
 * be culled without mounting a component for each.
 */
function computeShapeBBox(line: Y.Map<any>): ShapeBBox | null {
  const pts = line.get('points') as Y.Array<number> | undefined;
  if (!pts || pts.length < 2) return null;
  const arr = pts.toArray();
  const size = (line.get('size') as number) ?? 5;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < arr.length; i += 2) {
    const x = arr[i];
    const y = arr[i + 1];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const m = size / 2 + 1;
  return { minX: minX - m, minY: minY - m, maxX: maxX + m, maxY: maxY + m };
}

/** Reference-equality comparison of two Y.Map arrays (same length, same items). */
function sameLineArray(a: Y.Map<any>[], b: Y.Map<any>[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Build a single Yjs shape map from a persisted/plain line record. */
function buildYLineMap(line: any): Y.Map<any> {
  const pts = new Y.Array<number>();
  // Persisted points are a flat [x, y, x, y, ...] array.
  pts.push(line.points);
  const yLine = new Y.Map<any>();
  yLine.set('id', line.id);
  yLine.set('type', line.type ?? 'line');
  yLine.set('points', pts);
  yLine.set('userColor', line.userColor);
  yLine.set('alpha', line.alpha);
  yLine.set('size', line.size);
  yLine.set('isComplete', true);
  yLine.set('userId', line.userId);
  yLine.set('text', line.text);
  return yLine;
}

/**
 * Content signature of a shape (type + style + text + points) used to detect
 * duplicate strokes.  Two shapes with the same signature are visually identical,
 * so keeping one is safe — unlike de-duping by id, this never drops distinct
 * strokes that merely collided on an old Date.now() id.
 */
function shapeSignature(json: any): string {
  return [
    json.type ?? 'line',
    json.userColor,
    json.size,
    json.alpha,
    json.text ?? '',
    (json.points || []).join(','),
  ].join('|');
}

/**
 * Return one copy of each unique shape (by content signature), preserving order.
 * Used to clean up boards that stored the same stroke many times.
 */
function dedupeLines(raw: any[]): any[] {
  const seen = new Set<string>();
  const unique: any[] = [];
  for (const line of raw) {
    const sig = shapeSignature(line);
    if (seen.has(sig)) continue;
    seen.add(sig);
    unique.push(line);
  }
  return unique;
}

// Stable, guaranteed-unique React key per shape.  Some persisted boards contain
// duplicate shape ids, so keying by id alone triggers "two children with the
// same key" warnings and reconciliation bugs.  Keying by the Y.Map's object
// identity (via a WeakMap counter) is both unique and stable across re-renders.
let shapeKeyCounter = 0;
const shapeKeys = new WeakMap<object, string>();
function shapeKey(line: Y.Map<any>): string {
  let k = shapeKeys.get(line);
  if (k === undefined) {
    k = `s${shapeKeyCounter++}`;
    shapeKeys.set(line, k);
  }
  return k;
}

/**
 * The committed (finalized) annotations layer.  Memoized and keyed by stable
 * per-shape identity so that drawing an in-progress stroke (which re-renders the
 * parent on every pointer move) does NOT reconcile the potentially-thousands of
 * finalized shapes.  It only re-renders when the visible set or erase handler
 * changes.
 */
const CommittedAnnotations = memo(function CommittedAnnotations(props: {
  lines: Y.Map<any>[];
  onErase: (id: string) => void;
}) {
  return (
    <>
      {props.lines.map((line) => (
        <Line key={shapeKey(line)} line={line} onClick={props.onErase} />
      ))}
    </>
  );
});

type WhiteboardProps = {
  boardId: string;
  roomId: string;
};

/**
 * Whiteboard component supporting free‑hand and rectangle drawing.
 */
export function Whiteboard(props: WhiteboardProps) {
  // Settings
  const { settings } = useUserSettings();
  const primaryActionMode = settings.primaryActionMode; // 'pen', 'eraser', 'rectangle', etc.

  const { user } = useUser();

  // Scale throttling hook to reduce the frequency of scale recalculation
  const scale = useThrottleScale(250);

  // Ability: whether the current user can annotate this board
  const canAnnotate = useAbility('update', 'boards');

  // UI Store state
  const boardPosition = useUIStore((state) => state.boardPosition);
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const clearMarkers = useUIStore((state) => state.clearMarkers);
  const setClearMarkers = useUIStore((state) => state.setClearMarkers);
  const clearAllMarkers = useUIStore((state) => state.clearAllMarkers);
  const undoLastMarker = useUIStore((state) => state.undoLastMarker);
  const setUndoLastMarker = useUIStore((state) => state.setUndoLastMarker);
  const markerOpacity = useUIStore((state) => state.markerOpacity);
  const markerSize = useUIStore((state) => state.markerSize);
  const setClearAllMarkers = useUIStore((state) => state.setClearAllMarkers);
  const color = useUIStore((state) => state.markerColor);
  const boardSynced = useUIStore((state) => state.boardSynced);

  // Annotations Store
  const updateAnnotation = useAnnotationStore((state) => state.update);
  const appendLines = useAnnotationStore((state) => state.appendLines);
  const subAnnotations = useAnnotationStore((state) => state.subscribeToBoard);
  const unsubAnnotations = useAnnotationStore((state) => state.unsubscribe);
  const getAnnotations = useAnnotationStore((state) => state.getAnnotations);

  // Yjs room and state
  const { yAnnotations } = useYjs();
  const [yDoc, setYdoc] = useState<Y.Doc | null>(null);
  const [yLines, setYlines] = useState<Y.Array<Y.Map<any>> | null>(null);
  const [lines, setLines] = useState<Y.Map<any>[]>([]);
  const activeTouchCount = useRef(0);
  // True while the cold-load hydration is populating yLines in chunks; the array
  // observer defers to the explicit progressive setLines during this window.
  const hydrating = useRef(false);

  // In-progress stroke: held entirely in local state so that pointer moves do
  // NOT write to the Yjs document.  The shape is committed to Yjs exactly once,
  // on pointer-up.  rDraftPoints is the authoritative point list (read on
  // finalize); draftPoints mirrors it into state to drive the live preview.
  const rDraft = useRef<DraftShape | null>(null);
  const rDraftPoints = useRef<number[][]>([]);
  const [draftPoints, setDraftPoints] = useState<number[][]>([]);

  // Preview cursor state
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  // Drag and Drop On Board
  const { dragProps, renderContent } = useDragAndDropBoard({ roomId: props.roomId, boardId: props.boardId });

  /**
   * Full save: serialize the entire Yjs lines array and PUT it.  O(board).  Used
   * for destructive ops (clear/undo/erase) and as reconciliation if an
   * incremental append ever fails.  Only runs when yLines and boardId are set.
   */
  function updateBoardLines() {
    if (yLines && props.boardId) {
      const serialized = yLines.toJSON();
      updateAnnotation(props.boardId, { whiteboardLines: serialized });
    }
  }

  // Incremental persistence.  New strokes are queued and appended with a single
  // O(stroke) request per debounce window; only destructive ops (or a failed
  // append) fall back to the O(board) full save.  Rapid commits coalesce, and a
  // flush is forced on tab-hide/unload and tool/board change so nothing is lost.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDirty = useRef(false);
  const pendingAppends = useRef<any[]>([]); // serialized shapes awaiting append
  const needsFullSave = useRef(false); // a remove/clear (or append failure) occurred

  // Decide append-vs-full and execute.  A pending full save supersedes queued
  // appends (they are already present in the serialized array).
  function persist() {
    if (needsFullSave.current) {
      needsFullSave.current = false;
      pendingAppends.current = [];
      updateBoardLines();
    } else if (pendingAppends.current.length > 0 && props.boardId) {
      const batch = pendingAppends.current;
      pendingAppends.current = [];
      appendLines(props.boardId, batch).then((ok) => {
        if (!ok) {
          // Re-queue as a reconciling full save on the next flush.
          needsFullSave.current = true;
          saveDirty.current = true;
          scheduleSave();
        }
      });
    }
  }

  // Latest-ref so the stable save helpers below always call the current closure.
  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });

  // Schedule a trailing save — used for high-frequency stroke commits.
  const scheduleSave = useCallback(() => {
    saveDirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      if (!saveDirty.current) return;
      saveDirty.current = false;
      persistRef.current();
    }, SAVE_DEBOUNCE_MS);
  }, []);

  // Flush a pending save immediately, if any — used for tab-hide/unload/unmount.
  const flushSave = useCallback(() => {
    if (!saveDirty.current) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    saveDirty.current = false;
    persistRef.current();
  }, []);

  // Save immediately — used for infrequent destructive ops (clear/undo/erase).
  const saveNow = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    saveDirty.current = false;
    persistRef.current();
  }, []);

  // Force a full (reconciling) save immediately — for destructive ops that
  // change existing shapes, where an incremental append cannot express the change.
  const saveFullNow = useCallback(() => {
    needsFullSave.current = true;
    saveNow();
  }, [saveNow]);

  // Force a flush when the tab is hidden or the page is unloaded.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    window.addEventListener('beforeunload', flushSave);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', flushSave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flushSave]);

  // Flush pending saves when the drawing tool changes or the component unmounts.
  useEffect(() => {
    return () => {
      flushSave();
    };
  }, [primaryActionMode, flushSave]);

  // DEV-ONLY: generate N freehand strokes for performance testing at scale.
  // Pushes generated shapes straight into the Yjs array (same path a real
  // stroke commit uses), spread over a grid so both zoomed-in (culling) and
  // zoomed-out (all-visible) regimes can be exercised.  Persists via the normal
  // debounced save, so a reload cold-loads them.  Call from the browser
  // console: seedStrokes(3000).  Stripped from production builds.
  function seedTestStrokes(count: number) {
    if (!yLines || !yDoc) return;
    const colors = ['red', 'blue', 'green', 'orange', 'purple', 'teal', 'pink', 'cyan'];
    const cols = Math.ceil(Math.sqrt(count));
    const spacing = 400; // board units between strokes
    const ox = boardWidth / 2 - (cols * spacing) / 2;
    const oy = boardHeight / 2 - (cols * spacing) / 2;
    yDoc.transact(() => {
      for (let i = 0; i < count; i++) {
        const gx = ox + (i % cols) * spacing;
        const gy = oy + Math.floor(i / cols) * spacing;
        const n = 8 + Math.floor(Math.random() * 20); // ~8–28 points per squiggle
        let x = gx;
        let y = gy;
        const flat: number[] = [];
        for (let p = 0; p < n; p++) {
          x += (Math.random() - 0.5) * 60;
          y += (Math.random() - 0.5) * 60;
          flat.push(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
        }
        const pts = new Y.Array<number>();
        pts.push(flat);
        const yShape = new Y.Map<any>();
        yShape.set('id', `seed-${Date.now()}-${i}`);
        yShape.set('type', 'line');
        yShape.set('points', pts);
        yShape.set('userColor', colors[i % colors.length]);
        yShape.set('alpha', 0.8);
        yShape.set('size', 15);
        yShape.set('isComplete', true);
        yShape.set('userId', user?._id);
        yShape.set('text', '');
        yLines.push([yShape]);
      }
    });
    // Seeded shapes are pushed straight into yLines (not queued as appends), so
    // persist the whole array once.
    saveFullNow();
    console.log(`[seedStrokes] generated ${count} freehand strokes`);
  }

  // Expose the seeder on window in development builds only.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    (window as any).seedStrokes = seedTestStrokes;
    return () => {
      delete (window as any).seedStrokes;
    };
  }, [yLines, yDoc, boardWidth, boardHeight, user, scheduleSave]);

  /**
   * Cancel and discard the in-progress stroke (if any).  Called when a second
   * touch finger arrives so the initial single-finger touch doesn't leave a
   * tiny dot behind during a pan/zoom gesture.  Since the in-progress stroke
   * lives only in local state, this never touches the Yjs document.
   */
  function cancelInProgressStroke() {
    rDraft.current = null;
    rDraftPoints.current = [];
    setDraftPoints([]);
    setCursorPosition(null);
  }

  /**
   * Convert pointer coordinates from client space to board space, accounting
   * for board position and current scale.  Returns an array [x, y].
   */
  const getPoint = useCallback(
    (x: number, y: number) => {
      const localX = x / scale - boardPosition.x;
      const localY = y / scale - boardPosition.y;
      return [localX, localY];
    },
    [boardPosition.x, boardPosition.y, scale],
  );

  /**
   * Yjs observer registration: whenever the Yjs array changes, update
   * local React state.  This keeps the component in sync with remote
   * collaborators.
   */
  useEffect(() => {
    function handleChange() {
      // During chunked cold-load hydration, setLines is driven explicitly at a
      // bounded cadence; skip the per-push refresh to avoid O(n^2) re-indexing.
      if (hydrating.current) return;
      if (yLines) {
        setLines(yLines.toArray());
      }
    }

    if (yLines) {
      yLines.observe(handleChange);
    }
    return () => {
      if (yLines) {
        yLines.unobserve(handleChange);
      }
    };
  }, [yLines]);

  /**
   * Connect to the Yjs room and load persisted annotations.  On first
   * connection (when the only user is the current one), clear any existing
   * strokes and load those saved in the database.  Otherwise just hook
   * into the Yjs doc.
   */
  useEffect(() => {
    // Set when the effect is torn down (board switch / unmount) so an in-flight
    // chunked hydration stops instead of writing into a stale doc.
    let cancelled = false;

    async function connectYjs(yRoom: YjsRoomConnection) {
      const yLinesArr = yRoom.doc.getArray('lines') as Y.Array<Y.Map<any>>;
      const ydoc = yRoom.doc;

      setYdoc(ydoc);
      setYlines(yLinesArr);
      setLines(yLinesArr.toArray());

      // Only the first (solo) connection hydrates from the DB; otherwise state
      // arrives via Yjs sync from peers.
      const users = yRoom.provider.awareness.getStates();
      if (users.size !== 1) return;
      const dbLines = getAnnotations();
      if (!dbLines || !ydoc) return;

      const raw = dbLines.data.whiteboardLines as any[];
      const rawTotal = raw.length;

      // Auto de-duplicate on load: older boards stored the same stroke many
      // times.  Keep one copy per content signature so we hydrate the real
      // strokes, not the redundant copies.  If any were dropped, the cleaned set
      // is persisted below so the board is fixed for next time.
      const all = dedupeLines(raw);
      const total = all.length;
      const duplicatesRemoved = rawTotal - total;
      const t0 = performance.now();

      // Clear any existing strokes, then hydrate in chunks: each chunk is ONE
      // transaction + ONE batched push, and we yield between chunks so the board
      // renders progressively and the main thread stays responsive.
      hydrating.current = true;
      ydoc.transact(() => yLinesArr.delete(0, yLinesArr.length));

      let chunkIndex = 0;
      for (let start = 0; start < total; start += HYDRATE_CHUNK_SIZE) {
        if (cancelled) {
          hydrating.current = false;
          return;
        }
        const chunk = all.slice(start, start + HYDRATE_CHUNK_SIZE);
        ydoc.transact(() => {
          yLinesArr.push(chunk.map(buildYLineMap));
        });
        chunkIndex += 1;
        const isLast = start + HYDRATE_CHUNK_SIZE >= total;
        // Progressive render, but not every chunk (bounds the bbox re-index).
        if (isLast || chunkIndex === 1 || chunkIndex % RENDER_EVERY_CHUNKS === 0) {
          setLines(yLinesArr.toArray());
        }
        if (!isLast) {
          await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
        }
      }

      hydrating.current = false;
      if (!cancelled) {
        setLines(yLinesArr.toArray());
        console.log(`[annotations] hydrated ${total} strokes in ${Math.round(performance.now() - t0)}ms`);
        // Persist the cleaned set so the duplicates don't return on next load.
        // Save directly from the local array: the component `yLines` state (used
        // by the debounced save path) may not be updated yet during cold-load.
        if (duplicatesRemoved > 0) {
          const ok = await updateAnnotation(props.boardId, { whiteboardLines: yLinesArr.toJSON() });
          if (ok) {
            console.log(
              `[annotations] de-duplicated board: removed ${duplicatesRemoved} duplicate strokes ` +
                `(${rawTotal} → ${total}); persisted cleaned set`
            );
          } else {
            console.warn(
              `[annotations] de-dup computed (${rawTotal} → ${total}) but NOT persisted ` +
                `(no edit permission or save failed)`
            );
          }
        }
      }
    }

    async function connect(yRoom: YjsRoomConnection) {
      setLines([]);
      const tGet = performance.now();
      await subAnnotations(props.boardId);
      console.log(`[annotations] fetched from server in ${Math.round(performance.now() - tGet)}ms`);
      if (cancelled) return;
      connectYjs(yRoom);
    }
    if (yAnnotations) {
      connect(yAnnotations);
    }
    return () => {
      cancelled = true;
      // Persist any pending edits before tearing down (e.g. board switch).
      flushSave();
      unsubAnnotations();
    };
  }, [yAnnotations, props.boardId]);

  /**
   * Begin drawing a new stroke or rectangle on pointer down.  This function
   * handles both pen and rectangle tools by examining primaryActionMode.  It
   * creates a Yjs map with the appropriate metadata and stores the start
   * coordinates in the points array.  It also captures the pointer so
   * subsequent move/up events continue to target this element.
   */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Track active touch pointers to distinguish between single-finger draw
      // and multi-touch gestures (handled by BackgroundLayer for pan/zoom).
      if (e.pointerType === 'touch') {
        activeTouchCount.current += 1;
      }

      // When a second finger arrives, cancel any in-progress stroke from the
      // first finger so it doesn't leave a tiny dot behind.  Multi-touch is
      // used for pan/zoom and should not create or modify strokes.
      if (e.pointerType === 'touch' && activeTouchCount.current > 1) {
        cancelInProgressStroke();
        return;
      }
      // Determine type based on current tool
      const type =
        primaryActionMode === 'rectangle'
          ? 'rectangle'
          : primaryActionMode === 'pen'
            ? 'line'
            : primaryActionMode === 'circle'
              ? 'circle'
              : primaryActionMode === 'arrow'
                ? 'arrow'
                : primaryActionMode === 'doubleArrow'
                  ? 'doubleArrow'
                  : 'eraser';
      if (type === 'eraser') return;
      if (!yLines || !yDoc || !canAnnotate || !boardSynced) return;
      if (!e.isPrimary || e.button !== 0) return;

      // Collision-resistant id: Date.now() alone repeats for strokes committed
      // in the same millisecond, which produced duplicate ids on existing boards.
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      const [x0, y0] = getPoint(e.clientX, e.clientY);

      // Capture pointer events
      e.currentTarget.setPointerCapture(e.pointerId);

      // Keep the in-progress shape in local state only.  Nothing is written to
      // Yjs until the stroke is finalized in handlePointerUp.
      rDraft.current = { id, type, userColor: color, alpha: markerOpacity, size: markerSize, userId: user?._id };
      rDraftPoints.current = [[x0, y0]];
      setDraftPoints(rDraftPoints.current);
      setCursorPosition({ x: x0, y: y0 });
    },
    [yLines, yDoc, canAnnotate, boardSynced, primaryActionMode, color, markerOpacity, markerSize, user, getPoint],
  );

  /**
   * Update the current stroke or rectangle on pointer move.  For lines, this
   * simply appends each new point; for rectangles, it replaces the end point
   * with the most recent coordinates.  The preview cursor is updated for
   * all tools except eraser.
   */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!rDraft.current) return;
      // For mouse / pen / touch we require an active pointer capture to avoid stray moves.
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

      // If multiple touch points are active, cancel the in-progress stroke
      // and delegate to background pan/zoom logic.
      if (e.pointerType === 'touch' && activeTouchCount.current > 1) {
        cancelInProgressStroke();
        return;
      }
      const [x, y] = getPoint(e.clientX, e.clientY);
      setCursorPosition(primaryActionMode !== 'eraser' ? { x, y } : null);

      const type = rDraft.current.type;
      if (type === 'line') {
        // Decimate the freehand draft: only append a sample once the pointer has
        // travelled at least MIN_DRAFT_SAMPLE_PX (in screen space) from the last
        // stored point, and round to integer board coords.  This keeps the
        // in-progress SVG path small and cheap to re-tessellate on each move; the
        // pointer-up Simplify pass still cleans up the committed stroke.
        const pts = rDraftPoints.current;
        const last = pts[pts.length - 1];
        const minDist = MIN_DRAFT_SAMPLE_PX / scale; // screen px -> board units
        const dx = x - last[0];
        const dy = y - last[1];
        if (dx * dx + dy * dy < minDist * minDist) return; // too close; skip
        rDraftPoints.current = [...pts, [round1(x), round1(y)]];
        setDraftPoints(rDraftPoints.current);
      }
      // Rectangle / circle / arrow track start + current drag-end point
      else if (type === 'rectangle' || type === 'circle' || type === 'arrow' || type === 'doubleArrow') {
        const start = rDraftPoints.current[0];
        rDraftPoints.current = [start, [x, y]];
        setDraftPoints(rDraftPoints.current);
      } else {
        setCursorPosition(null);
      }
    },
    [primaryActionMode, getPoint, scale],
  );

  /**
   * Finalise the current stroke or rectangle on pointer up.  Lines are
   * simplified via simplify-js for storage efficiency; rectangles are
   * converted from start/end points into a closed polygon (five points,
   * including the starting point repeated).  After finalisation, the
   * shape is marked complete and persisted to the annotation store.
   */
  /**
   * Commit a finalized shape to the Yjs document in a single transaction.  The
   * points are stored flat ([x, y, x, y, ...]) to match the persisted format.
   */
  function commitShape(draft: DraftShape, finalPairs: number[][]) {
    if (!yLines || !yDoc) return;
    const flat: number[] = [];
    for (const [px, py] of finalPairs) flat.push(px, py);
    const pts = new Y.Array<number>();
    pts.push(flat);
    const yShape = new Y.Map();
    yDoc.transact(() => {
      yShape.set('id', draft.id);
      yShape.set('type', draft.type);
      yShape.set('points', pts);
      yShape.set('userColor', draft.userColor);
      yShape.set('alpha', draft.alpha);
      yShape.set('size', draft.size);
      yShape.set('isComplete', true);
      yShape.set('userId', draft.userId);
      yShape.set('text', '');
    });
    yLines.push([yShape]);
    // Queue the plain snapshot for an incremental append (persisted on save).
    pendingAppends.current.push(yShape.toJSON());
  }

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerType === 'touch' && activeTouchCount.current > 0) {
        activeTouchCount.current -= 1;
      }
      e.currentTarget.releasePointerCapture(e.pointerId);
      const draft = rDraft.current;
      const points = rDraftPoints.current;
      // Clear the local draft up front so an early return can't leave it dangling.
      rDraft.current = null;
      rDraftPoints.current = [];
      setDraftPoints([]);
      if (!draft) return;

      const type = draft.type;
      let committed = false;

      if (type === 'line') {
        // Simplify freehand stroke (tolerance 0.5, high quality)
        let finalPairs = points;
        if (points.length >= 2) {
          const xyPoints = points.map(([x, y]) => ({ x, y }));
          // Scale-aware tolerance: keep simplification consistent with the
          // screen-space draft decimation (equals 0.5 board units at 1x zoom).
          const tolerance = SIMPLIFY_TOL_PX / scale;
          const simpler = Simplify.default(xyPoints, tolerance, true);
          finalPairs = simpler.map((p) => [round1(p.x), round1(p.y)]);
        }
        commitShape(draft, finalPairs);
        committed = true;
      } else if (type === 'rectangle') {
        // Need a start + drag-end point; otherwise the shape never formed.
        if (points.length >= 2) {
          const [x0, y0] = points[0];
          const [x1, y1] = points[1];
          const xMin = Math.min(x0, x1);
          const yMin = Math.min(y0, y1);
          const width = Math.abs(x1 - x0);
          const height = Math.abs(y1 - y0);
          // Closed rectangle path: TL, TR, BR, BL, back to TL
          const rectPairs: number[][] = [
            [xMin, yMin],
            [xMin + width, yMin],
            [xMin + width, yMin + height],
            [xMin, yMin + height],
            [xMin, yMin],
          ];
          commitShape(draft, rectPairs);
          committed = true;
        }
      } else if (type === 'circle') {
        if (points.length >= 2) {
          const [x0, y0] = points[0];
          const [x1, y1] = points[1];
          const maxX = Math.max(x0, x1);
          const minX = Math.min(x0, x1);
          const maxY = Math.max(y0, y1);
          const minY = Math.min(y0, y1);
          const cx = (maxX + minX) / 2;
          const cy = (maxY + minY) / 2;
          const rx = (maxX - minX) / 2;
          const ry = (maxY - minY) / 2;
          const vert1x = cx + rx * Math.cos(Math.PI / 2);
          const vert1y = cy + ry * Math.sin(Math.PI / 2);
          const vert2x = cx + rx * Math.cos((3 * Math.PI) / 2);
          const vert2y = cy + ry * Math.sin((3 * Math.PI) / 2);
          const circlePairs: number[][] = [
            [x0, y0],
            [x1, y1],
            [vert1x, vert1y],
            [vert2x, vert2y],
          ];
          commitShape(draft, circlePairs);
          committed = true;
        }
      } else if (type === 'arrow' || type === 'doubleArrow') {
        if (points.length >= 2) {
          commitShape(draft, [points[0], points[1]]);
          committed = true;
        }
      }

      // Persist to the annotation store only when a shape was actually added.
      // Debounced so a burst of strokes coalesces into a single save.
      if (committed) scheduleSave();
    },
    [scheduleSave, yLines, yDoc, scale],
  );

  /**
   * Effect for clearing all markers when requested.
   */
  useEffect(() => {
    if (yLines && clearAllMarkers) {
      yLines.delete(0, yLines.length);
      setClearAllMarkers(false);
      saveFullNow();
    }
  }, [clearAllMarkers]);

  /**
   * Effect for clearing only the current user's markers.
   */
  useEffect(() => {
    if (yLines && clearMarkers) {
      for (let index = yLines.length - 1; index >= 0; index--) {
        const line = yLines.get(index);
        if (line.get('userId') === user?._id) {
          yLines.delete(index, 1);
        }
      }
      saveFullNow();
      setClearMarkers(false);
    }
  }, [clearMarkers]);

  /**
   * Effect for undoing the last marker (pen only).
   */
  useEffect(() => {
    if (yLines && undoLastMarker) {
      for (let index = yLines.length - 1; index >= 0; index--) {
        const line = yLines.get(index);
        if (line.get('userId') === user?._id) {
          yLines.delete(index, 1);
          break;
        }
      }
      saveFullNow();
      setUndoLastMarker(false);
    }
  }, [undoLastMarker]);

  /**
   * Remove a shape when clicked on.  Stable identity (useCallback) so the
   * memoized committed-annotations layer isn't re-rendered by drawing.
   */
  const lineClicked = useCallback(
    (id: string) => {
      if (!yLines) return;
      let deleted = false;
      for (let index = yLines.length - 1; index >= 0; index--) {
        const line = yLines.get(index);
        if (line.get('id') === id) {
          yLines.delete(index, 1);
          deleted = true;
          break;
        }
      }
      if (deleted) saveFullNow();
    },
    [yLines, saveFullNow]
  );

  // Bounding-box index over all committed shapes.  Rebuilt only when the set of
  // shapes changes (commit/delete) — not on pan/zoom or while drawing.
  const bboxIndex = useMemo<IndexedLine[]>(
    () => lines.map((line) => ({ line, bbox: computeShapeBBox(line) })),
    [lines]
  );

  // Visible subset: shapes whose bbox intersects the (margin-expanded) viewport.
  // Recomputed on pan/zoom, but returns the SAME array reference when the visible
  // set is unchanged, so the memoized committed layer doesn't re-render
  // needlessly (and never re-renders during drawing, when the viewport is fixed).
  const prevVisible = useRef<Y.Map<any>[]>([]);
  const visibleLines = useMemo(() => {
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const viewW = winW / scale;
    const viewH = winH / scale;
    const marginX = viewW * VIEWPORT_CULL_MARGIN;
    const marginY = viewH * VIEWPORT_CULL_MARGIN;
    const vMinX = -boardPosition.x - marginX;
    const vMaxX = -boardPosition.x + viewW + marginX;
    const vMinY = -boardPosition.y - marginY;
    const vMaxY = -boardPosition.y + viewH + marginY;
    const next: Y.Map<any>[] = [];
    for (const { line, bbox } of bboxIndex) {
      // Shapes with no computable bbox (e.g. degenerate) are always kept.
      if (!bbox || (bbox.maxX >= vMinX && bbox.minX <= vMaxX && bbox.maxY >= vMinY && bbox.minY <= vMaxY)) {
        next.push(line);
      }
    }
    if (sameLineArray(next, prevVisible.current)) return prevVisible.current;
    prevVisible.current = next;
    return next;
  }, [bboxIndex, boardPosition.x, boardPosition.y, scale]);

  // Hotkeys: undo last line (Pen only)
  useHotkeys(
    'alt+z',
    () => {
      if (['pen', 'rectangle', 'circle', 'arrow', 'doubleArrow'].includes(primaryActionMode)) {
        setUndoLastMarker(true);
      }
    },
    { dependencies: [primaryActionMode] },
  );
  useHotkeys(
    'cmd+z',
    () => {
      if (['pen', 'rectangle', 'circle', 'arrow', 'doubleArrow'].includes(primaryActionMode)) {
        setUndoLastMarker(true);
      }
    },
    { dependencies: [primaryActionMode] },
  );

  return (
    <div
      className="canvas-container"
      style={{
        pointerEvents: ['pen', 'eraser', 'rectangle', 'circle', 'arrow', 'doubleArrow'].includes(primaryActionMode) ? 'auto' : 'none',
        touchAction: ['pen', 'eraser', 'rectangle', 'circle', 'arrow', 'doubleArrow'].includes(primaryActionMode) ? 'none' : 'auto',
      }}
    >
      <svg
        id="whiteboard"
        className="canvas-layer"
        style={{
          position: 'absolute',
          width: boardWidth + 'px',
          height: boardHeight + 'px',
          left: 0,
          top: 0,
          zIndex: 1000,
          // Use a consistent crosshair cursor for all annotation tools
          cursor: 'crosshair',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchMove={(e) => {
          // For touch events, delegate to handlePointerMove if only one finger
          if (e.touches.length === 1) {
            const touch = e.touches[0];
            // Construct a synthetic pointer event-like object for coordinates
            handlePointerMove({
              ...e,
              clientX: touch.clientX,
              clientY: touch.clientY,
              pointerId: 0,
              isPrimary: true,
              pointerType: 'touch',
            } as unknown as React.PointerEvent<SVGSVGElement>);
          }
        }}
        {...dragProps}
      >
        <g>
          {/* Render committed shapes — culled to the viewport and isolated in a
              memoized subtree so drawing/panning stays cheap at scale. */}
          <CommittedAnnotations lines={visibleLines} onErase={lineClicked} />
          {/* In-progress (local, non-persisted) draft stroke preview */}
          {rDraft.current && draftPoints.length > 0 && (
            <ShapeView
              points={draftPoints}
              color={rDraft.current.userColor}
              isComplete={false}
              alpha={rDraft.current.alpha}
              size={rDraft.current.size}
              type={rDraft.current.type}
              interactive={false}
            />
          )}
          {/* Preview cursor for pen */}
          {cursorPosition && primaryActionMode === 'pen' && (
            <circle
              cx={cursorPosition.x}
              cy={cursorPosition.y}
              r={markerSize / 2}
              fill="none"
              stroke="#666666"
              strokeWidth="1"
              strokeOpacity="0.6"
              strokeDasharray="2,2"
            />
          )}
        </g>
      </svg>
      {renderContent()}
    </div>
  );
}
