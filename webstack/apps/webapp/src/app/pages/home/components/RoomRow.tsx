/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue, IconButton, Box, Text } from '@chakra-ui/react';
import { useHexColor } from '@sage3/frontend';
import {} from 'framer-motion';
import { MdLock, MdStar } from 'react-icons/md';
import { Room } from '@sage3/shared/types';

export function RoomRow(props: { room: Room; selected: boolean; onClick: (room: Room) => void }) {
  const borderColorValue = useColorModeValue(props.room.data.color, props.room.data.color);
  const borderColor = useHexColor(borderColorValue);
  const borderColorGray = useColorModeValue('gray.300', 'gray.700');
  const borderColorG = useHexColor(borderColorGray);

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  const created = new Date(props.room._createdAt).toLocaleDateString();
  return (
    <Box
      // my="4"
      background={linearBGColor}
      p="1"
      pl="4"
      my="2"
      display="flex"
      justifyContent={'space-between'}
      alignItems={'center'}
      borderColor={props.selected ? borderColor : borderColor}
      onClick={() => props.onClick(props.room)}
      border={`solid 1px ${props.selected ? borderColor : 'none'}`}
      borderLeft={`${borderColor} solid 8px`}
      borderRadius="md"
      boxSizing="border-box"
      backgroundColor={props.selected ? borderColorG : 'transparent'}
      _hover={{ cursor: 'pointer', backgroundColor: borderColorG }}
    >
      <Box display="flex" flexDir="column">
        <Text fontSize="lg" fontWeight="bold" textAlign="left">
          {props.room.data.name}
        </Text>
        <Text fontSize="xs" textAlign="left">
          {props.room.data.description}
        </Text>
      </Box>
      <Box display="flex" gap="4px">
        <IconButton
          size="sm"
          variant={'ghost'}
          aria-label="enter-board"
          fontSize="xl"
          colorScheme="teal"
          icon={<Text>{(Math.random() * 25).toFixed()}</Text>}
        ></IconButton>

        <IconButton size="sm" variant={'ghost'} colorScheme="teal" aria-label="enter-board" fontSize="xl" icon={<MdLock />}></IconButton>
        <IconButton size="sm" variant={'ghost'} colorScheme="teal" aria-label="enter-board" fontSize="xl" icon={<MdStar />}></IconButton>
      </Box>
    </Box>
  );
}
