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

export function CursorBoardPositionProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const [boardCursor, setBoardCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);
  const boardSynced = useUIStore((state) => state.boardSynced);
  const [, setLastEvent] = useState<MouseEvent | undefined>(undefined);

  // Throttle Functions for the cursor mousemove
  const throttleMove = throttle(100, (e: any) => {
    setCursor({ x: e.clientX, y: e.clientY });
    // Calculate Board Position
    const boardX = Math.floor(e.clientX / scale - boardPosition.x);
    const boardY = Math.floor(e.clientY / scale - boardPosition.y);
    setBoardCursor({ x: boardX, y: boardY });
  });
  const throttleMoveRef = useCallback(throttleMove, [boardPosition.x, boardPosition.y, scale]);

  useEffect(() => {
    setLastEvent((e) => {
      if (e) {
        throttleMoveRef(e);
      }
      return e;
    });
  }, [boardSynced]);

  // UseEffect to update the cursor position
  useEffect(() => {
    const updateCursor = (e: MouseEvent) => {
      // Simple hacky way to fix de-synced mouse and appwindow while dragging
      // Use Mouse 1 check as this as the controller (top left menu) uses react-rnd
      // if (!useUIStore.getState().appDragging) {
      setLastEvent(e);
      if (e.buttons !== 1) {
        throttleMoveRef(e);
      }
    };
    window.addEventListener('mousemove', updateCursor);
    return () => {
      window.removeEventListener('mousemove', updateCursor);
    };
  }, [throttleMoveRef]);

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
