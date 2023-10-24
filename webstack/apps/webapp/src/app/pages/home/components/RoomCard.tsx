/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { IconButton, Box, Text, useColorModeValue, useDisclosure } from '@chakra-ui/react';
import { MdEdit } from 'react-icons/md';
import { Room } from '@sage3/shared/types';
import { EditRoomModal, useHexColor, useUser, useUsersStore } from '@sage3/frontend';

type RoomCardProps = {
  room: Room | undefined;
};

export function RoomCard(props: RoomCardProps) {
  // Colors
  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );
  const borderColor = useHexColor(props.room ? props.room.data.color : 'gray');

  // Users
  const { user } = useUser();
  const users = useUsersStore((state) => state.users);
  const isOwner = props.room?.data.ownerId === user?._id;

  // UI Elements
  const title = props.room ? props.room.data.name : 'No Board Selected';
  const description = props.room ? props.room.data.description : 'No Description';
  const owner = props.room ? users.find((u) => u._id === props.room?._createdBy)?.data.name : 'No Owner';
  const createdDate = props.room ? new Date(props.room._createdAt).toDateString() : 'No Created Date';
  const updatedDate = props.room ? new Date(props.room._updatedAt).toDateString() : 'No Updated Date';

  // Disclousre for Edit Board
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <Box
      display="flex"
      flexDirection="column"
      borderRadius="md"
      height="180px"
      border={`solid ${borderColor} 2px`}
      background={linearBGColor}
      padding="8px"
      overflow="hidden"
    >
      {props.room && isOwner && <EditRoomModal isOpen={isOpen} onOpen={onOpen} room={props.room} onClose={onClose}></EditRoomModal>}

      <Box display="flex" justifyContent={'space-between'}>
        <Box px="2" mb="2" display="flex" justifyContent={'space-between'} width="100%">
          <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="2xl" fontWeight={'bold'}>
            {title}
          </Box>
          <Box display="flex" justifyContent={'left'} gap="8px">
            <IconButton
              size="sm"
              colorScheme="teal"
              variant={'outline'}
              aria-label="create-room"
              isDisabled={!isOwner}
              onClick={onOpen}
              fontSize="xl"
              icon={<MdEdit />}
            ></IconButton>
          </Box>
        </Box>
      </Box>
      <Box flex="1" display="flex" my="2" px="2" flexDir="column">
        <Box>
          {props.room && (
            <table>
              <tr>
                <td width="100px">
                  <Text fontSize="sm" fontWeight={'bold'}>
                    Description
                  </Text>
                </td>
                <td>
                  <Text fontSize="sm">{description}</Text>
                </td>
              </tr>
              <tr>
                <td>
                  <Text fontSize="sm" fontWeight={'bold'}>
                    Owner
                  </Text>
                </td>
                <td>
                  <Text fontSize="sm">{owner}</Text>
                </td>
              </tr>
              <tr>
                <td>
                  <Text fontSize="sm" fontWeight={'bold'}>
                    Created
                  </Text>
                </td>
                <td>
                  <Text fontSize="sm">{createdDate}</Text>
                </td>
              </tr>
              <tr>
                <td>
                  <Text fontSize="sm" fontWeight={'bold'}>
                    Updated
                  </Text>
                </td>
                <td>
                  <Text fontSize="sm">{updatedDate}</Text>
                </td>
              </tr>
            </table>
          )}
        </Box>
      </Box>
    </Box>
  );
}
