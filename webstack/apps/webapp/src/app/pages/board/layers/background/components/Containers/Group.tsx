/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';

import { useThrottleScale, useHexColor } from '@sage3/frontend';
import { App } from '@sage3/applications/schema';

type GroupProps = {
  apps: App[];
  name: string;
  color: string;
};

export function Group(props: GroupProps) {
  // UI Scale
  const scale = useThrottleScale(250);
  const color = useHexColor(props.color);
  const titleBarHeight = 28 / scale;
  const fontSize = 18 / scale;
  const borderRadius = 6 / scale;
  const borderWidth = 3 / scale;
  const textColor = useColorModeValue('white', 'black');

  const left = Math.min(...props.apps.map((el) => el.data.position.x)) - 5;
  const top = Math.min(...props.apps.map((el) => el.data.position.y)) - 5;
  const right = Math.max(...props.apps.map((el) => el.data.position.x + el.data.size.width)) + 5;
  const bottom = Math.max(...props.apps.map((el) => el.data.position.y + el.data.size.height)) + 5;
  const width = right - left;
  const height = bottom - top;

  return (
    <Box
      borderStyle="dashed"
      borderWidth={borderWidth}
      borderColor={color}
      borderTop={'none'}
      position="absolute"
      pointerEvents="none"
      left={left + 'px'}
      top={top - titleBarHeight + 'px'}
      width={width + 'px'}
      height={height + titleBarHeight + 'px'}
      opacity={0.75}
      borderRadius={borderRadius}
      color="white"
      fontSize={fontSize + 'px'}
      pl="2"
      background={`linear-gradient(180deg, ${color} ${titleBarHeight}px, transparent ${titleBarHeight}px, transparent 100%)`}
      textColor={textColor}
      zIndex={3000}
    >
      {props.name}
    </Box>
  );
}
