/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { Box, useColorModeValue } from '@chakra-ui/react';
import { useHexColor } from '@sage3/frontend';

type WindowBorderProps = {
  size: { width: number; height: number };
  selected: boolean;
  isGrouped: boolean;
  dragging: boolean;
  pinned: boolean;
  borderWidth: number;
  borderColor: string;
  selectColor: string;
  borderRadius: number;
  isSavedSelected: boolean;
};

/**
 * A WindowBorder is a box that is displayed around the window.
 * It is used to show the user which window is selected.
 */
export function WindowBorder(props: WindowBorderProps) {
  const size = props.size;
  const selected = props.selected;
  const isGrouped = props.isGrouped;
  const isSavedSelected = props.isSavedSelected;
  const pinned = props.pinned;
  const borderWidth = pinned ? 0 : props.borderWidth;
  const borderColor = props.borderColor;
  const selectColor = props.selectColor;
  const borderRadius = props.borderRadius;
  const dragging = props.dragging;
  const shadowColor = useColorModeValue('rgba(0 0 0 / 25%)', 'rgba(0 0 0 / 50%)');
  const savedSelectedColor = useHexColor('red');

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
      outline={isSavedSelected ? `${borderWidth}px solid ${savedSelectedColor}` : 'none'}
      boxShadow={pinned ? '' : `4px 4px 12px 0px ${shadowColor}`}
      pointerEvents={'none'}
    ></Box>
  );
}
