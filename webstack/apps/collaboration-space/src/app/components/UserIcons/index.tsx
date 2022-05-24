/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';

// Import Chakra UI elements
import { Box } from '@chakra-ui/react';
import { MenubarUsers } from '@sage3/frontend/components';
import { SAGE3State } from '@sage3/shared/types';

/**
 * Sage3 logo on bottom left of board
 *
 * @export
 * @returns {JSX.Element}
 */
export function UserIcons(props: {
  boardId: string;
  canvasSize: { width: number; height: number };
  apps: SAGE3State['apps'];
}): JSX.Element {
  return (
    // The list of avatars, user icons
    <Box position="relative">
      <MenubarUsers {...{ boardId: props.boardId, canvasSize: props.canvasSize, apps: props.apps }} />
    </Box>
  );
}
