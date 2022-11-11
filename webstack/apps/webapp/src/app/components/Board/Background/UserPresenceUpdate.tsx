/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useCursorBoardPosition, usePresence, useUIStore, useUser, useWindowResize } from '@sage3/frontend';
import { useCallback, useEffect } from 'react';
import { throttle } from 'throttle-debounce';

// Update this user's presence
export function UserPresenceUpdate() {
  // Presence Information
  const { update: updatePresence } = usePresence();

  // UI Scale
  const scale = useUIStore((state) => state.scale);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const boardDragging = useUIStore((state) => state.boardDragging);

  // Window resize hook
  const { width: winWidth, height: winHeight } = useWindowResize();
  const { uiToBoard } = useCursorBoardPosition();

  // Throttle the Update
  const throttleUpdate = throttle(1000, (vx: number, vy: number, vw: number, vh: number, cx?: number, cy?: number) => {
    const cursor = cx && cy ? { x: cx, y: cy } : undefined;
    const viewport = { position: { x: vx, y: vy }, size: { width: vw, height: vh } };
    const update = {
      viewport,
      cursor,
    };
    updatePresence({ ...update });
  });

  // Keep the throttlefunc reference
  const throttleUpdateFunc = useCallback(throttleUpdate, []);

  // Board Pan, zoom, or Window resize
  useEffect(() => {
    throttleUpdateFunc(-boardPosition.x, -boardPosition.y, winWidth / scale, winHeight / scale);
  }, [boardPosition.x, boardPosition.y, scale, winWidth, winHeight]);

  // Mouse Move
  useEffect(() => {
    const mouseMove = (e: MouseEvent) => {
      if (!boardDragging) {
        const { x, y } = uiToBoard(e.clientX, e.clientY);
        throttleUpdateFunc(-boardPosition.x, -boardPosition.y, winWidth / scale, winHeight / scale, x, y);
      }
    };
    window.addEventListener('mousemove', mouseMove);
    return () => window.removeEventListener('mousemove', mouseMove);
  }, [boardPosition.x, boardPosition.y, scale, winWidth, winHeight, boardDragging, uiToBoard]);

  return null;
}
