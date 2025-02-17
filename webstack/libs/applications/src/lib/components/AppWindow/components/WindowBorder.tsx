/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
// Arrow library
import { getArrow } from "perfect-arrows";
import { useCursorBoardPosition } from '@sage3/frontend';

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
  const scale = props.scale;
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
  const outlineWidth = Math.min(Math.max(Math.round(4 / scale), 3), 14);

  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dims, setDims] = useState({ width: 0, height: 0 });

  // Cursor Position
  const { boardCursor } = useCursorBoardPosition();

  // Dragging events

  const onDrop = (e: React.DragEvent) => {
    console.log('dropping');
    e.preventDefault();
    e.stopPropagation();
  };

  const onClick = (e: React.MouseEvent) => {
    // const x = boardCursor.x;
    // const y = boardCursor.y;
    const x = (size.width / 2) - 25;
    const y = size.height;

    setStartPoint({ x, y });
    console.log("Clicked", x, y);

    setIsDragging(true);
    e.preventDefault();
    e.stopPropagation();
  };

  const mouseclick = (e: MouseEvent) => {
    console.log('mouseup');
    setIsDragging(false);
    e.stopPropagation();
  };

  useEffect(() => {
    if (!isDragging) return;
    const x = boardCursor.x;
    const y = boardCursor.y;
    const w = x - startPoint.x;
    const h = y - startPoint.y;
    setDims({ width: w, height: h });
    console.log("Dragging", x, y, w, h);

    window.addEventListener('mouseup', mouseclick, { passive: true });
    return () => {
      window.removeEventListener('mouseup', mouseclick);
    };
  }, [boardCursor.x, boardCursor.y]);

  return (
    <>
      <Box
        position="absolute"
        left={`${-borderWidth}px`}
        top={`${-borderWidth}px`}
        width={size.width + borderWidth * 2}
        height={size.height + borderWidth * 2}
        borderRadius={borderRadius}
        opacity={0.8}
        zIndex={isGrouped || dragging ? 1000000 : -1} // Behind everything
        background={selected || highight ? selectColor : isGrouped ? 'none' : borderColor}
        pointerEvents={'none'}
        // outline used in multi-select
        outline={isGrouped ? `${outlineWidth}px dashed ${selectColor}` : 'none'}
      />

      {/* Bottom tab */}
      <Box
        position="absolute"
        left={`${(size.width / 2) - 25}px`}
        top={`${size.height}px`}
        width={"50px"}
        height={"40px"}
        borderBottomLeftRadius="lg"
        borderBottomRightRadius="lg"
        opacity={0.6} p={0} m={0}
        zIndex={isGrouped || dragging ? 1000001 : -1} // Behind everything
        background={selected || isGrouped ? 'none' : "red.400"}
        onMouseDown={onClick}
      />

      {/* Top tab */}
      <Box
        position="absolute"
        left={`${(size.width / 2) - 25}px`}
        top={"-40px"}
        width={"50px"}
        height={"40px"}
        borderTopLeftRadius="lg"
        borderTopRightRadius="lg"
        opacity={0.6} p={0} m={0}
        zIndex={isGrouped || dragging ? 1000001 : -1} // Behind everything
        background={selected || isGrouped ? 'none' : "blue.400"}
      />

      {isDragging &&
        <Box
          position="absolute"
          left={`${startPoint.x}px`}
          top={`${startPoint.y}px`}
          width={`${dims.width}px`}
          height={`${dims.height}px`}
          // left={0}
          // top={0}
          // width={"40px"}
          // height={"40px"}

          opacity={0.6} p={0} m={0}
          zIndex={1000002}
          background={"green.400"}
          onDrop={onDrop}
        />
      }
    </>
  );
}
