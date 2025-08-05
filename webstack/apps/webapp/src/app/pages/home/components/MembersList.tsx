/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState } from 'react';
import {
  useColorModeValue,
  IconButton,
  Box,
  Tooltip,
  useDisclosure,
  useToast,
  Input,
  InputGroup,
  InputLeftElement,
  VStack,
  Icon,
} from '@chakra-ui/react';

import { MdClose, MdPerson, MdPersonOff, MdSearch } from 'react-icons/md';

import { fuzzySearch } from '@sage3/shared';
import { Room, User } from '@sage3/shared/types';
import { ConfirmModal, useHexColor, usePresenceStore, useRoomStore, useUser, useUsersStore } from '@sage3/frontend';

// Compare filenames case independent
function sortMembers(a: User, b: User) {
  const namea = a.data.name.toLowerCase();
  const nameb = b.data.name.toLowerCase();
  if (namea < nameb) return -1;
  if (namea > nameb) return 1;
  return 0;
}

export function MembersList(props: { room: Room }) {
  const [showOnline, setShowOnline] = useState(false);

  const members = useRoomStore((state) => state.members);

  const users = useUsersStore((state) => state.users);
  const { user } = useUser();
  const isRoomOwner = user?._id == props.room._createdBy;
  const [membersSearch, setMembersSearch] = useState<string>('');
  const partialPrescences = usePresenceStore((state) => state.partialPrescences);
  // Style Scrollbar
  const scrollBarValue = useColorModeValue('gray.300', '#666666');
  const scrollBarColor = useHexColor(scrollBarValue);
  const searchPlaceholderColorValue = useColorModeValue('gray.400', 'gray.100');
  const searchPlaceholderColor = useHexColor(searchPlaceholderColorValue); const searchBarColorValue = useColorModeValue('gray.100', '#2c2c2c');
  const searchBarColor = useHexColor(searchBarColorValue);

  const membersFilter = (u: User): boolean => {
    if (showOnline) {
      const online = partialPrescences.find((p) => p._id === u._id);
      if (!online) return false;
    }
    const roomMembership = members.find((m) => m.data.roomId === props.room._id);
    const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(u._id) : false;
    return isMember;
  };

  const membersSearchFilter = (user: User) => {
    return fuzzySearch(user.data.name + ' ' + user.data.email, membersSearch);
  };

  return (
    <Box display="flex" gap="8">
      <Box width="500px">
        <Box display="flex" justifyContent="start" alignItems="center" width="100%" gap="2" mb="3" px="2">
          {/* Search Input */}
          <InputGroup size="md" width="100%" my="1">
            <InputLeftElement pointerEvents="none">
              <MdSearch />
            </InputLeftElement>
            <Input placeholder="Search Members" value={membersSearch} roundedTop="2xl"
              _focusVisible={{ bg: searchBarColor, outline: 'none', transition: 'none' }}
              bg="inherit"
              roundedBottom="2xl" onChange={(e) => setMembersSearch(e.target.value)} _placeholder={{ opacity: 0.7, color: searchPlaceholderColor }} />
          </InputGroup>
          {/* Filter Yours */}
          <Tooltip label="Filter Online" aria-label="filter online users" placement="top" hasArrow>
            <IconButton
              size="sm"
              bg="none"
              aria-label="filter-yours"
              fontSize="xl"
              icon={showOnline ? <MdPerson fontSize="24px" /> : <MdPersonOff fontSize="24px" />}
              _hover={{ transform: 'scale(1.1)', bg: 'none' }}
              onClick={() => setShowOnline(!showOnline)}
            ></IconButton>
          </Tooltip>
        </Box>

        <VStack
          height="calc(100svh - 275px)"
          width="100%"
          gap="2"
          overflowY="auto"
          overflowX="hidden"
          px="2"
          userSelect={'none'}
          css={{
            '&::-webkit-scrollbar': {
              background: 'transparent',
              width: '5px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: scrollBarColor,
              borderRadius: '48px',
            },
          }}
        >
          {users
            .filter(membersFilter)
            .filter(membersSearchFilter)
            .sort(sortMembers)
            .map((u) => {
              const online = partialPrescences.find((p) => p._id === u._id);
              return (
                <MembersListItem
                  key={u._id}
                  user={u}
                  currUserIsOwner={isRoomOwner}
                  roomId={props.room._id}
                  online={online ? true : false}
                />
              );
            })}
        </VStack>
      </Box>
      <Box flex="1"></Box>
    </Box>
  );
}

// User Row Props
interface UserRowProps {
  user: User;
  currUserIsOwner: boolean;
  roomId: string;
  online: boolean;
}
function MembersListItem(props: UserRowProps) {
  const { removeUserRoomMembership } = useRoomStore();

  const isOnline = props.online;
  const backgroundColorValue = useColorModeValue('#ffffff', `gray.800`);
  const backgroundColor = useHexColor(backgroundColorValue);
  // Colors
  const borderColorValue = useColorModeValue(props.user.data.color, props.user.data.color);
  const baseBorderColorValue = useColorModeValue('gray.200', 'gray.700');
  const baseBorderColor = useHexColor(baseBorderColorValue);
  const online = useHexColor(borderColorValue);
  const offline = useHexColor('gray.700');
  const subTextValue = useColorModeValue('gray.700', 'gray.300');
  const subText = useHexColor(subTextValue);
  const color = isOnline ? online : offline;

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
        background={backgroundColor}
        p="2"
        display="flex"
        justifyContent={'space-between'}
        alignItems={'center'}
        borderRadius="md"
        boxSizing="border-box"
        width="100%"
        height="46px"
        border={`solid 1px ${props.online ? color : baseBorderColor}`}
        transition={'all 0.2s ease-in-out'}
        cursor="pointer"
      >
        <Box display="flex" alignItems={'center'}>
          {/* Chakra Icon */}
          <Box display="flex" alignItems={'center'} ml={0} mr={2}>
            <Icon as={MdPerson} fontSize="2xl" color={color} />
          </Box>
          <Box display="flex" flexDir="column" maxWidth="325px">
            <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="sm" fontWeight={'bold'}>
              {props.user.data.name}
            </Box>
            <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="xs" color={subText}>
              {props.user.data.email}
            </Box>
          </Box>
        </Box>

        <Tooltip label={props.currUserIsOwner ? 'Remove Member' : 'Only the Room Owner can remove users.'} aria-label="Remove Member">
          <Box display="flex" alignItems={'right'}>
            <IconButton
              size="sm"
              variant={'ghost'}
              aria-label="enter-board"
              fontSize="xl"
              color={color}
              onClick={delConfirmOnOpen}
              icon={<MdClose />}
              isDisabled={!props.currUserIsOwner}
            />
          </Box>
        </Tooltip>
      </Box>
    </>
  );
}
