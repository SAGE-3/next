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
  movement: { x: number; y: number };
};

const CursorBoardPositionContext = createContext<CursorBoardPositionContextType>({
  boardCursor: { x: 0, y: 0 },
  uiToBoard: (x: number, y: number) => { return { x: 0, y: 0 }; },
  cursor: { x: 0, y: 0 },
  movement: { x: 0, y: 0 },
});

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

  const [pointerLocked, setPointerLocked] = useState(false);
  const values = useContext(CursorBoardPositionContext);

  const [clientCursor, setClientCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const handleCursorUpdate = useCallback((ev: MouseEvent) => setClientCursor({ x: ev.clientX, y: ev.clientY }), []);

  const handleLockedUpdate = (ev: MouseEvent) => {
    values.movement.x += ev.movementX;
    values.movement.y += ev.movementY;
  };

  function lockChangeAlert() {
    const board = document.getElementById('board');
    if (document.pointerLockElement === board) {
      console.log("The pointer lock status is now locked");
      setPointerLocked(true);
      values.movement.x = 0;
      values.movement.y = 0;
      window.addEventListener('mousemove', handleLockedUpdate);
    } else {
      console.log("The pointer lock status is now unlocked");
      setPointerLocked(false);
      values.movement.x = 0;
      values.movement.y = 0;
      window.removeEventListener('mousemove', handleLockedUpdate);
    }
  }

  useEffect(() => {
    window.addEventListener('mousemove', handleCursorUpdate);
    return () => window.removeEventListener('mousemove', handleCursorUpdate);
  }, [handleCursorUpdate]);

  useEffect(() => {
    // Pointer lock
    document.addEventListener("pointerlockchange", lockChangeAlert, false);
    return () => {
      document.removeEventListener("pointerlockchange", lockChangeAlert, false);
    };
  }, []);

  // Throttle the Update
  const throttleUpdate = throttle(1000, (cx: number, cy: number, bx: number, by: number) => {
    setCursor({ x: cx, y: cy });
    setBoardCursor({ x: bx, y: by });
  });

  // Keep the throttlefunc reference
  const throttleUpdateFunc = useCallback(throttleUpdate, []);

  const uiToBoard = useCallback(
    (x: number, y: number) => {
      return { x: Math.floor(x / scale - boardPosition.x), y: Math.floor(y / scale - boardPosition.y) };
    },
    [boardPosition.x, boardPosition.y, scale]
  );

  useEffect(() => {
    let offsetx = 0;
    let offsety = 0;
    if (pointerLocked) {
      offsetx = values.movement.x;
      offsety = values.movement.y;
    }
    const boardX = Math.floor((clientCursor.x + offsetx) / scale - boardPosition.x);
    const boardY = Math.floor((clientCursor.y + offsety) / scale - boardPosition.y);
    if (pointerLocked) {
      // Unthrottled update in lock mode ?
      setCursor({ x: clientCursor.x, y: clientCursor.y });
      setBoardCursor({ x: boardX, y: boardY });
    } else {
      throttleUpdateFunc(clientCursor.x, clientCursor.y, boardX, boardY);
    }
  }, [boardPosition.x, boardPosition.y, scale, clientCursor.x, clientCursor.y, throttleUpdateFunc, pointerLocked, values.movement.x, values.movement.y]);

  return (
    <CursorBoardPositionContext.Provider value={{ movement: values.movement, cursor, uiToBoard, boardCursor }}>
      {props.children}
    </CursorBoardPositionContext.Provider>
  );
}
