/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useState, createContext, useContext } from 'react';
import { throttle } from 'throttle-debounce';

import { useUIStore } from '../stores';

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

  // This is needed to prevent throttleMoveRef from resettting the listeners
  // practical issue it solves: when dragging w/ left mouse,
  // then stopped (while still holding down left mouse) the use effect resets the listeners
  // this stops the temporary optimizations.
  const [, setIsMouseDown] = useState<boolean>(false);

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

  // Simple hacky way to (try) fix de-synced mouse and appwindow while dragging
  useEffect(() => {
    const updateCursor = (e: MouseEvent) => {
      setLastEvent(e);
      throttleMoveRef(e);
    };

    const stopListening = (e: MouseEvent) => {
      // !useUIStore.getState().appDragging
      //  || e.button === 1
      // Why was e.button === 1 disabled...?
      if (e.button === 0 || e.button === 1) {
        setIsMouseDown(true);
        window.removeEventListener('mousemove', updateCursor);
      }
    };

    const startListening = (e: MouseEvent) => {
      setIsMouseDown(false);
      window.addEventListener('mousemove', updateCursor, { passive: true });
      // setLastEvent(e);
    };

    setIsMouseDown((prev) => {
      if (!prev) {
        window.addEventListener('mousemove', updateCursor, { passive: true });
      }
      return prev;
    });
    window.addEventListener('mousedown', stopListening);
    window.addEventListener('mouseup', startListening);

    return () => {
      window.removeEventListener('mousedown', stopListening);
      window.removeEventListener('mouseup', startListening);
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

export function useUIToBoard() {
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);

  const uiToBoard = useCallback(
    (x: number, y: number) => {
      return {
        x: Math.floor(x / scale - boardPosition.x),
        y: Math.floor(y / scale - boardPosition.y),
      };
    },
    [boardPosition.x, boardPosition.y, scale]
  );

  return uiToBoard;
}
