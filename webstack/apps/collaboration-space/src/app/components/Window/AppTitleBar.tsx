/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';
import { motion, MotionValue, useTransform } from 'framer-motion';

import { Box } from '@chakra-ui/react';

import { AppProps, PanZoomState } from '@sage3/shared/types';
import { AppPositionMotion, AppPositionSetters } from './useAppPosition';

export function AppTitleBar(props: {
  titleBarColor: string;
  position: AppProps['position'];
  motion: AppPositionMotion;
  set: AppPositionSetters;
  onDragEnd(offset: { x: number; y: number }): void;
  onHoverStart(): void;
  onHoverEnd(): void;
  zoomState: () => { x: number; y: number; scale: number; };
  scaleBy: number;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <motion.div
      drag={true}
      dragMomentum={false}
      initial={false}
      animate={{ transformOrigin: '0%' }}
      style={{
        display: 'inline-flex',
        position: 'absolute',
        bottom: '100%',
        width: props.motion.width,
        height: `${2 * props.scaleBy}rem`,
        cursor: 'move',
        x: props.motion.x,
        y: props.motion.y,
      }}
      transformTemplate={({ x: xT, y: yT }) => `translateX(${xT}) translateY(${yT})`}
      onDrag={(e, info) => {
        props.set.x(props.position.x + info.offset.x / props.zoomState().scale);
        props.set.y(props.position.y + info.offset.y / props.zoomState().scale);
      }}
      onDragEnd={(e, info) => {
        props.onDragEnd(info.offset);
      }}
      onHoverStart={props.onHoverStart}
      onHoverEnd={props.onHoverEnd}
      // change the cursor during dragging
      whileTap={{
        cursor: 'grabbing',
      }}
    >
      <Box w="full" d="flex" p={0.5} roundedTop="xl" bg={props.titleBarColor} alignItems="center">
        {props.children}
      </Box>
    </motion.div >
  );
}
