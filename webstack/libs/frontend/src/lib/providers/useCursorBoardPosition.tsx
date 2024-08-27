/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useState, createContext, useContext } from 'react';
import { useUIStore } from '../stores';

const GLOBAL_CURSOR = { x: 0, y: 0 };

function handleCursorUpdate(event: MouseEvent) {
  GLOBAL_CURSOR.x = event.clientX;
  GLOBAL_CURSOR.y = event.clientY;
}

window.addEventListener('mousemove', handleCursorUpdate);

type CursorBoardPositionContextType = {
  boardCursor: { x: number; y: number };
  uiToBoard: (x: number, y: number) => { x: number; y: number };
  cursor: { x: number; y: number };
};

const CursorBoardPositionContext = createContext({
  cursor: { x: 0, y: 0 },
  boardCursor: { x: 0, y: 0 },
  uiToBoard: (x: number, y: number) => {
    return { x: 0, y: 0 };
  },
} as CursorBoardPositionContextType);

/**
 * Hook to oberve the user's cursor position on the board
 * Usable only on the board page
 * @returns (x, y) position of the cursor
 */
export function useCursorBoardPosition() {
  return useContext(CursorBoardPositionContext);
}

// Interval to update the cursor position within react provider
let updateCursorInterval = null as null | number;
let updateBoardCursorInterval = null as null | number;
const updateFrequency = 100;

export function CursorBoardPositionProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const [boardCursor, setBoardCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);

  // Update the cursor position useEffect
  useEffect(() => {
    updateCursorInterval = window.setInterval(() => {
      // Check if the cursor is value changed
      if (GLOBAL_CURSOR.x === cursor.x && GLOBAL_CURSOR.y === cursor.y) {
        return;
      }
      setCursor({
        x: GLOBAL_CURSOR.x,
        y: GLOBAL_CURSOR.y,
      });
    }, updateFrequency);
    return () => {
      if (updateCursorInterval) {
        window.clearInterval(updateCursorInterval);
      }
    };
  }, []);

  // Update the board cursor position
  useEffect(() => {
    updateBoardCursorInterval = window.setInterval(() => {
      const boardX = Math.floor(GLOBAL_CURSOR.x / scale - boardPosition.x);
      const boardY = Math.floor(GLOBAL_CURSOR.y / scale - boardPosition.y);
      setBoardCursor({ x: boardX, y: boardY });
    }, updateFrequency);
    return () => {
      if (updateBoardCursorInterval) {
        clearInterval(updateBoardCursorInterval);
      }
    };
  }, [boardPosition.x, boardPosition.y, scale]);

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
