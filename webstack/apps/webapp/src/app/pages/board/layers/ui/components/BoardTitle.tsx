/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { Box, Text, useColorModeValue } from '@chakra-ui/react';

import { Board, OpenConfiguration, Room } from '@sage3/shared/types';

type BoardTitleProps = {
  config: OpenConfiguration;
  room?: Room;
  board?: Board;
};

/**
 * Component that displays the servername, room name, and board name along with a back button.
 * The back button allows the user to navigate back to the previous room or the homepage.
 *
 * @param {BoardTitleProps} props - The properties for the BoardTitle component.
 * @param {Object} props.config - Configuration object containing server details.
 * @param {Object} props.room - Room object containing room details.
 * @param {Object} props.board - Board object containing board details.
 *
 * @returns {JSX.Element} The rendered BoardTitle component.
 */
export function BoardTitle(props: BoardTitleProps) {
  const title = `${props.config?.serverName} / ${(props.room?.data.name ? props.room.data.name : '') + ' / ' + (props.board?.data.name ? props.board.data.name : '')
    }`;
  const textColor = useColorModeValue('gray.800', 'gray.50');
  const backgroundColor = useColorModeValue('#f2f2f299', '#32323299');

  return (
    <Box borderRadius="md" whiteSpace={'nowrap'} width="100%" display="flex" justifyContent="left"
      alignItems={'center'} ml="1" background={backgroundColor} px="1">
      <Text fontSize={'lg'} color={textColor} userSelect="none" ml="1" whiteSpace="nowrap">
        {title}
      </Text>
    </Box>
  );
}
