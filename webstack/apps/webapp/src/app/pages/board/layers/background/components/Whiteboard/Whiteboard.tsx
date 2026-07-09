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


import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const subAnnotations = useAnnotationStore((state) => state.subscribeToBoard);
  const unsubAnnotations = useAnnotationStore((state) => state.unsubscribe);
  const getAnnotations = useAnnotationStore((state) => state.getAnnotations);

  // Yjs room and state
  const { yAnnotations } = useYjs();
  const [yDoc, setYdoc] = useState<Y.Doc | null>(null);
  const [yLines, setYlines] = useState<Y.Array<Y.Map<any>> | null>(null);
  const [lines, setLines] = useState<Y.Map<any>[]>([]);
  const activeTouchCount = useRef(0);

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
   * Persist the Yjs lines array to the SAGE annotation store.  Called after
   * completing a stroke or clearing markers.  Only runs when yLines and
   * boardId are defined.
   */
  function updateBoardLines() {
    if (yLines && props.boardId) {
      const serialized = yLines.toJSON();
      updateAnnotation(props.boardId, { whiteboardLines: serialized });
    }
  }

  // Debounced persistence.  updateBoardLines() serializes and PUTs the whole
  // whiteboardLines array, so calling it on every stroke is O(board) per stroke.
  // We coalesce rapid edits into a single trailing save and force a flush on
  // tab-hide/unload and tool/board change so nothing is lost.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDirty = useRef(false);
  // Latest-ref so the stable save helpers below always call the current closure.
  const updateBoardLinesRef = useRef(updateBoardLines);
  useEffect(() => {
    updateBoardLinesRef.current = updateBoardLines;
  });

  // Schedule a trailing save — used for high-frequency stroke commits.
  const scheduleSave = useCallback(() => {
    saveDirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      if (!saveDirty.current) return;
      saveDirty.current = false;
      updateBoardLinesRef.current();
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
    updateBoardLinesRef.current();
  }, []);

  // Save immediately — used for infrequent destructive ops (clear/undo/erase).
  const saveNow = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    saveDirty.current = false;
    updateBoardLinesRef.current();
  }, []);

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
    [boardPosition.x, boardPosition.y, scale]
  );

  /**
   * Yjs observer registration: whenever the Yjs array changes, update
   * local React state.  This keeps the component in sync with remote
   * collaborators.
   */
  useEffect(() => {
    function handleChange() {
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
    async function connectYjs(yRoom: YjsRoomConnection) {
      const yLinesArr = yRoom.doc.getArray('lines') as Y.Array<Y.Map<any>>;
      const ydoc = yRoom.doc;

      setYdoc(ydoc);
      setYlines(yLinesArr);
      setLines(yLinesArr.toArray());

      // If I'm the only user connected, sync lines from the DB
      const users = yRoom.provider.awareness.getStates();
      if (users.size === 1) {
        const dbLines = getAnnotations();
        if (dbLines && ydoc) {
          // Clear the Yjs array
          yLinesArr.delete(0, yLinesArr.length);
          // Push each persisted line/rectangle into the Yjs array
          dbLines.data.whiteboardLines.forEach((line: any) => {
            const pts = new Y.Array<number>();
            // If the persisted line stores points as nested arrays, push them
            pts.push(line.points);
            const yLine = new Y.Map<any>();
            ydoc.transact(() => {
              yLine.set('id', line.id);
              yLine.set('type', line.type ?? 'line');
              yLine.set('points', pts);
              yLine.set('userColor', line.userColor);
              yLine.set('alpha', line.alpha);
              yLine.set('size', line.size);
              yLine.set('isComplete', true);
              yLine.set('userId', line.userId);
              yLine.set('text', line.text);
            });
            yLinesArr.push([yLine]);
          });
          // Update local state
          setLines(yLinesArr.toArray());
        }
      }
    }
    async function connect(yRoom: YjsRoomConnection) {
      setLines([]);
      await subAnnotations(props.boardId);
      connectYjs(yRoom);
    }
    if (yAnnotations) {
      connect(yAnnotations);
    }
    return () => {
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
      const type = primaryActionMode === 'rectangle' ? 'rectangle' : primaryActionMode === 'pen' ? 'line' : primaryActionMode === 'circle' ? 'circle' : primaryActionMode === 'arrow' ? 'arrow' : primaryActionMode === 'doubleArrow' ? 'doubleArrow' : 'eraser';
      if (type === 'eraser') return;
      if (!yLines || !yDoc || !canAnnotate || !boardSynced) return;
      if (!e.isPrimary || e.button !== 0) return;

      const id = Date.now().toString();
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
    [yLines, yDoc, canAnnotate, boardSynced, primaryActionMode, color, markerOpacity, markerSize, user, getPoint]
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
      }
      else {
        setCursorPosition(null);
      }
    },
    [primaryActionMode, getPoint, scale]
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
    [scheduleSave, yLines, yDoc, scale]
  );

  /**
   * Effect for clearing all markers when requested.
   */
  useEffect(() => {
    if (yLines && clearAllMarkers) {
      yLines.delete(0, yLines.length);
      setClearAllMarkers(false);
      saveNow();
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
      saveNow();
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
      saveNow();
      setUndoLastMarker(false);
    }
  }, [undoLastMarker]);

  /**
   * Remove a shape when clicked on.
   */
  const lineClicked = (id: string) => {
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
    if (deleted) saveNow();
  };

  // Hotkeys: undo last line (Pen only)
  useHotkeys(
    'alt+z',
    () => {
      if (['pen', 'rectangle', 'circle', 'arrow', 'doubleArrow'].includes(primaryActionMode)) {
        setUndoLastMarker(true);
      }
    },
    { dependencies: [primaryActionMode] }
  );
  useHotkeys(
    'cmd+z',
    () => {
      if (['pen', 'rectangle', 'circle', 'arrow', 'doubleArrow'].includes(primaryActionMode)) {
        setUndoLastMarker(true);
      }
    },
    { dependencies: [primaryActionMode] }
  );

  return (
    <div
      className="canvas-container"
      style={{
        pointerEvents: ['pen', 'eraser', 'rectangle', 'circle', 'arrow', 'doubleArrow'].includes(primaryActionMode)
          ? 'auto'
          : 'none',
        touchAction: ['pen', 'eraser', 'rectangle', 'circle', 'arrow', 'doubleArrow'].includes(primaryActionMode)
          ? 'none'
          : 'auto',
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
          {/* Render all shapes */}
          {lines.map((line, i) => (
            <Line key={i} line={line} onClick={lineClicked} />
          ))}
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