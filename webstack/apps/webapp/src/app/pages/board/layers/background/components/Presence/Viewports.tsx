/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { DraggableData, Position, ResizableDelta, Rnd, RndDragEvent } from 'react-rnd';
import { useCursorBoardPosition, useHexColor, useThrottleScale, usePresenceStore } from '@sage3/frontend';
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

  const { uiToBoard } = useCursorBoardPosition();

  const [pos, setPos] = useState<Position>({ x: props.viewport.position.x, y: props.viewport.position.y });
  const [dragging, setDragging] = useState(false);
  // Presence store
  const updatePresence = usePresenceStore((state) => state.update);

  // If size or position change, update the local state.
  useEffect(() => {
    setPos({ x: props.viewport.position.x, y: props.viewport.position.y });
  }, [props.viewport.position.x, props.viewport.position.y]);

  // Handle when the viewport starts to drag
  function handleDragStart(_e: RndDragEvent, data: DraggableData) {
    setDragging(true);
  }

  // When the viewport is being dragged
  function handleDrag(_e: RndDragEvent, data: DraggableData) {
    // nothing yet
  }

  // Handle when the viewport is finished being dragged
  function handleDragStop(_e: RndDragEvent, data: DraggableData) {
    setPos({ x: data.x, y: data.y });
    setDragging(false);
    // Update the remote presence
    updatePresence(props.userId, {
      status: 'online',
      userId: props.userId,
      viewport: {
        position: { x: data.x, y: data.y, z: props.viewport.position.z },
        size: props.viewport.size
      }
    });
  }


  return (
    <Rnd
      dragHandleClassName="titlebar"
      size={{ width: props.viewport.size.width, height: props.viewport.size.height }}
      position={{ x: pos.x, y: pos.y }}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragStop={handleDragStop}
      // onResizeStart={handleResizeStart}
      // onResize={handleResize}
      // onResizeStop={handleResizeStop}
      // onClick={handleAppClick}
      // onPointerDown={handleAppTouchStart}
      // onPointerMove={handleAppTouchMove}
      enableResizing={false}
      disableDragging={false}
      lockAspectRatio={true}
      // resizeHandleStyles={{
      //   bottom: { transform: `scaleY(${handleScale})` },
      //   bottomLeft: { transform: `scale(${handleScale})` },
      //   bottomRight: { transform: `scale(${handleScale})` },
      //   left: { transform: `scaleX(${handleScale})` },
      //   right: { transform: `scaleX(${handleScale})` },
      //   top: { transform: `scaleY(${handleScale})` },
      //   topLeft: { transform: `scale(${handleScale})` },
      //   topRight: { transform: `scale(${handleScale})` },
      // }}
      // Scaling of the board
      scale={props.scale}
      style={{
        borderRadius: borderRadius, opacity: dragging ? 1 : 0.75,
        border: `${borderWidth}px solid ${color}`,
        background: `linear-gradient(180deg, ${color} ${titleBarHeight}px, transparent ${titleBarHeight}px, transparent 100%)`
      }}
    >
      {/* <Box
        borderStyle="solid"
        borderWidth={borderWidth}
        borderColor={color}
        borderTop={'none'}
        position="absolute"
        pointerEvents="none"
        left={props.viewport.position.x + 'px'}
        top={props.viewport.position.y - titleBarHeight + 'px'}
        width={props.viewport.size.width + 'px'}
        height={props.viewport.size.height + titleBarHeight + 'px'}
        opacity={0.65}
        borderRadius={borderRadius}
        transitionProperty="left, top, width, height"
        transitionTimingFunction={'ease-in-out'}
        transitionDuration={props.rate / 1000 + 's'}
        transitionDelay={'0s'}
        color="white"
        fontSize={fontSize + 'px'}
        pl="2"
        background={`linear-gradient(180deg, ${color} ${titleBarHeight}px, transparent ${titleBarHeight}px, transparent 100%)`}
        textColor={textColor}
        zIndex={3000}
      > */}
      <Box className="titlebar" cursor={"grab"} zIndex={3000} userSelect={"none"}>
        <Text fontSize={fontSize + 'px'} textColor={textColor} userSelect={"none"}>Viewport for {props.name}</Text>
      </Box>
      {/* </Box> */}
    </Rnd>
  );
}
