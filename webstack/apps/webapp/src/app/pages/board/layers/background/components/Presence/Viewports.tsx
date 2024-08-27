/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';

import { useHexColor, useThrottleScale } from '@sage3/frontend';
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

  return (
    <Box
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
    >
      Viewport for {props.name}
    </Box>
  );
}
