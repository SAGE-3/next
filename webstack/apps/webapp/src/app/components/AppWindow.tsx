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
  const deleteApp = useAppStore(state => state.delete);

  function eventControl(event: any, info: any) {
    update(props.app.id, { position: { x: info.x, y: info.y, z: 0 } });
  }
  function handleClose() {
    deleteApp(props.app.id);
  }
  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: props.app.position.x, y: props.app.position.y }}
      onStop={eventControl}>
      <div ref={nodeRef} style={{
        width: props.app.size.width,
        height: props.app.size.height,
        backgroundColor: 'gray',
        border: '2px solid red',
        position: 'absolute'
      }}>
        <button onClick={handleClose}>X</button>
        {props.children}
      </div>
    </Draggable>
  )

}