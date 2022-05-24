/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Import react and modules
import React from 'react';

// Import Chakra UI elements
import { Box, Flex, Text, Tooltip } from '@chakra-ui/react';

// Import SAGE libraries
import { Clock } from '../Clock/Clock';

import { localMenuColor } from '@sage3/frontend/ui';
import HideMenu from 'libs/frontend/components/src/lib/hide-menu/hide-menu';

/**
 * The main menubar on top of the workspace board
 *
 * @export
 * @param  props
 * @returns {JSX.Element}
 */
function InfoMenuBarComponent(props: { boardName: string; serverName: string }): JSX.Element {
  return (
    <HideMenu buttonSize="xs" menuName="Info Menu" menuPosition="topLeft">
      <Box
        fontSize="large"
        background={localMenuColor()}
        zIndex="sticky"
        shadow="md"
        border="gray 2px solid"
        borderRadius="md"
        px={1}
        pr={'1.0rem'}
      >
        <Flex align="center" fontSize="2xl" fontFamily="quicksand, sans-serif">
          <Text>SAGE3</Text>
          <Text px={1}>|</Text>

          <Tooltip label="Name of the server" hasArrow={true}>
            <Text textOverflow="ellipsis" overflow="hidden" whiteSpace="nowrap" maxW="20vw">
              {props.serverName}
            </Text>
          </Tooltip>
          <Text px={1}>|</Text>
          <Tooltip label="Name of the board" hasArrow={true}>
            <Text textOverflow="ellipsis" overflow="hidden" whiteSpace="nowrap" maxW="20vw">
              {props.boardName}
            </Text>
          </Tooltip>
          <Text px={1}>|</Text>
          <Clock></Clock>
        </Flex>
      </Box>
    </HideMenu>
  );
}

export const InfoMenuBar = React.memo(InfoMenuBarComponent);
