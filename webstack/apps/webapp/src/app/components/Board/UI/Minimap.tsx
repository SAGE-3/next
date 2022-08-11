/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box } from "@chakra-ui/react";
import { useAppStore } from "@sage3/frontend";

export function MiniMap() {

  const apps = useAppStore((state) => state.apps);

  return (
    <Box height={2500 / 25 + 'px'} width={5000 / 25 + 'px'} backgroundColor="#4a5568" borderRadius="md" border="solid teal 2px">
      <Box position="absolute">
      {apps.map(app => {
        return <Box key={app._id} backgroundColor="teal" position="absolute" left={app.data.position.x / 25 + 'px'} top={app.data.position.y / 25 + 'px'} width={app.data.size.width / 25 + 'px'} height={app.data.size.height / 25 + 'px'} transition={'all .2s'}></Box>
      })}
      </Box>
    </Box>
  );
}