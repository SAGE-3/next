/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, calc, Text, useColorModeValue } from "@chakra-ui/react";
import { AppSchema } from "@sage3/applications/schema";
import { useAppStore } from "@sage3/frontend";

import { useEffect, useState } from "react";
import { DraggableData, Position, ResizableDelta, Rnd } from 'react-rnd'

import { MdOutlineClose } from 'react-icons/md'

type WindowProps = {
  app: AppSchema;
  children: JSX.Element;
}

export function AppWindow(props: WindowProps) {

  const update = useAppStore(state => state.update);
  const deleteApp = useAppStore(state => state.delete);

  const [pos, setPos] = useState({ x: props.app.position.x, y: props.app.position.y });
  const [size, setSize] = useState({ width: props.app.size.width, height: props.app.size.height });

  useEffect(() => {
    setSize({ width: props.app.size.width, height: props.app.size.height });
  }, [props.app.size])

  useEffect(() => {
    setPos({ x: props.app.position.x, y: props.app.position.y });
  }, [props.app.position])

  function handleDragStop(_e: any, data: DraggableData) {
    setPos({ x: data.x, y: data.y });
    update(props.app.id, {
      position: {
        x: data.x,
        y: data.y,
        z: props.app.position.z
      }
    });
  }

  function handleResizeStop(e: MouseEvent | TouchEvent, _direction: any, ref: any, _delta: ResizableDelta, position: Position) {
    // const width = Number(ref.style.width);
    // const height = Number(ref.style.height);
    const width = Number(ref.offsetWidth);
    const height = Number(ref.offsetHeight);
    setSize({ width, height });
    setPos({ x: position.x, y: position.y });
    update(props.app.id, {
      position: {
        x: position.x,
        y: position.y,
        z: props.app.position.z
      },
      size: {
        width,
        height,
        depth: props.app.size.depth
      }
    });
  }

  function handleClose() {
    deleteApp(props.app.id);
  }


  return (
    <Rnd
      disableDragging={false}
      bounds="parent"
      dragHandleClassName={'handle'}
      style={{
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        backgroundColor: 'gray',
        overflow: 'hidden'
      }}
      size={{ width: size.width, height: size.height }}
      position={pos}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop} >

      {/* Title Bar */}
      < Box
        className="handle"
        display="flex"
        flexDirection="row"
        flexWrap="nowrap"
        justifyContent="space-between"
        alignItems="center"
        backgroundColor="teal"
        px="1"
        height="1.5rem"
      >
        {/* App Name */}
        < Text color="white"> {props.app.name}</Text >
        {/* Close Button Name */}
        < MdOutlineClose
          cursor="pointer"
          color="white"
          fontSize="1.25rem"
          onClick={handleClose}
        />
      </Box >

      {props.children}

    </Rnd >
  )

}