/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { useUIStore } from '../stores';

/**
 * Hook to oberve the user's cursor position on the board
 * Usable only on the board page
 * @returns (width, height) of the window
 */
export function useCursorBoardPosition(): { x: number; y: number } {
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);

  // Oberver for window resize
  useEffect(() => {
    const updateCursorPosition = (event: MouseEvent) => {
      setPosition({
        x: event.clientX / scale - boardPosition.x,
        y: event.clientY / scale - boardPosition.y,
      });
    };
    window.addEventListener('mousemove', updateCursorPosition);
    return () => window.removeEventListener('mousemove', updateCursorPosition);
  }, [boardPosition.x, boardPosition.y, scale]);

  return position;
}
