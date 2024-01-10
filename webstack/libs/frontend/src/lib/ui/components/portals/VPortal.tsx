/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, } from 'react'
import { VStack, Button, Box } from '@chakra-ui/react'

import { usePortal } from './portal';

import './portal.css'

type VPortalProps = {
  position: "top" | "bottom";
  height: number;
  isOpen: boolean;
  onClose: () => void;
  children?: JSX.Element;
};

export function VPortal(props: VPortalProps) {
  const minH = 150;
  const [drawerH, setDrawerH] = useState(props.height);

  const { Portal } = usePortal({ isOpen: props.isOpen, onClose: props.onClose });

  // handle mouse move event
  const handleMouseMove = (e: MouseEvent) => {
    const deltaY = e.movementY;
    handleEditorResize(deltaY);
  };

  const handleEditorResize = (deltaX: number) => {
    setDrawerH((prev) => {
      let newH = prev;
      if (props.position === "top") newH += deltaX;
      if (props.position === "bottom") newH -= deltaX;
      if (newH < minH) return minH;
      if (newH > window.innerHeight) return window.innerHeight;
      return newH;
    });
  };

  // handle mouse up event
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (props.isOpen && (
    <Portal>
      <VStack background={"gray.200"} position={"fixed"} overflow={"clip"}
        zIndex={1000} w={"100vw"} h={drawerH} left={0}
        top={props.position === "top" ? 0 : undefined}
        bottom={props.position === "bottom" ? 0 : undefined}
      >
        {props.position === "bottom" &&
          <Box
            h={2} maxH={2} w={"100vw"}
            className="grab-bar-vertical"
            backgroundColor={"gray.400"}
            onMouseDown={(e) => {
              e.preventDefault();
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />}
        <Box height={"100vh"}>
          {props.children}
        </Box>
        {props.position === "top" &&
          <Box flex={1}
            h={2} maxH={2} w={"100vw"}
            className="grab-bar-vertical"
            backgroundColor={"gray.400"}
            onMouseDown={(e) => {
              e.preventDefault();
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />}
      </VStack>
    </Portal >
  ));
}
