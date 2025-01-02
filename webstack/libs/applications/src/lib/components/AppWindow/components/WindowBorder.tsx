/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { Box } from '@chakra-ui/react';
import { useUIStore } from '@sage3/frontend';

type WindowBorderProps = {
  size: { width: number; height: number };
  scale: number;
  selected: boolean;
  isGrouped: boolean;
  dragging: boolean;
  pinned: boolean;
  borderWidth: number;
  borderColor: string;
  selectColor: string;
  borderRadius: number;
  background: boolean;
  isHighlight: boolean;
};

/**
 * A WindowBorder is a box that is displayed around the window.
 * It is used to show the user which window is selected.
 */
export function WindowBorder(props: WindowBorderProps) {
  const size = props.size;
  const selected = props.selected;
  const isGrouped = props.isGrouped;
  const pinned = props.pinned;
  const borderWidth = pinned ? 0 : props.borderWidth;
  const borderColor = props.background ? props.borderColor : 'transparent';
  const selectColor = props.selectColor;
  const borderRadius = props.borderRadius;
  const dragging = props.dragging;
  const highight = props.isHighlight;

  // Calculate the outline width based on the scale, clamped between 4 and 16
  const outlineWidth = Math.min(Math.max(Math.round(4 / props.scale), 3), 14);

  return (
    <Box
      position="absolute"
      left={`${-borderWidth}px`}
      top={`${-borderWidth}px`}
      width={size.width + borderWidth * 2}
      height={size.height + borderWidth * 2}
      borderRadius={borderRadius}
      // opacity={isGrouped || dragging ? 0.6 : 1}
      opacity={0.8}
      zIndex={isGrouped || dragging ? 1000000 : -1} // Behind everything
      // background={selected || isGrouped || highight ? selectColor : borderColor}
      background={selected || highight ? selectColor : isGrouped ? 'none' : borderColor}
      pointerEvents={'none'}
      // outline used in multi-select
      outline={isGrouped ? `${outlineWidth}px dashed ${selectColor}` : 'none'}
    ></Box>
  );
}
