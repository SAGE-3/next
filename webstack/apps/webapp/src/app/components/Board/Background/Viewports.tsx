/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box } from '@chakra-ui/react';
import { useHexColor, usePresence, usePresenceStore, useUIStore, useUser, useUsersStore, useWindowResize } from '@sage3/frontend';
import { PresenceSchema } from '@sage3/shared/types';
import { useCallback, useEffect } from 'react';
import { throttle } from 'throttle-debounce';

type ViewportsProps = {
  boardId: string;
};

export function Viewports(props: ViewportsProps) {
  // Users and Presence Store
  const { user } = useUser();
  const users = useUsersStore((state) => state.users);

  // Presence Information
  const { update: updatePresence } = usePresence();
  const presences = usePresenceStore((state) => state.presences);

  // UI Scale
  const scale = useUIStore((state) => state.scale);
  const boardPosition = useUIStore((state) => state.boardPosition);

  // Window resize hook
  const { width: winWidth, height: winHeight } = useWindowResize();

  // Update the user's viewport every half second
  const throttleViewport = throttle(500, (x: number, y: number, width: number, height: number) => {
    const viewPos = { x, y, z: 0 };
    const viewWidth = width;
    const viewHeight = height;
    const viewSize = { width: viewWidth, height: viewHeight };
    updatePresence({ viewport: { position: viewPos, size: viewSize } });
  });

  // Keep a copy of the function
  const throttleViewportFunc = useCallback(throttleViewport, []);
  const viewportFunc = (x: number, y: number, w: number, h: number) => {
    // Check if event is on the board
    if (updatePresence) {
      // Send the throttled version to the server
      throttleViewportFunc(x, y, w, h);
    }
  };
  // Update Viewport Presence
  useEffect(() => {
    viewportFunc(-boardPosition.x, -boardPosition.y, winWidth / scale, winHeight / scale);
  }, [boardPosition.x, boardPosition.y, winWidth, winHeight, scale]);

  // Attach the mouse move event to the window
  useEffect(() => {
    const mouseMove = (e: MouseEvent) => {
      viewportFunc(-boardPosition.x, -boardPosition.y, winWidth / scale, winHeight / scale);
    };
    window.addEventListener('mousemove', mouseMove);
    return () => window.removeEventListener('mousemove', mouseMove);
  }, [boardPosition.x, boardPosition.y, scale, winWidth, winHeight]);

  // Render the Viewports
  return (
    <>
      {/* Draw the  viewports: filter by board and not myself */}
      {presences
        .filter((el) => el.data.boardId === props.boardId)
        .filter((el) => el.data.userId !== user?._id)
        .map((presence) => {
          const u = users.find((el) => el._id === presence.data.userId);
          if (!u) return null;
          const name = u.data.name;
          const color = u.data.color;
          const viewport = presence.data.viewport;
          const isWall = u.data.userType === 'wall';
          return <UserViewport key={'viewport-' + u._id} isWall={isWall} name={name} color={color} viewport={viewport} scale={scale} />;
        })}
    </>
  );
}

type UserViewportProps = {
  name: string;
  color: string;
  viewport: PresenceSchema['viewport'];
  scale: number;
  isWall: boolean;
};

function UserViewport(props: UserViewportProps) {
  // If this is not a wall usertype, then we don't render the viewport
  if (!props.isWall) return null;
  const color = useHexColor(props.color);
  return (
    <Box
      borderStyle="solid"
      borderWidth={3 / props.scale}
      borderColor={color}
      borderTop={'none'}
      position="absolute"
      pointerEvents="none"
      left={props.viewport.position.x + 'px'}
      top={props.viewport.position.y + 'px'}
      width={props.viewport.size.width + 'px'}
      height={props.viewport.size.height + 'px'}
      opacity={0.5}
      borderRadius="8px 8px 8px 8px"
      transition="all 0.5s"
      color="white"
      fontSize="xl"
      pl="2"
      background={`linear-gradient(180deg, ${color} 30px, transparent 30px, transparent 100%)`}
    >
      Viewport for {props.name}
    </Box>
  );
}
