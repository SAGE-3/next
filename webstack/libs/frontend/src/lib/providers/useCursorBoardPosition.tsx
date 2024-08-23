/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useState, createContext, useContext } from 'react';
import { useUIStore } from '../stores';
import { throttle } from 'throttle-debounce';

type CursorBoardPositionContextType = {
  boardCursor: { x: number; y: number };
  uiToBoard: (x: number, y: number) => { x: number; y: number };
  cursor: { x: number; y: number };
};

const CursorBoardPositionContext = createContext({
  boardCursor: { x: 0, y: 0 },
  uiToBoard: (x: number, y: number) => {
    return { x: 0, y: 0 };
  },
  cursor: { x: 0, y: 0 },
} as CursorBoardPositionContextType);

/**
 * Hook to oberve the user's cursor position on the board
 * Usable only on the board page
 * @returns (x, y) position of the cursor
 */
export function useCursorBoardPosition() {
  return useContext(CursorBoardPositionContext);
}

export function CursorBoardPositionProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const [boardCursor, setBoardCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);

  const [clientCursor, setClientCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const handleCursorUpdate = useCallback((ev: MouseEvent) => setClientCursor({ x: ev.clientX, y: ev.clientY }), []);

  useEffect(() => {
    console.log('what');
    window.addEventListener('mousemove', handleCursorUpdate);
    return () => window.removeEventListener('mousemove', handleCursorUpdate);
  }, [handleCursorUpdate]);

  // Throttle the Update
  const throttleUpdate = throttle(250, (cx: number, cy: number, bx: number, by: number) => {
    setCursor({ x: cx, y: cy });
    setBoardCursor({
      x: bx,
      y: by,
    });
  });

  // Keep the throttlefunc reference
  const throttleUpdateFunc = useCallback(throttleUpdate, []);

  useEffect(() => {
    const boardX = Math.floor(clientCursor.x / scale - boardPosition.x);
    const boardY = Math.floor(clientCursor.y / scale - boardPosition.y);
    throttleUpdateFunc(clientCursor.x, clientCursor.y, boardX, boardY);
  }, [boardPosition.x, boardPosition.y, scale, clientCursor.x, clientCursor.y, throttleUpdateFunc]);

  const uiToBoard = useCallback(
    (x: number, y: number) => {
      return { x: Math.floor(x / scale - boardPosition.x), y: Math.floor(y / scale - boardPosition.y) };
    },
    [boardPosition.x, boardPosition.y, scale]
  );

  return (
    <CursorBoardPositionContext.Provider value={{ cursor, uiToBoard, boardCursor }}>{props.children}</CursorBoardPositionContext.Provider>
  );
}
