/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { MdCloudQueue } from 'react-icons/md';

import { useHexColor } from '@sage3/frontend';
import { Board, OpenConfiguration, Room } from '@sage3/shared/types';

type BoardTitleProps = {
  config: OpenConfiguration;
  room?: Room;
  board?: Board;
};

// The title of the board which includes the servername, room name, and board name
export function BoardTitle(props: BoardTitleProps) {
  const title = `${props.config?.serverName} / ${(props.room?.data.name ? props.room.data.name : '') + ' / ' + (props.board?.data.name ? props.board.data.name : '')
    }`;

  const textColor = useColorModeValue('gray.800', 'gray.50');
  const textColorHex = useHexColor(textColor);
  // const backgroundColor = useColorModeValue('#ffffff69', '#22222269');

  return (
    <Box
      borderRadius="md"
      // backgroundColor={backgroundColor}
      whiteSpace={'nowrap'}
      width="100%"
      display="flex"
      px={2}
      justifyContent="left"
      alignItems={'center'}
    >
      <MdCloudQueue fontSize={'22px'} color={textColorHex} />
      <Text fontSize={'lg'} color={textColor} ml="2" userSelect="none" whiteSpace="nowrap">
        {title}
      </Text>
    </Box>
  );
}
