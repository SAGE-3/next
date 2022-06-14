/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box } from "@chakra-ui/react";
import { AppSchema } from "@sage3/applications/schema";
import { useAppStore } from "@sage3/frontend";

import { forwardRef, useEffect, useRef, useState } from "react";
import Draggable, { DraggableEventHandler } from 'react-draggable';

type WindowProps = {
  app: AppSchema;
  children: JSX.Element;
}

export function AppWindow(props: WindowProps) {
  const nodeRef = useRef(null);

  const update = useAppStore(state => state.update);
  const deleteApp = useAppStore(state => state.delete);

  const [pos, setpos] = useState({ x: props.app.position.x, y: props.app.position.y });

  useEffect(() => {
    setpos({ x: props.app.position.x, y: props.app.position.y });
  }, [props.app.position])

  function eventControl(event: any, info: any) {
    setpos({ x: info.x, y: info.y });
    update(props.app.id, { position: { x: info.x, y: info.y, z: 0 } });
  }
  function handleClose() {
    deleteApp(props.app.id);
  }


  return (
    <Draggable
      // nodeRef={nodeRef}
      defaultPosition={pos}
      position={pos}
      onStop={eventControl}>

      <Box
        ref={nodeRef}
        style={{
          width: props.app.size.width,
          height: props.app.size.height,
          backgroundColor: 'gray',
          border: '2px solid teal',
          position: 'absolute',
          overflow: 'hidden'
        }}>

        <Box
          display="flex"
          flexDirection="row"
          flexWrap="nowrap"
          justifyContent="space-between"
          backgroundColor="teal"
          px="1"
        >
          <p>{props.app.name}</p>
          <button onClick={handleClose}>X</button>
        </Box>

        {props.children}


      </Box>

    </Draggable >
  )

}