/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { Box } from '@chakra-ui/react';

type WindowBorderProps = {
  size: { width: number; height: number };
  selected: boolean;
  isGrouped: boolean;
  dragging: boolean;
  borderWidth: number;
  borderColor: string;
  selectColor: string;
  borderRadius: number;
};

/**
 * A WindowBorder is a box that is displayed around the window.
 * It is used to show the user which window is selected.
 */
export function WindowBorder(props: WindowBorderProps) {
  const size = props.size;
  const selected = props.selected;
  const isGrouped = props.isGrouped;
  const borderWidth = props.borderWidth;
  const borderColor = props.borderColor;
  const selectColor = props.selectColor;
  const borderRadius = props.borderRadius;
  const dragging = props.dragging;

  return (
    <Box
      position="absolute"
      left={`${-borderWidth}px`}
      top={`${-borderWidth}px`}
      width={size.width + borderWidth * 2}
      height={size.height + borderWidth * 2}
      borderRadius={borderRadius}
      opacity={isGrouped || dragging ? 0.6 : 1}
      zIndex={isGrouped || dragging ? 1000000 : -1} // Behind everything
      background={selected || isGrouped ? selectColor : borderColor}
      boxShadow={'4px 4px 12px 0px rgb(0 0 0 / 25%)'}
      pointerEvents={'none'}
    ></Box>
  );
}
