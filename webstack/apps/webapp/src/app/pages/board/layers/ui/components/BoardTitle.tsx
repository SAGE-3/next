/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import {
  Box,
  Button,
  Icon,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { MdArrowBack, MdCloudQueue } from 'react-icons/md';

import { StuckTypes, useHexColor, useRouteNav, useUser } from '@sage3/frontend';
import { Board, OpenConfiguration, Room } from '@sage3/shared/types';
import { IconButtonPanel } from './Panels/Panel';

type BoardTitleProps = {
  config: OpenConfiguration;
  room?: Room;
  board?: Board;
};

// The title of the board which includes the servername, room name, and board name
export function BoardTitle(props: BoardTitleProps) {
  const title = `${props.config?.serverName} / ${
    (props.room?.data.name ? props.room.data.name : '') + ' / ' + (props.board?.data.name ? props.board.data.name : '')
  }`;

  const textColor = useColorModeValue('gray.800', 'gray.50');

  const { user } = useUser();
  const usersColor = user ? user.data.color : 'teal';
  const backButtonColorMode = useColorModeValue(`${usersColor}.500`, `${usersColor}.300`);
  const backButtonColor = useHexColor(user ? backButtonColorMode : textColor);

  // Redirect the user back to the homepage when clicking the arrow button
  const { toHome, back } = useRouteNav();
  function handleHomeClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    if (event.shiftKey) {
      // Just go back to the previous room
      back();
    } else {
      if (props.room) {
        // Back to the homepage with the room id
        toHome(props.room._id);
      } else {
        back();
      }
    }
  }

  return (
    <Box
      borderRadius="md"
      // backgroundColor={backgroundColor}
      whiteSpace={'nowrap'}
      width="100%"
      display="flex"
      justifyContent="left"
      alignItems={'center'}
      ml="1"
    >
      <IconButton
        icon={<MdArrowBack />}
        isActive={false}
        onClick={handleHomeClick}
        aria-label={''}
        size="xs"
        variant={'unstyled'}
        color={backButtonColor}
        fontSize="2xl"
        _hover={{ transform: 'scale(1.2)' }}
      />

      <Text fontSize={'lg'} color={textColor} userSelect="none" ml="1" whiteSpace="nowrap">
        {title}
      </Text>
    </Box>
  );
}
