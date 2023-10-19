/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { IconButton, Box, Text, useColorModeValue } from '@chakra-ui/react';
import { MdEdit } from 'react-icons/md';
import { Room } from '@sage3/shared/types';
import { useHexColor, useUsersStore } from '@sage3/frontend';

type RoomCardProps = {
  room: Room | undefined;
};

export function RoomCard(props: RoomCardProps) {
  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  const borderColor = useHexColor(props.room ? props.room.data.color : 'gray');
  const title = props.room ? props.room.data.name : 'No Room Selected';

  const users = useUsersStore((state) => state.users);
  return (
    <Box
      display="flex"
      flexDirection="column"
      borderRadius="md"
      height="200px"
      border={`solid ${borderColor} 2px`}
      background={linearBGColor}
      padding="8px"
    >
      <Box display="flex" justifyContent={'space-between'}>
        <Box px="2" mb="2" display="flex" justifyContent={'space-between'} width="100%">
          <Text fontSize="2xl">{title}</Text>
          <Box display="flex" justifyContent={'left'} gap="8px">
            <IconButton
              size="sm"
              colorScheme="teal"
              variant={'outline'}
              aria-label="create-room"
              fontSize="xl"
              icon={<MdEdit />}
            ></IconButton>
          </Box>
        </Box>
      </Box>
      <Box flex="1" display="flex" my="4" px="2" flexDir="column">
        <Box>
          {props.room && (
            <>
              <Text fontSize="sm">{props.room.data.description}</Text>
              <Text fontSize="sm">Owner: {users.find((u) => u._id === props.room?.data.ownerId)?.data.name}</Text>
              <Text fontSize="sm">Created: Jan 5th, 2023</Text>
              <Text fontSize="sm">Updated: Oct 5th, 2023</Text>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
