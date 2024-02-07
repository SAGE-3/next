/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// Yjs Imports
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// SAGE Imports
import { useAbility, useBoardStore, useHotkeys, useKeyPress, useThrottleScale, useUIStore, useUser } from '@sage3/frontend';
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

  const updateBoard = useBoardStore((state) => state.update);
  const boards = useBoardStore((state) => state.boards);
  const board = boards.find((el) => el._id === boardId);

  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [yDoc, setYdoc] = useState<Y.Doc | null>(null);
  const [yLines, setYlines] = useState<Y.Array<Y.Map<any>> | null>(null);

  const [lines, setLines] = useState<Y.Map<any>[]>([]);

  const rCurrentLine = useRef<Y.Map<any>>();

  // Save the whiteboard lines to SAGE database
  function updateBoardLines() {
    if (yLines && boardId) {
      const lines = yLines.toJSON();
      updateBoard(boardId, { whiteboardLines: lines });
    }
  }

  useEffect(() => {
    // A Yjs document holds the shared data
    const ydoc = new Y.Doc();

    // WS Provider
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const provider = new WebsocketProvider(`${protocol}://${window.location.host}/yjs`, 'whiteboard-' + boardId, ydoc);

    // Lines array
    const yLines = ydoc.getArray('lines') as Y.Array<Y.Map<any>>;

    setProvider(provider);
    setYdoc(ydoc);
    setYlines(yLines);

    // Sync state with sage when a user connects and is the only one present
    provider.on('sync', () => {
      if (provider) {
        const users = provider.awareness.getStates();
        const count = users.size;
        // I'm the only one here, so need to sync current ydoc with that is saved in the database
        if (count === 1) {
          // Does the board have lines?
          if (board?.data.whiteboardLines && ydoc) {
            // Clear any existing lines
            yLines.delete(0, yLines.length);
            // Add each line to the board from the database
            board.data.whiteboardLines.forEach((line: any) => {
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
      }
    });

    return () => {
      // Remove the bindings and disconnect the provider
      if (ydoc) ydoc.destroy();
      if (provider) provider.disconnect();
    };
  }, [boardId]);

  const getPoint = useCallback(
    (x: number, y: number) => {
      x = x / scale;
      y = y / scale;
      return [x - boardPosition.x, y - boardPosition.y];
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

  // On pointer move, update awareness and (if down) update the current line
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (whiteboardMode === 'pen') {
        const point = getPoint(e.clientX, e.clientY);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          const currentLine = rCurrentLine.current;

          if (!currentLine) return;

          const points = currentLine.get('points');

          // Don't add the new point to the line
          if (!points) return;

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

      currentLine.set('isComplete', true);
      rCurrentLine.current = undefined;
      updateBoardLines();
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

  // Deselect all apps
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
