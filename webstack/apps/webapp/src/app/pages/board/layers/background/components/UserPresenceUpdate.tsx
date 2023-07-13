/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCursorBoardPosition, usePresenceStore, useUIStore, useUser, useWindowResize } from '@sage3/frontend';
import { useCallback, useEffect } from 'react';
import { throttle } from 'throttle-debounce';

const SlowUpdateRate = 1000 / 3;
const FastUpdateRate = 1000 / 20;

// Update this user's presence
export function UserPresenceUpdate() {
  // Presence Information
  const { user } = useUser();
  const updatePresence = usePresenceStore((state) => state.update);

  // UI Scale
  const scale = useUIStore((state) => state.scale);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const boardDragging = useUIStore((state) => state.boardDragging);
  const setViewport = useUIStore((state) => state.setViewport);

  // Window resize hook
  const { width: winWidth, height: winHeight } = useWindowResize();
  const { mouseToBoard } = useCursorBoardPosition();

  // Throttle the Update
  const throttleFastUpdate = throttle(FastUpdateRate, (cx: number, cy: number) => {
    if (user && cx && cy) {
      updatePresence(user?._id, { cursor: { x: cx, y: cy, z: 0 } });
    }
  });
  const throttleSlowUpdate = throttle(SlowUpdateRate, (vx: number, vy: number, vw: number, vh: number) => {
    if (user) {
      const viewport = { position: { x: vx, y: vy, z: 0 }, size: { width: vw, height: vh, depth: 0 } };
      updatePresence(user?._id, { viewport });
    }
  });

  // Keep the throttlefunc reference
  const throttleViewportUpdateFunc = useCallback(throttleSlowUpdate, []);
  const throttleCursorUpdateFunc = useCallback(throttleFastUpdate, []);

  // Board Pan, zoom, or Window resize
  useEffect(() => {
    throttleViewportUpdateFunc(-boardPosition.x, -boardPosition.y, winWidth / scale, winHeight / scale);

    // Update the local user's viewport value as fast as possible
    const viewport = {
      position: { x: -boardPosition.x, y: -boardPosition.y },
      size: { width: winWidth / scale, height: winHeight / scale },
    };
    setViewport(viewport.position, viewport.size);
  }, [boardPosition.x, boardPosition.y, scale, winWidth, winHeight]);

  // Mouse Move
  useEffect(() => {
    if (!boardDragging) {
      const { x, y } = mouseToBoard();
      throttleCursorUpdateFunc(x, y);
    }
  }, [boardPosition.x, boardPosition.y, scale, winWidth, winHeight, boardDragging, mouseToBoard]);

  return null;
}
