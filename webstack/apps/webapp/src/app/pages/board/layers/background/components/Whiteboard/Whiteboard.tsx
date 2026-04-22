/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// This is a complete React component for the SAGE whiteboard.  It supports
// drawing free-hand lines and rectangles using pointer events.  Lines and
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
import { getStroke } from 'perfect-freehand';

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

type DraftShape = {
  id: string;
  type: string;
  points: [number, number][];
  userColor: string;
  alpha: number;
  size: number;
  isComplete: boolean;
  userId?: string;
  text: string;
};

const MIN_POINT_DISTANCE = 15; // Minimum distance in pixels between points in a freehand line to reduce density and improve performance

function shouldAddPoint(points: [number, number][], next: [number, number]) {
  const last = points[points.length - 1];
  if (!last) return true;
  const dx = next[0] - last[0];
  const dy = next[1] - last[1];
  return dx * dx + dy * dy >= MIN_POINT_DISTANCE * MIN_POINT_DISTANCE;
}

/**
 * Whiteboard component supporting free-hand and rectangle drawing.
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
  const rCurrentLine = useRef<DraftShape>();
  const activeTouchCount = useRef(0);
  const [draftLine, setDraftLine] = useState<DraftShape | null>(null);

  // Preview cursor state
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  // Drag and Drop On Board
  const { dragProps, renderContent } = useDragAndDropBoard({ roomId: props.roomId, boardId: props.boardId });

  /**
   * Persist the Yjs lines array to the SAGE annotation store. Called after
   * completing a stroke or clearing markers.
   */
  function updateBoardLines() {
    if (yLines && props.boardId) {
      const serialized = yLines.toJSON();
      updateAnnotation(props.boardId, { whiteboardLines: serialized });
    }
  }

  /**
   * Cancel and remove the in-progress stroke (if any). Called when a second
   * touch finger arrives so the initial single-finger touch doesn't leave a
   * tiny dot behind during a pan/zoom gesture.
   */
  function cancelInProgressStroke() {
    if (!rCurrentLine.current) {
      rCurrentLine.current = undefined;
      return;
    }
    rCurrentLine.current = undefined;
    setDraftLine(null);
    setCursorPosition(null);
  }

  /**
   * Convert pointer coordinates from client space to board space, accounting
   * for board position and current scale. Returns an array [x, y].
   */
  const getPoint = useCallback(
    (x: number, y: number) => {
      const localX = x / scale - boardPosition.x;
      const localY = y / scale - boardPosition.y;
      return [localX, localY] as [number, number];
    },
    [boardPosition.x, boardPosition.y, scale],
  );

  /**
   * Yjs observer registration: whenever the Yjs array changes, update local
   * React state. This keeps the component in sync with remote collaborators.
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
   * Connect to the Yjs room and load persisted annotations.
   */
  useEffect(() => {
    async function connectYjs(yRoom: YjsRoomConnection) {
      const yLinesArr = yRoom.doc.getArray('lines') as Y.Array<Y.Map<any>>;
      const ydoc = yRoom.doc;

      setYdoc(ydoc);
      setYlines(yLinesArr);
      setLines(yLinesArr.toArray());

      const users = yRoom.provider.awareness.getStates();
      if (users.size === 1) {
        const dbLines = getAnnotations();
        if (dbLines && ydoc) {
          yLinesArr.delete(0, yLinesArr.length);
          let didBackfillCachedPaths = false;
          const serializedLines = dbLines.data.whiteboardLines.map((line: any) => {
            if (line.type === 'line' && !line.cachedPath) {
              const cachedPath = getCachedPathFromStoredLine(line.points, line.size);
              if (cachedPath) {
                didBackfillCachedPaths = true;
                return { ...line, cachedPath };
              }
            }
            return line;
          });

          serializedLines.forEach((line: any) => {
            const pts = new Y.Array<number>();
            pts.push(line.points);
            const yLine = new Y.Map<any>();
            ydoc.transact(() => {
              yLine.set('id', line.id);
              yLine.set('type', line.type ?? 'line');
              yLine.set('points', pts);
              yLine.set('cachedPath', line.cachedPath);
              yLine.set('userColor', line.userColor);
              yLine.set('alpha', line.alpha);
              yLine.set('size', line.size);
              yLine.set('isComplete', true);
              yLine.set('userId', line.userId);
              yLine.set('text', line.text);
            });
            yLinesArr.push([yLine]);
          });
          setLines(yLinesArr.toArray());

          if (didBackfillCachedPaths) {
            updateAnnotation(props.boardId, { whiteboardLines: serializedLines });
          }
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
  }, [getAnnotations, props.boardId, subAnnotations, unsubAnnotations, updateAnnotation, yAnnotations]);

  /**
   * Begin drawing a new stroke or shape on pointer down. The in-progress
   * shape stays local so pointer moves do not update the shared Yjs array.
   */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerType === 'touch') {
        activeTouchCount.current += 1;
      }

      if (e.pointerType === 'touch' && activeTouchCount.current > 1) {
        cancelInProgressStroke();
        return;
      }

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

      const id = Date.now().toString();
      const [x0, y0] = getPoint(e.clientX, e.clientY);

      e.currentTarget.setPointerCapture(e.pointerId);

      const draft: DraftShape = {
        id,
        type,
        points: [[x0, y0]],
        userColor: color,
        alpha: markerOpacity,
        size: markerSize,
        isComplete: false,
        userId: user?._id,
        text: '',
      };

      if (type === 'circle' || type === 'arrow' || type === 'doubleArrow') {
        draft.points.push([x0 + 0.000001, y0 + 0.000001]);
      }

      rCurrentLine.current = draft;
      setDraftLine(draft);
      setCursorPosition({ x: x0, y: y0 });
    },
    [boardSynced, canAnnotate, color, getPoint, markerOpacity, markerSize, primaryActionMode, user, yDoc, yLines],
  );

  /**
   * Update the current stroke or shape on pointer move.
   */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!rCurrentLine.current) return;
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

      if (e.pointerType === 'touch' && activeTouchCount.current > 1) {
        cancelInProgressStroke();
        return;
      }
      const [x, y] = getPoint(e.clientX, e.clientY);
      setCursorPosition(primaryActionMode !== 'eraser' ? { x, y } : null);

      const current = rCurrentLine.current;
      const type = current.type;

      if (type === 'line') {
        const nextPoint: [number, number] = [x, y];
        if (shouldAddPoint(current.points, nextPoint)) {
          current.points = [...current.points, nextPoint];
        }
        // current.points = [...current.points, [x, y]];
      } else if (type === 'rectangle' || type === 'circle' || type === 'arrow' || type === 'doubleArrow') {
        current.points = current.points.length > 1 ? [current.points[0], [x, y]] : [[x, y]];
      } else {
        setCursorPosition(null);
      }
      setDraftLine({ ...current, points: [...current.points] });
    },
    [getPoint, primaryActionMode],
  );

  /**
   * Finalise the current stroke or shape on pointer up and commit once to Yjs.
   */
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerType === 'touch' && activeTouchCount.current > 0) {
        activeTouchCount.current -= 1;
      }

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }

      const current = rCurrentLine.current;
      if (!current) return;

      const type = current.type;
      let finalPoints = [...current.points];
      let cachedPath = '';

      if (type === 'line') {
        if (finalPoints.length >= 2) {
          const xyPoints = finalPoints.map(([x, y]) => ({ x, y }));
          const simpler = Simplify.default(xyPoints, 0.5, true);
          finalPoints = simpler.map((p) => [Math.round(p.x), Math.round(p.y)] as [number, number]);
          const strokeOutline = getStroke(finalPoints, {
            size: current.size,
            thinning: 0.35,
            smoothing: 0.2,
            streamline: 0.12,
            last: true,
          });
          cachedPath = getSvgPathFromStrokePolygon(strokeOutline);
        }
      } else if (type === 'rectangle') {
        if (finalPoints.length < 2) {
          finalPoints = [];
        } else {
          const [[x0, y0], [x1, y1]] = finalPoints;
          const xMin = Math.min(x0, x1);
          const yMin = Math.min(y0, y1);
          const width = Math.abs(x1 - x0);
          const height = Math.abs(y1 - y0);
          finalPoints = [
            [xMin, yMin],
            [xMin + width, yMin],
            [xMin + width, yMin + height],
            [xMin, yMin + height],
            [xMin, yMin],
          ];
        }
      } else if (type === 'circle') {
        if (finalPoints.length < 2) {
          finalPoints = [];
        } else {
          const [[x0, y0], [x1, y1]] = finalPoints;
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
          finalPoints = [
            [x0, y0],
            [x1, y1],
            [vert1x, vert1y],
            [vert2x, vert2y],
          ];
        }
      } else if (type === 'arrow' || type === 'doubleArrow') {
        finalPoints = finalPoints.length >= 2 ? [finalPoints[0], finalPoints[1]] : [];
      }

      if (finalPoints.length > 0 && yDoc && yLines) {
        const pts = new Y.Array<number>();
        pts.push(finalPoints.flat());
        const yShape = new Y.Map<any>();
        yDoc.transact(() => {
          yShape.set('id', current.id);
          yShape.set('type', current.type);
          yShape.set('points', pts);
          yShape.set('cachedPath', cachedPath);
          yShape.set('userColor', current.userColor);
          yShape.set('alpha', current.alpha);
          yShape.set('size', current.size);
          yShape.set('isComplete', true);
          yShape.set('userId', current.userId);
          yShape.set('text', current.text);
          yLines.push([yShape]);
        });
        updateBoardLines();
      }

      rCurrentLine.current = undefined;
      setDraftLine(null);
    },
    [yDoc, yLines],
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
  }, [clearAllMarkers, setClearAllMarkers, yLines]);

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
  }, [clearMarkers, setClearMarkers, user, yLines]);

  /**
   * Effect for undoing the last marker.
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
  }, [setUndoLastMarker, undoLastMarker, user, yLines]);

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
          cursor: 'crosshair',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchMove={(e) => {
          if (e.touches.length === 1) {
            const touch = e.touches[0];
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
          {lines.map((line) => (
            <Line key={line.get('id') as string} line={line} onClick={lineClicked} />
          ))}
          {draftLine && <DraftLine line={draftLine} />}
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

function DraftLine({ line }: { line: DraftShape }) {
  const c = line.userColor;
  const points = line.points;

  if (line.type === 'rectangle') {
    if (points.length < 2) return null;
    const [[x0, y0], [x1, y1]] = points;
    const minX = Math.min(x0, x1);
    const minY = Math.min(y0, y1);
    return (
      <rect
        x={minX}
        y={minY}
        width={Math.abs(x1 - x0)}
        height={Math.abs(y1 - y0)}
        fill="none"
        stroke={c}
        strokeOpacity={line.alpha ?? 0.6}
        strokeWidth={line.size ?? 5}
        strokeLinejoin="miter"
        strokeLinecap="butt"
        shapeRendering="crispEdges"
      />
    );
  }

  if (line.type === 'circle') {
    if (points.length < 2) return null;
    const [[x0, y0], [x1, y1]] = points;
    const maxX = Math.max(x0, x1);
    const minX = Math.min(x0, x1);
    const maxY = Math.max(y0, y1);
    const minY = Math.min(y0, y1);
    return (
      <ellipse
        cx={(maxX + minX) / 2}
        cy={(maxY + minY) / 2}
        rx={(maxX - minX) / 2}
        ry={(maxY - minY) / 2}
        fill="none"
        stroke={c}
        strokeOpacity={line.alpha ?? 0.6}
        strokeWidth={line.size ?? 5}
        strokeLinejoin="miter"
        strokeLinecap="butt"
        shapeRendering="crispEdges"
      />
    );
  }

  if (line.type === 'arrow' || line.type === 'doubleArrow') {
    if (points.length < 2) return null;
    const [[x1, y1], [x2, y2]] = points;
    const markerId = `draft-${line.type}-${line.id}`;
    return (
      <g opacity={line.alpha}>
        <defs>
          <marker
            id={markerId}
            orient={line.type === 'doubleArrow' ? 'auto-start-reverse' : 'auto'}
            markerWidth="5"
            markerHeight="5"
            viewBox="0 0 10 10"
            refX={line.type === 'doubleArrow' ? '4' : '5'}
            refY="5"
          >
            <path d="M0 0 L10 5 L0 10 Z" fill={c} />
          </marker>
        </defs>
        <path
          d={`M ${x1},${y1}, L ${x2},${y2}`}
          stroke={c}
          strokeWidth={line.size}
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
          markerStart={line.type === 'doubleArrow' ? `url(#${markerId})` : undefined}
        />
      </g>
    );
  }

  const strokeOutline = getStroke(points, {
    size: line.size,
    thinning: 0.35,
    smoothing: 0.2,
    streamline: 0.12,
    last: line.isComplete,
  });

  const pathData = getSvgPathFromStrokePolygon(strokeOutline);
  return <path className="canvas-line" d={pathData} fill={c} fillOpacity={line.alpha} />;
}

function getSvgPathFromStrokePolygon(stroke: number[][]) {
  if (!stroke || stroke.length === 0) return '';
  let d = `M${stroke[0][0].toFixed(1)},${stroke[0][1].toFixed(1)}`;
  for (let i = 1; i < stroke.length; i++) {
    const [x, y] = stroke[i];
    d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
  }
  d += ' Z';
  return d;
}

function getCachedPathFromStoredLine(points: unknown, size: number | undefined) {
  const normalizedPoints = normalizeStoredPoints(points);
  if (normalizedPoints.length < 2) return '';

  const strokeOutline = getStroke(normalizedPoints, {
    size: size ?? 5,
    thinning: 0.35,
    smoothing: 0.2,
    streamline: 0.12,
    last: true,
  });

  return getSvgPathFromStrokePolygon(strokeOutline);
}

function normalizeStoredPoints(points: unknown): [number, number][] {
  if (!Array.isArray(points)) return [];

  if (points.length > 0 && Array.isArray(points[0])) {
    return (points as unknown[])
      .filter((point): point is [number, number] => {
        return Array.isArray(point) && point.length >= 2 && typeof point[0] === 'number' && typeof point[1] === 'number';
      })
      .map((point) => [point[0], point[1]]);
  }

  const flatPoints = points as unknown[];
  const normalized: [number, number][] = [];
  for (let i = 0; i < flatPoints.length - 1; i += 2) {
    const x = flatPoints[i];
    const y = flatPoints[i + 1];
    if (typeof x === 'number' && typeof y === 'number') {
      normalized.push([x, y]);
    }
  }
  return normalized;
}
