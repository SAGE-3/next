/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect } from 'react';
import { throttle } from 'throttle-debounce';

import {
  useCursorBoardPosition,
  usePresenceStore,
  useUIStore,
  useUser,
  useUserSettings,
  useUsersStore,
  useWindowResize,
} from '@sage3/frontend';
import { User, Presence, Position, Size } from '@sage3/shared/types';

import { Cursors } from './Cursors';
import { Viewports } from './Viewports';

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

  // Settings
  const { settings } = useUserSettings();
  const showCursors = settings.showCursors;
  const showViewports = settings.showViewports;

  // UI Store
  const scale = useUIStore((state) => state.scale);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const boardDragging = useUIStore((state) => state.boardDragging);
  const setViewport = useUIStore((state) => state.setViewport);

  // Window resize hook
  const { width: winWidth, height: winHeight } = useWindowResize();
  const { getBoardCursor } = useCursorBoardPosition();

  // Throttle the Update
  const throttleCursorUpdate = useCallback(
    throttle(MediumUpdateRate, (cx: number, cy: number) => {
      if (user && cx && cy) {
        updatePresence(user?._id, { cursor: { x: cx, y: cy, z: 0 } });
      }
    }),
    [user, updatePresence],
  );

  const throttleViewportUpdate = useCallback(
    throttle(MediumUpdateRate, (viewport: { position: Position; size: Size }) => {
      if (user) {
        updatePresence(user?._id, { viewport: { ...viewport, selfUpdate: true } });
      }
      setViewport(viewport.position, viewport.size);
    }),
    [user, updatePresence, setViewport],
  );

  // Board Pan, zoom, or Window resize
  useEffect(() => {
    const viewport = {
      position: { x: -boardPosition.x, y: -boardPosition.y, z: 0 },
      size: { width: winWidth / scale, height: winHeight / scale, depth: 0 },
    };
    throttleViewportUpdate(viewport);
  }, [boardPosition.x, boardPosition.y, scale, winWidth, winHeight, throttleViewportUpdate]);

  // Mouse Move - track cursor position directly via mousemove
  useEffect(() => {
    const handleMouseMove = () => {
      if (!boardDragging) {
        const cursor = getBoardCursor();
        throttleCursorUpdate(cursor.x, cursor.y);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [boardDragging, getBoardCursor, throttleCursorUpdate]);

  return (
    <>
      {showCursors && <Cursors users={awareness} rate={FastUpdateRate} />}
      {showViewports && <Viewports users={awareness} rate={SlowUpdateRate} />}
    </>
  );
}
