/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useEffect, useRef } from 'react';
import { Box, useColorModeValue, Text } from '@chakra-ui/react';

import { useHexColor, useThrottleScale, usePresenceStore, useAuth } from '@sage3/frontend';
import { PresenceSchema, Position, Size } from '@sage3/shared/types';

import { Awareness } from './PresenceComponent';

type ViewportProps = {
  users: Awareness[];
  rate: number;
};

// Refine the types used in the Viewport
type Position2D = Omit<Position, 'z'>;
type Size2D = Omit<Size, 'depth'>;

export function Viewports(props: ViewportProps) {
  // UI Scale
  const scale = useThrottleScale(250);

  // Render the Viewports
  return (
    <>
      {/* Draw the viewports: filter by board and not myself */}
      {props.users.map((u) => {
        const name = u.user.data.name;
        const color = u.user.data.color;
        const viewport = u.presence.data.viewport;
        const isWall = u.user.data.userType === 'wall';
        return (
          <UserViewport
            key={'viewport-' + u.user._id}
            userId={u.user._id}
            isWall={isWall}
            name={name}
            color={color}
            viewport={viewport}
            scale={scale}
            rate={props.rate}
          />
        );
      })}
    </>
  );
}

type UserViewportProps = {
  name: string;
  userId: string;
  color: string;
  viewport: PresenceSchema['viewport'];
  scale: number;
  isWall: boolean;
  rate: number;
};

function UserViewport(props: UserViewportProps) {
  // If this is not a wall usertype, then we don't render the viewport
  if (!props.isWall) return null;

  // Get the user auth information
  const { auth } = useAuth();
  const [isGuest, setIsGuest] = useState(true);

  // UI settings
  const color = useHexColor(props.color);
  const titleBarHeight = 28 / props.scale;
  const fontSize = 18 / props.scale;
  const borderRadius = 6 / props.scale;
  const borderWidth = 3 / props.scale;
  const textColor = useColorModeValue('white', 'black');
  const opacity = 0.55;

  // Position of the title bar being dragged
  const [pos, setPos] = useState<Position2D>({ x: props.viewport.position.x, y: props.viewport.position.y });
  // Position of the box below, to make it interactive
  const [pos2, setPos2] = useState<Position2D>({ x: props.viewport.position.x, y: props.viewport.position.y });
  const [size2, setSize2] = useState<Size2D>({ width: props.viewport.size.width, height: props.viewport.size.height });

  const updatePresence = usePresenceStore((state) => state.update);

  // Drag refs for title bar
  const titleDragActiveRef = useRef(false);
  const titleDragStartClientRef = useRef({ x: 0, y: 0 });
  const titleDragStartPosRef = useRef<Position2D>({ x: 0, y: 0 });

  // Drag refs for corner resize handle
  const cornerDragActiveRef = useRef(false);
  const cornerDragStartClientRef = useRef({ x: 0, y: 0 });
  const cornerDragStartSizeRef = useRef<Size2D>({ width: 0, height: 0 });

  // Are you a guest?
  useEffect(() => {
    if (auth) {
      setIsGuest(auth.provider === 'guest');
    }
  }, [auth]);

  // If size or position change, update the local states.
  useEffect(() => {
    setPos({ x: props.viewport.position.x, y: props.viewport.position.y });
    setPos2({ x: props.viewport.position.x, y: props.viewport.position.y });
  }, [props.viewport.position.x, props.viewport.position.y]);
  useEffect(() => {
    setSize2({ width: props.viewport.size.width, height: props.viewport.size.height });
  }, [props.viewport.size.width, props.viewport.size.height]);

  // ─── Title bar drag handlers ───────────────────────────────────────────────

  function handleTitlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (isGuest) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    titleDragActiveRef.current = true;
    titleDragStartClientRef.current = { x: e.clientX, y: e.clientY };
    titleDragStartPosRef.current = { x: pos.x, y: pos.y };
  }

  function handleTitlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!titleDragActiveRef.current) return;
    const dx = (e.clientX - titleDragStartClientRef.current.x) / props.scale;
    const dy = (e.clientY - titleDragStartClientRef.current.y) / props.scale;
    const newX = titleDragStartPosRef.current.x + dx;
    const newY = titleDragStartPosRef.current.y + dy;
    setPos({ x: newX, y: newY });
    setPos2({ x: newX, y: newY });
  }

  function handleTitlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!titleDragActiveRef.current) return;
    titleDragActiveRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const dx = (e.clientX - titleDragStartClientRef.current.x) / props.scale;
    const dy = (e.clientY - titleDragStartClientRef.current.y) / props.scale;
    const newX = titleDragStartPosRef.current.x + dx;
    const newY = titleDragStartPosRef.current.y + dy;
    setPos({ x: newX, y: newY });
    setPos2({ x: newX, y: newY });
    updatePresence(props.userId, {
      status: 'online',
      userId: props.userId,
      viewport: {
        position: { x: newX, y: newY, z: props.viewport.position.z },
        size: props.viewport.size,
        selfUpdate: false,
      },
    });
  }

  // ─── Corner resize drag handlers ──────────────────────────────────────────

  function handleCornerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (isGuest) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    cornerDragActiveRef.current = true;
    cornerDragStartClientRef.current = { x: e.clientX, y: e.clientY };
    // Reset to server state at start of resize
    cornerDragStartSizeRef.current = { width: props.viewport.size.width, height: props.viewport.size.height };
    setSize2({ width: props.viewport.size.width, height: props.viewport.size.height });
  }

  function handleCornerPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!cornerDragActiveRef.current) return;
    const ar = props.viewport.size.width / props.viewport.size.height;
    const dx = (e.clientX - cornerDragStartClientRef.current.x) / props.scale;
    const newW = Math.max(cornerDragStartSizeRef.current.width + dx, 400);
    const newH = newW / ar;
    setSize2({ width: newW, height: newH });
  }

  function handleCornerPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!cornerDragActiveRef.current) return;
    cornerDragActiveRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    updatePresence(props.userId, {
      status: 'online',
      userId: props.userId,
      viewport: {
        position: { x: props.viewport.position.x, y: props.viewport.position.y, z: props.viewport.position.z },
        size: { width: size2.width, height: size2.height, depth: props.viewport.size.depth },
        selfUpdate: false,
      },
    });
  }

  return (
    <>
      {/* Titlebar */}
      <div
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y - titleBarHeight,
          width: size2.width,
          height: titleBarHeight,
          borderRadius: `${borderRadius}px ${borderRadius}px 0px 0px`,
          background: color,
          zIndex: 3000,
          opacity: opacity,
          cursor: isGuest ? 'default' : 'move',
          touchAction: 'none',
          userSelect: 'none',
          overflow: 'hidden',
        }}
        onPointerDown={handleTitlePointerDown}
        onPointerMove={handleTitlePointerMove}
        onPointerUp={handleTitlePointerUp}
      >
        <Text align={'center'} fontSize={fontSize + 'px'} textColor={textColor} userSelect={'none'} noOfLines={1}>
          Viewport for {props.name}
        </Text>
      </div>

      {/* Corner resize handle */}
      <div
        style={{
          position: 'absolute',
          left: pos2.x + size2.width - titleBarHeight,
          top: pos2.y + size2.height - titleBarHeight,
          width: titleBarHeight,
          height: titleBarHeight,
          borderRadius: `${borderRadius}px 0px ${borderRadius}px 0px`,
          background: color,
          zIndex: 3000,
          opacity: opacity,
          cursor: isGuest ? 'default' : 'nwse-resize',
          touchAction: 'none',
          userSelect: 'none',
        }}
        onPointerDown={handleCornerPointerDown}
        onPointerMove={handleCornerPointerMove}
        onPointerUp={handleCornerPointerUp}
      />

      {/* Box */}
      <Box
        position="absolute"
        pointerEvents="none"
        left={pos2.x}
        top={pos2.y}
        width={size2.width}
        height={size2.height}
        borderStyle="solid"
        borderWidth={borderWidth}
        borderColor={color}
        opacity={opacity}
        borderRadius={`0px 0px ${borderRadius}px ${borderRadius}px `}
        zIndex={3000}
      />
    </>
  );
}
