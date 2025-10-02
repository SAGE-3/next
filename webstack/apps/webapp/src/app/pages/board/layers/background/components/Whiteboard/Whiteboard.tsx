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

import { Line } from './Line';
import { useDragAndDropBoard } from '../DragAndDropBoard';

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
  const rCurrentLine = useRef<Y.Map<any>>();

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
      // Determine type based on current tool
      const type = primaryActionMode === 'rectangle' ? 'rectangle' : primaryActionMode === 'pen' ? 'line' : 'eraser';
      if (type === 'eraser') return;
      if (!yLines || !yDoc || !canAnnotate || !boardSynced) return;
      if (!e.isPrimary || e.button !== 0) return;

      const id = Date.now().toString();
      const [x0, y0] = getPoint(e.clientX, e.clientY);

      // Capture pointer events
      e.currentTarget.setPointerCapture(e.pointerId);

      // Prepare a shared Yjs array for storing points
      const pts = new Y.Array<number>();
      pts.push([x0, y0]);
      // Create a Yjs map for this shape
      const yShape = new Y.Map();

      yDoc.transact(() => {
        yShape.set('id', id);
        yShape.set('type', type);
        yShape.set('points', pts);
        yShape.set('userColor', color);
        yShape.set('alpha', markerOpacity);
        yShape.set('size', markerSize);
        yShape.set('isComplete', false);
        yShape.set('userId', user?._id);
      });
      rCurrentLine.current = yShape;
      yLines.push([yShape]);
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
      if (!rCurrentLine.current) return;
      if (!e.currentTarget.hasPointerCapture(e.pointerId) || e.pointerType === 'touch') return;
      const [x, y] = getPoint(e.clientX, e.clientY);
      setCursorPosition(primaryActionMode !== 'eraser' ? { x, y } : null);

      const current = rCurrentLine.current;
      const type = current.get('type') as string;
      const pts = current.get('points') as Y.Array<number>;
      if (!pts) return;

      if (type === 'line') {
        // Append new point for freehand line
        pts.push([x, y]);
      } 
      else if (type === 'rectangle') {
        // Replace the last end point (if exists) with the current coordinates
        // A rectangle stores two points: start and current drag end
        if (pts.length >= 4) {
          pts.delete(2, 2);
        }
        pts.push([x, y]);
      }
      else{
        setCursorPosition(null);
      }
    },
    [primaryActionMode, getPoint]
  );

  /**
   * Finalise the current stroke or rectangle on pointer up.  Lines are
   * simplified via simplify-js for storage efficiency; rectangles are
   * converted from start/end points into a closed polygon (five points,
   * including the starting point repeated).  After finalisation, the
   * shape is marked complete and persisted to the annotation store.
   */
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      const current = rCurrentLine.current;
      if (!current) return;

      const type = current.get('type') as string;
      const pts = current.get('points') as Y.Array<number>;
      if (!pts) {
        rCurrentLine.current = undefined;
        return;
      }

      if (type === 'line') {
        // Simplify freehand stroke
        if (pts.length >= 4) {
          const xyPoints: { x: number; y: number }[] = [];
          for (let i = 0; i < pts.length / 2; i++) {
            xyPoints.push({ x: pts.get(i * 2), y: pts.get(i * 2 + 1) });
          }
          // Simplify the stroke; tolerance 0.5, high quality
          const simpler = Simplify.default(xyPoints, 0.5, true);
          pts.delete(0, pts.length);
          for (const p of simpler) {
            pts.push([Math.round(p.x), Math.round(p.y)]);
          }
        }
        current.set('isComplete', true);
      } else if (type === 'rectangle') {
        // Finalise rectangle: convert two endpoints to a closed rectangle
        // If the user never moved, remove the shape
        if (pts.length < 4) {
          // Remove incomplete rectangle
          const index = yLines?.toArray().indexOf(current) ?? -1;
          if (index >= 0 && yLines) {
            yLines.delete(index, 1);
          }
        } else {
          const x0 = pts.get(0);
          const y0 = pts.get(1);
          const x1 = pts.get(2);
          const y1 = pts.get(3);
          // Determine top-left corner and dimensions【992428044196702†L130-L147】
          const xMin = Math.min(x0, x1);
          const yMin = Math.min(y0, y1);
          const width = Math.abs(x1 - x0);
          const height = Math.abs(y1 - y0);
          // Build a closed rectangle path: TL, TR, BR, BL, back to TL
          const rectPoints = [
            xMin,
            yMin,
            xMin + width,
            yMin,
            xMin + width,
            yMin + height,
            xMin,
            yMin + height,
            xMin,
            yMin,
          ];
          pts.delete(0, pts.length);
          for (let i = 0; i < rectPoints.length; i += 2) {
            pts.push([rectPoints[i], rectPoints[i + 1]]);
          }
          current.set('isComplete', true);
        }
      }
      updateBoardLines();
      rCurrentLine.current = undefined;
    },
    [updateBoardLines, yLines]
  );

  /**
   * Effect for clearing all markers when requested.
   */
  useEffect(() => {
    if (yLines && clearAllMarkers) {
      yLines.delete(0, yLines.length);
      setClearAllMarkers(false);
      updateBoardLines();
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
      updateBoardLines();
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
      updateBoardLines();
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
    if (deleted) updateBoardLines();
  };

  // Hotkeys: undo last line (Pen only)
  useHotkeys(
    'alt+z',
    () => {
      if (primaryActionMode === 'pen') {
        setUndoLastMarker(true);
      }
    },
    { dependencies: [primaryActionMode] }
  );
  useHotkeys(
    'cmd+z',
    () => {
      if (primaryActionMode === 'pen') {
        setUndoLastMarker(true);
      }
    },
    { dependencies: [primaryActionMode] }
  );

  return (
    <div
      className="canvas-container"
      style={{
        pointerEvents: ['pen', 'eraser', 'rectangle', 'circle'].includes(primaryActionMode)
          ? 'auto'
          : 'none',
        touchAction: ['pen', 'eraser', 'rectangle', 'circle'].includes(primaryActionMode)
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