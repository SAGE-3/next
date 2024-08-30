/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useEffect } from 'react';
import { Box, useColorModeValue, Text } from '@chakra-ui/react';
import { DraggableData, Position, Rnd, RndDragEvent } from 'react-rnd';

import { useHexColor, useThrottleScale, usePresenceStore } from '@sage3/frontend';
import { PresenceSchema } from '@sage3/shared/types';

import { Awareness } from './PresenceComponent';

type ViewportProps = {
  users: Awareness[];
  rate: number;
};

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

  // UI settings
  const color = useHexColor(props.color);
  const titleBarHeight = 28 / props.scale;
  const fontSize = 18 / props.scale;
  const borderRadius = 6 / props.scale;
  const borderWidth = 3 / props.scale;
  const textColor = useColorModeValue('white', 'black');

  // Position of the title bar being dragged
  const [pos, setPos] = useState<Position>({ x: props.viewport.position.x, y: props.viewport.position.y });
  // Position of the box below, to make it interactive
  const [pos2, setPos2] = useState<Position>({ x: props.viewport.position.x, y: props.viewport.position.y });

  const updatePresence = usePresenceStore((state) => state.update);

  // If size or position change, update the local state.
  useEffect(() => {
    setPos({ x: props.viewport.position.x, y: props.viewport.position.y });
    setPos2({ x: props.viewport.position.x, y: props.viewport.position.y });
  }, [props.viewport.position.x, props.viewport.position.y]);


  // Handle when the viewport starts to drag
  function handleDragStart(_e: RndDragEvent, data: DraggableData) {
    // nothing yet
  }
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
        size: props.viewport.size
      }
    });
  }

  return (
    <>
      <Rnd
        size={{ width: props.viewport.size.width, height: titleBarHeight }}
        position={{ x: pos.x, y: pos.y - titleBarHeight }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        enableResizing={false}
        disableDragging={false}
        lockAspectRatio={true}
        scale={props.scale}
        style={{
          borderRadius: borderRadius,
          background: `linear-gradient(180deg, ${color} ${titleBarHeight}px, transparent ${titleBarHeight}px, transparent 100%)`,
          zIndex: 3000,
        }}
      >
        <Text align={"center"} fontSize={fontSize + 'px'} textColor={textColor} userSelect={"none"}>
          Viewport for {props.name}
        </Text>
      </Rnd >

      <Box
        position="absolute"
        pointerEvents="none"
        // Update  the position to be below the title bar
        left={pos2.x}
        top={pos2.y}
        width={props.viewport.size.width}
        height={props.viewport.size.height}
        borderStyle="solid"
        borderWidth={borderWidth}
        borderColor={color}
        opacity={0.65}
        borderRadius={borderRadius}
        zIndex={3000}
      />

    </>
  );
}
