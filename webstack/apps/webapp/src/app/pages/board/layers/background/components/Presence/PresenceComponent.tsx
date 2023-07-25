/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCursorBoardPosition, usePresenceStore, useUIStore, useUser, useUsersStore, useWindowResize } from '@sage3/frontend';
import { useCallback, useEffect } from 'react';
import { throttle } from 'throttle-debounce';
import { Cursors } from './Cursors';
import { Viewports } from './Viewports';
import { User, Presence } from '@sage3/shared/types';

const SlowUpdateRate = 1000 / 3;
const MediumUpdateRate = 1000 / 7;
const FastUpdateRate = 1000 / 12;

type PresenceProps = {
  boardId: string;
};

export type Awareness = {
  user: User;
  presence: Presence;
};

// SAGE3 Board Presence Display amd Update
export function PresenceComponent(props: PresenceProps) {
  // Presence Information
  const { user } = useUser();
  const isWall = user?.data.userType === 'wall';
  const updatePresence = usePresenceStore((state) => state.update);

  // Presence Information
  const users = useUsersStore((state) => state.users);
  const presences = usePresenceStore((state) => state.presences);

  // Filter users to this board and not myself
  const userPresences = presences.filter((el) => el.data.boardId === props.boardId).filter((el) => el.data.userId !== user?._id);
  // Convert to Awareness
  const awareness = userPresences.map((el) => {
    return {
      user: users.find((u) => u._id === el.data.userId),
      presence: el,
    } as Awareness;
  });

  // UI Store
  const scale = useUIStore((state) => state.scale);
  const showPresence = useUIStore((state) => state.showPresence);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const boardDragging = useUIStore((state) => state.boardDragging);
  const setViewport = useUIStore((state) => state.setViewport);

  // Window resize hook
  const { width: winWidth, height: winHeight } = useWindowResize();
  const { mouseToBoard } = useCursorBoardPosition();

  // Throttle the Update
  const throttleCursorUpdate = throttle(MediumUpdateRate, (cx: number, cy: number) => {
    if (user && cx && cy) {
      updatePresence(user?._id, { cursor: { x: cx, y: cy, z: 0 } });
    }
  });
  const throttleViewportUpdate = throttle(MediumUpdateRate, (vx: number, vy: number, vw: number, vh: number) => {
    if (user) {
      const viewport = { position: { x: vx, y: vy, z: 0 }, size: { width: vw, height: vh, depth: 0 } };
      updatePresence(user?._id, { viewport });
    }
  });

  // Keep the throttlefunc reference
  const throttleViewportUpdateFunc = useCallback(throttleViewportUpdate, []);
  const throttleCursorUpdateFunc = useCallback(throttleCursorUpdate, []);

  // Board Pan, zoom, or Window resize
  useEffect(() => {
    if (isWall) {
      throttleViewportUpdateFunc(-boardPosition.x, -boardPosition.y, winWidth / scale, winHeight / scale);
    }

    // Update the local user's viewport value as fast as possible
    const viewport = {
      position: { x: -boardPosition.x, y: -boardPosition.y },
      size: { width: winWidth / scale, height: winHeight / scale },
    };
    setViewport(viewport.position, viewport.size);
  }, [boardPosition.x, boardPosition.y, scale, winWidth, winHeight, isWall]);

  // Mouse Move
  useEffect(() => {
    if (!boardDragging) {
      const { x, y } = mouseToBoard();
      throttleCursorUpdateFunc(x, y);
    }
  }, [boardPosition.x, boardPosition.y, scale, winWidth, winHeight, boardDragging, mouseToBoard]);

  return (
    <>
      {showPresence && (
        <>
          {/* User Cursors */}
          <Cursors users={awareness} rate={MediumUpdateRate} />
          {/* User Viewports */}
          <Viewports users={awareness} rate={MediumUpdateRate} />
        </>
      )}
    </>
  );
}
