/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue, IconButton, Box, Text } from '@chakra-ui/react';
import { useHexColor } from '@sage3/frontend';
import { useUser } from '@sage3/frontend';
import { MdLock, MdLockOpen, MdStar, MdStarOutline } from 'react-icons/md';
import { Room } from '@sage3/shared/types';

export function RoomRow(props: { room: Room; selected: boolean; onClick: (room: Room) => void; usersPresent: number }) {
  const { user, saveRoom, removeRoom } = useUser();
  const borderColorValue = useColorModeValue(props.room.data.color, props.room.data.color);
  const borderColor = useHexColor(borderColorValue);
  const borderColorGray = useColorModeValue('gray.300', 'gray.700');
  const borderColorG = useHexColor(borderColorGray);

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  const created = new Date(props.room._createdAt).toLocaleDateString();

  const savedRooms = user?.data.savedRooms || [];
  const isFavorite = user && savedRooms.includes(props.room._id);
  const isPrivate = props.room.data.isPrivate;

  const handleFavorite = (event: any) => {
    event.preventDefault();
    event.stopPropagation();
    const roomId = props.room._id;
    if (user && removeRoom && saveRoom) {
      savedRooms.includes(roomId) ? removeRoom(roomId) : saveRoom(roomId);
    }
  };
  return (
    <Box
      background={linearBGColor}
      p="1"
      px="2"
      display="flex"
      justifyContent={'space-between'}
      alignItems={'center'}
      onClick={() => props.onClick(props.room)}
      borderRadius="md"
      boxSizing="border-box"
      border={`solid 1px ${props.selected ? borderColor : 'transpanent'}`}
      borderLeft={props.selected ? `${borderColor} solid 8px` : ''}
      _hover={{ cursor: 'pointer', border: `solid 1px ${borderColor}`, borderLeft: props.selected ? `${borderColor} solid 8px` : '' }}
      transition={'all 0.2s ease-in-out'}
    >
      <Box display="flex" flexDir="column" width="270px">
        <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="lg" fontWeight={'bold'}>
          {props.room.data.name}
        </Box>
        <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="xs">
          {props.room.data.description}
        </Box>
      </Box>
      <Box display="flex" gap="4px">
        <IconButton
          size="sm"
          variant={'ghost'}
          aria-label="enter-board"
          fontSize="xl"
          colorScheme="teal"
          icon={<Text>{props.usersPresent}</Text>}
        ></IconButton>

        <IconButton
          size="sm"
          variant={'ghost'}
          colorScheme="teal"
          aria-label="enter-board"
          fontSize="xl"
          icon={isPrivate ? <MdLock /> : <MdLockOpen />}
        ></IconButton>
        <IconButton
          size="sm"
          variant={'ghost'}
          onClick={handleFavorite}
          colorScheme="teal"
          aria-label="enter-board"
          fontSize="xl"
          icon={isFavorite ? <MdStar /> : <MdStarOutline />}
        ></IconButton>
      </Box>
    </Box>
  );
}
