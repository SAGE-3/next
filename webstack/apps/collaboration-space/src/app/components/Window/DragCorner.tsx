/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useState } from 'react';
import { motion, MotionValue, useTransform } from 'framer-motion';

import { Box } from '@chakra-ui/react';

import { AppProps } from '@sage3/shared/types';
import { AppPositionMotion, AppPositionSetters, ConstraintSet } from './useAppPosition';
import { usePanZoom } from '@sage3/frontend/services';

function DragCornerComponent(props: {
  position: AppProps['position'];
  motion: AppPositionMotion;
  set: AppPositionSetters;
  constraints: ConstraintSet;
  scaleBy: number;
  corner: 'topright' | 'topleft' | 'bottomright' | 'bottomleft';
  onDragEnd(offset: { x: number; y: number }): void;
  onDragStart(): void;
}): JSX.Element {

  const [panzoomState] = usePanZoom();

  const scale = useTransform(
    panzoomState.motionScale,
    (zoom: number) => {
      return zoom
    }
  );
  const width = useTransform(
    panzoomState.motionScale,
    (zoom: number) => {
      return Math.max(20, 20 / zoom)
    }
  );

  const height = useTransform(
    panzoomState.motionScale,
    (zoom: number) => {
      return Math.max(20, 20 / zoom)
    }
  );

  const x = useTransform(
    [props.motion.x, props.motion.width, width] as MotionValue[],
    ([valueX, valueWidth, w]: number[]) => {
      switch (props.corner) {
        case 'topleft':
        case 'bottomleft':
          return valueX - w / 2;
        case 'topright':
        case 'bottomright':
          return valueX + valueWidth - w / 2;
      }
    }
  );
  const y = useTransform(
    [props.motion.y, props.motion.height, height] as MotionValue[],
    ([valueY, valueHeight, h]: number[]) => {
      const topDragTranslate = [10, 40, 70, 100];
      switch (props.corner) {
        case 'bottomright':
        case 'bottomleft':
          return valueY + valueHeight - h / 2;
        case 'topleft':
        case 'topright':
          return valueY - h / 2 - topDragTranslate[props.scaleBy];
      }
    }
  );

  const cursor = props.corner === 'bottomright' || props.corner === 'topleft' ? 'nwse-resize' : 'nesw-resize';

  const [gridMagnet, setGridMagnet] = useState(false);

  return (
    <motion.div
      drag={true}
      dragMomentum={false}
      style={{
        x, y,
        width, height,
        position: 'absolute',
      }}
      onMouseMove={(event) => {
        if (event.altKey) {
          setGridMagnet(true);
        } else {
          setGridMagnet(false);
        }
      }}
      onMouseDown={(event) => {
        if (event.altKey) {
          setGridMagnet(true);
        }
      }}
      onMouseUp={() => {
        setGridMagnet(false);
      }}
      onDragStart={() => props.onDragStart()}
      onDrag={(e, info) => {
        const s = scale.get();
        switch (props.corner) {
          case 'bottomright': {
            let newW = props.position.width + info.offset.x / s;
            let newH = props.position.height + info.offset.y / s;
            if (gridMagnet) {
              newW = Math.round(newW / 128) * 128;
              newH = Math.round(newH / 128) * 128;
            }
            props.set.width(newW);
            props.set.height(newH);
            break;
          }
          case 'bottomleft': {
            let newW = props.position.width - info.offset.x / s;
            let newH = props.position.height + info.offset.y / s;
            let newX = props.position.x + info.offset.x / s;
            if (gridMagnet) {
              newW = Math.round(newW / 128) * 128;
              newH = Math.round(newH / 128) * 128;
              newX = Math.round(newX / 128) * 128;
            }
            props.set.width(newW);
            props.set.height(newH);
            if (newW >= props.constraints.width[0])
              props.set.x(newX);
            break;
          }
          case 'topleft': {
            let newW = props.position.width - info.offset.x / s;
            let newH = props.position.height - info.offset.y / s;
            let newX = props.position.x + info.offset.x / s;
            let newY = props.position.y + info.offset.y / s;
            if (gridMagnet) {
              newW = Math.round(newW / 128) * 128;
              newH = Math.round(newH / 128) * 128;
              newX = Math.round(newX / 128) * 128;
              newY = Math.round(newY / 128) * 128;
            }
            props.set.width(newW);
            props.set.height(newH);
            if (newW >= props.constraints.width[0])
              props.set.x(newX);
            if (newH >= props.constraints.height[0])
              props.set.y(newY);
            break;
          }
          case 'topright': {
            let newW = props.position.width + info.offset.x / s;
            let newH = props.position.height - info.offset.y / s;
            let newY = props.position.y + info.offset.y / s;
            if (gridMagnet) {
              newW = Math.round(newW / 128) * 128;
              newH = Math.round(newH / 128) * 128;
              newY = Math.round(newY / 128) * 128;
            }
            props.set.width(newW);
            props.set.height(newH);
            if (newH >= props.constraints.height[0])
              props.set.y(newY);
            break;
          }
        }
      }}
      onDragEnd={(e, info) => {
        props.onDragEnd(info.offset);
        setGridMagnet(false);
      }}
    >
      <Box
        bg="gray.400"
        opacity={0.0}
        border="gray.600"
        background="red"
        borderWidth="2px"
        shadow="md"
        width="100%"
        height="100%"
        cursor={cursor}
        p="absolute"
        zIndex="sticky"
      />
    </motion.div>
  );
}

export const DragCorner = React.memo(DragCornerComponent);