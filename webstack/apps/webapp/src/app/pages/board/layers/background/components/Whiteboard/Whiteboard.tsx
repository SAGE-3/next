/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Simplify from 'simplify-js';

// Yjs Imports
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// SAGE Imports
import {
  YjsRooms,
  useAbility,
  useAnnotationStore,
  useBoardStore,
  useHotkeys,
  useKeyPress,
  useThrottleScale,
  useUIStore,
  useUser,
  useYjs,
} from '@sage3/frontend';
import { Line } from './Line';
import { useParams } from 'react-router';

type WhiteboardProps = {};

export function Whiteboard(props: WhiteboardProps) {
  const { user } = useUser();

  // Params
  const { boardId } = useParams();

  const scale = useThrottleScale(250);
  // Can annotate
  const canAnnotate = useAbility('update', 'boards');

  // UI Store
  const boardPosition = useUIStore((state) => state.boardPosition);
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const whiteboardMode = useUIStore((state) => state.whiteboardMode);
  const setWhiteboardMode = useUIStore((state) => state.setWhiteboardMode);
  const clearMarkers = useUIStore((state) => state.clearMarkers);
  const setClearMarkers = useUIStore((state) => state.setClearMarkers);
  const clearAllMarkers = useUIStore((state) => state.clearAllMarkers);
  const undoLastMaker = useUIStore((state) => state.undoLastMarker);
  const setUndoLastMaker = useUIStore((state) => state.setUndoLastMarker);
  const markerOpacity = useUIStore((state) => state.markerOpacity);
  const markerSize = useUIStore((state) => state.markerSize);
  const setClearAllMarkers = useUIStore((state) => state.setClearAllMarkers);
  const color = useUIStore((state) => state.markerColor);
  // Annotations Store
  const updateAnnotation = useAnnotationStore((state) => state.update);
  const dbLines = useAnnotationStore((state) => state.annotations);
  // Yjs
  const { connections, connected: yConnected } = useYjs();
  const [yDoc, setYdoc] = useState<Y.Doc | null>(null);
  const [yLines, setYlines] = useState<Y.Array<Y.Map<any>> | null>(null);
  const [lines, setLines] = useState<Y.Map<any>[]>([]);
  const rCurrentLine = useRef<Y.Map<any>>();

  // Save the whiteboard lines to SAGE database
  function updateBoardLines() {
    if (yLines && boardId) {
      const lines = yLines.toJSON();
      updateAnnotation(boardId, { whiteboardLines: lines });
    }
  }

  useEffect(() => {
    function handleChange() {
      if (yLines) {
        const lines = yLines.toArray();
        setLines(lines);
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

  useEffect(() => {
    console.log('Whiteboard> Yjs Connected:', yConnected);
    if (!yConnected) return;
    const yjsConnection = connections[YjsRooms.ANNOTATIONS];
    if (!yjsConnection) {
      console.log('Whiteboard> Failed to connect to Yjs');
      return;
    } else {
      console.log('Whiteboard> Connected to Yjs');
    }
    const yLines = yjsConnection.doc.getArray('lines') as Y.Array<Y.Map<any>>;
    const ydoc = yjsConnection.doc;

    setYdoc(ydoc);
    setYlines(yLines);
    const lines = yLines.toArray();
    setLines(lines);

    // Sync state with sage when a user connects and is the only one present

    const users = yjsConnection.provider.awareness.getStates();
    const count = users.size;
    // I'm the only one here, so need to sync current ydoc with that is saved in the database
    if (count === 1) {
      if (dbLines && ydoc) {
        // Clear any existing lines
        yLines.delete(0, yLines.length);
        // Add each line to the board from the database
        dbLines.data.whiteboardLines.forEach((line: any) => {
          const yPoints = new Y.Array<number>();
          yPoints.push(line.points);
          const yLine = new Y.Map<any>();
          ydoc.transact(() => {
            yLine.set('id', line.id);
            yLine.set('points', yPoints);
            yLine.set('userColor', line.userColor);
            yLine.set('alpha', line.alpha);
            yLine.set('size', line.size);
            yLine.set('isComplete', true);
            yLine.set('userId', line.userId);
          });
          yLines.push([yLine]);
        });
      }
    }
  }, [yConnected, boardId]);

  const getPoint = useCallback(
    (x: number, y: number) => {
      x = x / scale - boardPosition.x;
      y = y / scale - boardPosition.y;
      return [x, y];
    },
    [boardPosition.x, boardPosition.y, scale]
  );

  // On pointer down, start a new current line
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (yLines && yDoc && canAnnotate) {
        // if primary pointing device and left button
        if (e.isPrimary && e.button === 0) {
          e.currentTarget.setPointerCapture(e.pointerId);
          const id = Date.now().toString();
          const yPoints = new Y.Array<number>();

          const yLine = new Y.Map();

          yDoc.transact(() => {
            yLine.set('id', id);
            yLine.set('points', yPoints);
            yLine.set('userColor', color);
            yLine.set('alpha', markerOpacity);
            yLine.set('size', markerSize);
            yLine.set('isComplete', false);
            yLine.set('userId', user?._id);
          });

          rCurrentLine.current = yLine;
          yLines.push([yLine]);
        }
      }
    },
    [yDoc, yLines, user, color, markerOpacity, markerSize]
  );

  // On pointer move, update awareness and (if down) update the current line
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (whiteboardMode === 'pen') {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          const currentLine = rCurrentLine.current;
          if (!currentLine) return;
          const points = currentLine.get('points');
          // Don't add the new point to the line
          if (!points) return;
          const point = getPoint(e.clientX, e.clientY);
          points.push([...point]);
        }
      }
    },
    [rCurrentLine.current, whiteboardMode]
  );

  // On pointer up, complete the current line
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);

      const currentLine = rCurrentLine.current;
      if (!currentLine) return;

      // Get the points from the current stroke
      const points: Y.Array<number> = currentLine.get('points');
      if (points && points.length > 0) {
        const xyPoints: { x: number; y: number }[] = [];
        for (let i = 0; i < points.length / 2; i++) {
          // Convert the points to an array of objects
          xyPoints.push({ x: points.get(i * 2), y: points.get(i * 2 + 1) });
        }
        // Simplify: points: Point[], tolerance: number, highQuality: boolean
        // High quality simplification but runs ~10-20 times slower
        const simpler = Simplify.default(xyPoints, 0.5, true);
        // Delete the old points
        points.delete(0, points.length);
        // Add the new points
        for (let i = 0; i < simpler.length; i++) {
          // convert to integers for storage efficiency
          points.push([Math.round(simpler[i].x), Math.round(simpler[i].y)]);
        }
        currentLine.set('isComplete', true);
        updateBoardLines();
      }
      // Clear the current line anymway
      rCurrentLine.current = undefined;
    },
    [rCurrentLine.current]
  );

  useEffect(() => {
    if (yLines && clearAllMarkers) {
      yLines.delete(0, yLines.length);
      setClearAllMarkers(false);
      updateBoardLines();
    }
  }, [clearAllMarkers]);

  // Clear only your markers
  useEffect(() => {
    if (yLines && clearMarkers) {
      // delete all the users strokes
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

  // Undo last mark
  useEffect(() => {
    if (yLines && undoLastMaker) {
      for (let index = yLines.length - 1; index >= 0; index--) {
        const line = yLines.get(index);
        if (line.get('userId') === user?._id) {
          // delete the first stroke that belongs to the user and stop
          yLines.delete(index, 1);
          break;
        }
      }
      updateBoardLines();
      setUndoLastMaker(false);
    }
  }, [undoLastMaker]);

  const spacebarPressed = useKeyPress(' ');

  // Switch between pen and interactive mode
  useHotkeys(
    'shift+w',
    () => {
      if (canAnnotate) {
        setWhiteboardMode(whiteboardMode === 'none' ? 'pen' : 'none');
      }
    },
    { dependencies: [whiteboardMode] }
  );

  // Delete a line when it is clicked
  const lineClicked = (id: string) => {
    if (yLines) {
      for (let index = yLines.length - 1; index >= 0; index--) {
        const line = yLines.get(index);
        if (line.get('id') === id) {
          yLines.delete(index, 1);
        }
      }
    }
  };

  return (
    <div
      className="canvas-container"
      style={{
        pointerEvents: whiteboardMode !== 'none' && !spacebarPressed ? 'auto' : 'none',
        touchAction: whiteboardMode !== 'none' && !spacebarPressed ? 'none' : 'auto',
      }}
    >
      <svg
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
      >
        <g>
          {/* Lines */}
          {lines.map((line, i) => (
            <Line key={i} line={line} onClick={lineClicked} />
          ))}
        </g>
      </svg>
    </div>
  );
}
