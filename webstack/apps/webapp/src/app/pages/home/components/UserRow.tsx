/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue, IconButton, Box, Text, Tooltip, useDisclosure, useToast } from '@chakra-ui/react';
import { ConfirmModal, useHexColor, useRoomStore } from '@sage3/frontend';
import { User } from '@sage3/shared/types';
import { MdClose, MdPerson } from 'react-icons/md';

// User Row Props
interface UserRowProps {
  user: User;
  currUserIsOwner: boolean;
  roomId: string;
  online: boolean;
}

export function UserRow(props: UserRowProps) {
  const { removeUserRoomMembership } = useRoomStore();

  const isOnline = props.online;

  // Colors
  const borderColorValue = useColorModeValue(props.user.data.color, props.user.data.color);
  const online = useHexColor(borderColorValue);
  const offline = useHexColor('gray.700');

  const color = isOnline ? online : offline;
  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );
  // Delete Confirmation  Modal
  const { isOpen: delConfirmIsOpen, onOpen: delConfirmOnOpen, onClose: delConfirmOnClose } = useDisclosure();

  // Toast
  const toast = useToast();

  // Remove the user from the room
  const handleRemoveUser = async () => {
    const response = await removeUserRoomMembership(props.roomId, props.user._id);
    toast({
      title: response ? 'Member Removed' : 'Error',
      description: response ? 'The member has been removed from the room.' : 'Failed to remove the member from the room.',
      status: response ? 'success' : 'error',
      duration: 5000,
      isClosable: true,
    });
  };

  return (
    <>
      <ConfirmModal
        isOpen={delConfirmIsOpen}
        onClose={delConfirmOnClose}
        onConfirm={handleRemoveUser}
        title="Remove Member"
        message={`Are you sure you want to remove ${props.user.data.name} `}
        cancelText="Cancel"
        confirmText="Remove"
        confirmColor="red"
      ></ConfirmModal>
      <Box
        background={linearBGColor}
        p="1"
        px="2"
        width="100%"
        display="flex"
        justifyContent={'space-between'}
        alignItems={'center'}
        borderRadius="md"
        boxSizing="border-box"
        border={`solid 1px ${color}`}
        borderLeft={`solid 8px ${color}`}
        transition={'all 0.2s ease-in-out'}
      >
        <Box display="flex" alignItems={'left'}>
          <IconButton size="md" variant={'ghost'} aria-label="enter-board" fontSize="4xl" color={color} icon={<MdPerson />}></IconButton>
          <Box display="flex" flexDir="column" ml="2">
            <Text
              fontSize="sm"
              fontWeight="bold"
              textAlign="left"
              overflow={'hidden'}
              whiteSpace={'nowrap'}
              textOverflow={'ellipsis'}
              width="160px"
            >
              {props.user.data.name}
            </Text>
            <Text fontSize="xs" textAlign="left" overflow={'hidden'} whiteSpace={'nowrap'} textOverflow={'ellipsis'} width="160px">
              {props.user.data.email}
            </Text>
          </Box>
        </Box>
        {props.currUserIsOwner && (
          <Tooltip label="Remove Member" aria-label="Remove Member">
            <Box display="flex" alignItems={'right'}>
              <IconButton
                size="sm"
                variant={'ghost'}
                aria-label="enter-board"
                fontSize="xl"
                color={color}
                onClick={delConfirmOnOpen}
                icon={<MdClose />}
              />
            </Box>
          </Tooltip>
        )}
      </Box>
    </>
  );
}
