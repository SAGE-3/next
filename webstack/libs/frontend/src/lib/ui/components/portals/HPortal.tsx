/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, } from 'react'
import { Box, HStack, } from '@chakra-ui/react'

import { usePortal } from './portal';

import './portal.css'

type HPortalProps = {
  position: "left" | "right";
  width: number;
  isOpen: boolean;
  onClose: () => void;
  children?: JSX.Element;
};

export function HPortal(props: HPortalProps) {
  const minW = 300;
  const [drawerW, setDrawerW] = useState(props.width);

  const { Portal } = usePortal({ isOpen: props.isOpen, onClose: props.onClose });

  // handle mouse move event
  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = -e.movementX;
    handleEditorResize(deltaX);
  };

  const handleEditorResize = (deltaX: number) => {
    setDrawerW((prevW) => {
      let newW = prevW;
      if (props.position === "right") newW += deltaX;
      if (props.position === "left") newW -= deltaX;
      if (newW < minW) return minW;
      if (newW > window.innerWidth) return window.innerWidth;
      return newW;
    });
  };

  // handle mouse up event
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (props.isOpen && (
    <Portal>
      <HStack background={"white"} position={"absolute"} overflow={"clip"}
        zIndex={1000} h={"100vh"} w={drawerW} top={0}
        right={props.position === "right" ? 0 : undefined}
        left={props.position === "left" ? 0 : undefined}
      >
        {props.position === "right" &&
          <Box
            w={2} maxW={2} h={"100vh"}
            className="grab-bar-horizontal"
            backgroundColor={"gray.400"}
            onMouseDown={(e) => {
              e.preventDefault();
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />}
        <Box w={drawerW - 20}>
          {props.children}
        </Box>
        {props.position === "left" &&
          <Box flex={1}
            w={2} maxW={2} h={"100vh"}
            className="grab-bar-horizontal"
            backgroundColor={"gray.400"}
            onMouseDown={(e) => {
              e.preventDefault();
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />}
      </HStack>
    </Portal >
  ));
}
