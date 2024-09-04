/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useEffect } from 'react';
import { Box, useColorModeValue, Text } from '@chakra-ui/react';
import { DraggableData, Rnd, RndDragEvent } from 'react-rnd';

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
      {/* Draw the  viewports: filter by board and not myself */}
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

  // When the viewport is being dragged
  function handleDrag(_e: RndDragEvent, data: DraggableData) {
    // Update the box position to make it interactive
    setPos2((state) => ({ x: data.x, y: data.y + titleBarHeight }));
  }
  // Handle when the viewport is finished being dragged
  function handleDragStop(_e: RndDragEvent, data: DraggableData) {
    setPos({ x: data.x, y: data.y + titleBarHeight });
    // Update the remote presence
    updatePresence(props.userId, {
      status: 'online',
      userId: props.userId,
      viewport: {
        position: { x: data.x, y: data.y + titleBarHeight, z: props.viewport.position.z },
        size: props.viewport.size,
      },
    });
  }

  // When the viewport is being resized
  function handleResizeStart(_e: RndDragEvent, data: DraggableData) {
    setSize2((state) => ({ width: props.viewport.size.width, height: props.viewport.size.height }));
  }
  function handleResize(_e: RndDragEvent, data: DraggableData) {
    // Update the box position to make it interactive, keep aspect ratio
    const ar = props.viewport.size.width / props.viewport.size.height;
    const newW = data.x - pos2.x + titleBarHeight;
    const newH = newW / ar;
    setSize2((state) => ({ width: newW, height: newH }));
  }
  // Handle when the viewport is finished being dragged
  function handleResizeStop(_e: RndDragEvent, data: DraggableData) {
    setSize2((state) => ({ width: size2.width, height: size2.height }));
    // Update the remote presence
    updatePresence(props.userId, {
      status: 'online',
      userId: props.userId,
      viewport: {
        position: { x: props.viewport.position.x, y: props.viewport.position.y, z: props.viewport.position.z },
        size: { width: size2.width, height: size2.height, depth: props.viewport.size.depth },
      },
    });
  }

  return (
    <>
      {/* Titlebar */}
      <Rnd
        size={{ width: size2.width, height: titleBarHeight }}
        position={{ x: pos.x, y: pos.y - titleBarHeight }}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        enableResizing={false}
        disableDragging={isGuest}
        lockAspectRatio={true}
        scale={props.scale}
        style={{
          borderRadius: `${borderRadius}px ${borderRadius}px 0px 0px`,
          background: color,
          zIndex: 3000,
          opacity: opacity,
        }}
      >
        <Text align={'center'} fontSize={fontSize + 'px'} textColor={textColor} userSelect={'none'}>
          Viewport for {props.name}
        </Text>
      </Rnd>

      {/* Corner */}
      <Rnd
        size={{ width: titleBarHeight, height: titleBarHeight }}
        position={{
          x: pos2.x + size2.width - titleBarHeight,
          y: pos2.y + size2.height - titleBarHeight,
        }}
        onDragStart={handleResizeStart}
        onDrag={handleResize}
        onDragStop={handleResizeStop}
        enableResizing={false}
        disableDragging={isGuest}
        lockAspectRatio={true}
        scale={props.scale}
        style={{
          borderRadius: `${borderRadius}px 0px 0px 0px`,
          background: color,
          zIndex: 3000,
          opacity: opacity,
          cursor: 'nwse-resize',
        }}
      />

      {/* Box */}
      <Box
        position="absolute"
        pointerEvents="none"
        // Update the position to be below the title bar
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
