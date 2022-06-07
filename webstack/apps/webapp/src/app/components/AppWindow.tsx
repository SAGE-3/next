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

type WindowProps = {
  app: AppSchema;
  children: JSX.Element;
}

export function AppWindow(props: WindowProps) {

  const update = useAppStore(state => state.update);

  function handleDrag() {
    console.log('update pos')
    update(props.app.id, { position: { ...props.app.position, x: props.app.position.x + 1 } });
  }

  return (
    <Box border={`solid 2px red}`} onClick={handleDrag}>
      {props.children}
    </Box>
  )

}