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
import { useRef } from "react";
import Draggable, { DraggableEventHandler } from 'react-draggable';

type WindowProps = {
  app: AppSchema;
  children: JSX.Element;
}

export function AppWindow(props: WindowProps) {
  const nodeRef = useRef(null);
  const update = useAppStore(state => state.update);

  function eventControl(event: any, info: any) {
    console.log('Event name: ', event.type);
    console.log(event, info);
    update(props.app.id, { position: { x: info.x, y: info.y, z: 0 } });
  }

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: props.app.position.x, y: props.app.position.y }}
      onStop={eventControl}>
      <div ref={nodeRef} style={{ width: "100px", backgroundColor: "red" }}>
        <Box border={`solid 2px red}`} style={{
          width: props.app.size.width,
          height: props.app.size.height,
          left: props.app.position.x,
          top: props.app.position.y,
          backgroundColor: 'gray'
        }} >
          Drag here
          {props.children}
        </Box>
      </div>
    </Draggable>
  )

}