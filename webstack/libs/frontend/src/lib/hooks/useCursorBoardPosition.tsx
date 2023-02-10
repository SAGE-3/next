/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useState } from 'react';
import { useUIStore } from '../stores';
import { throttle } from 'throttle-debounce';

/**
 * Hook to oberve the user's cursor position on the board
 * Usable only on the board page
 * @returns (x, y) position of the cursor
 */
export function useCursorBoardPosition(): {
  position: { x: number; y: number };
  uiToBoard: (x: number, y: number) => { x: number; y: number };
  mouse: { x: number; y: number };
} {
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);

  // Throttle the Update
  const throttleUpdate = throttle(30, (mx: number, my: number, cx: number, cy: number) => {
    setMouse({ x: mx, y: my });
    setPosition({
      x: cx,
      y: cy,
    });
  });

  // Keep the throttlefunc reference
  const throttleUpdateFunc = useCallback(throttleUpdate, []);

  const uiToBoard = useCallback(
    (x: number, y: number) => {
      return { x: Math.floor(x / scale - boardPosition.x), y: Math.floor(y / scale - boardPosition.y) };
    },
    [boardPosition.x, boardPosition.y, scale]
  );

  // Oberver for window resize
  useEffect(() => {
    const updateCursorPosition = (event: MouseEvent) => {
      const x = Math.floor(event.clientX / scale - boardPosition.x);
      const y = Math.floor(event.clientY / scale - boardPosition.y);
      throttleUpdateFunc(event.clientX, event.clientY, x, y);
    };
    window.addEventListener('mousemove', updateCursorPosition);
    return () => window.removeEventListener('mousemove', updateCursorPosition);
  }, [boardPosition.x, boardPosition.y, scale, throttleUpdateFunc]);

  return { position, uiToBoard, mouse };
}
