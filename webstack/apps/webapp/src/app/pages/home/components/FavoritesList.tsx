/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Box,
  Divider,
  Icon,
  useColorModeValue,
  Text,
  IconButton,
} from '@chakra-ui/react';
import { useBoardStore, useHexColor, useRoomStore, useUser, useUsersStore } from '@sage3/frontend';
import { Board, Room, User } from '@sage3/shared/types';
import { MdFolder, MdStarOutline, MdApps, MdPerson, MdStar } from 'react-icons/md';

// Props for the AboutModal
interface FavoritesProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomClick: (room: Room) => void;
  onBoardClick: (board: Board) => void;
  onUserClick: (user: User) => void;
}
export function FavoritesList(props: FavoritesProps) {
  // User
  const { user, saveBoard, removeBoard, saveRoom, removeRoom, saveUser, removeUser } = useUser();

  // Rooms, Board, Users
  const { rooms } = useRoomStore((state) => state);
  const { boards } = useBoardStore((state) => state);
  const { users } = useUsersStore((state) => state);

  // Saved Info
  const savedBoards = user && user.data.savedBoards ? user.data.savedBoards : [];
  const savedRooms = user && user.data.savedRooms ? user.data.savedRooms : [];
  const savedUsers = user && user.data.savedUsers ? user.data.savedUsers : [];

  // Filters
  const roomFilter = (room: Room): boolean => {
    return savedRooms.includes(room._id);
  };
  const boardFilter = (board: Board): boolean => {
    return savedBoards.includes(board._id);
  };
  const userFilter = (user: User): boolean => {
    return savedUsers.includes(user._id);
  };

  // Colors
  const hoverBackgroundColor = useColorModeValue('gray.100', 'gray.700');
  const hoverColor = useHexColor(hoverBackgroundColor);

  // Interaction
  const handleRoomClick = (room: Room) => {
    props.onRoomClick(room);
    props.onClose();
  };
  const handleBoardClick = (board: Board) => {
    props.onBoardClick(board);
    props.onClose();
  };
  const handleUserClick = (user: User) => {
    props.onUserClick(user);
    props.onClose();
  };

  // Favorites Events
  const handleBoardFavorite = (event: any, board: Board) => {
    event.preventDefault();
    event.stopPropagation();
    const boardId = board._id;
    if (user && removeBoard && saveBoard) {
      savedBoards.includes(boardId) ? removeBoard(boardId) : saveBoard(boardId);
    }
  };
  const handleRoomFavorite = (event: any, room: Room) => {
    event.preventDefault();
    event.stopPropagation();
    const roomId = room._id;
    if (user && removeRoom && saveRoom) {
      savedRooms.includes(roomId) ? removeRoom(roomId) : saveRoom(roomId);
    }
  };
  const handleUserFavorite = (event: any, user: User) => {
    event.preventDefault();
    event.stopPropagation();
    const userId = user._id;
    if (user && removeUser && saveUser) {
      savedUsers.includes(userId) ? removeUser(userId) : saveUser(userId);
    }
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} isCentered size="sm">
      <ModalOverlay />
      <ModalContent maxWidth={'800px'}>
        <ModalHeader fontSize="3xl">Your Favorites</ModalHeader>
        <ModalCloseButton />
        <ModalBody px={8} pb={8}>
          <Box width={'100%'} overflowY="scroll" overflowX={'hidden'} maxHeight="600px">
            <Text fontSize="xl">Rooms</Text>
            <Divider colorScheme="teal" />
            {rooms
              .filter(roomFilter)
              .sort((a, b) => a.data.name.localeCompare(b.data.name))
              .map((room) => {
                return (
                  <Box
                    width="100%"
                    my="1"
                    px="2"
                    py="1"
                    borderRadius="3px"
                    display="flex"
                    justifyContent={'space-between'}
                    cursor="pointer"
                    _hover={{ backgroundColor: hoverColor }}
                    onClick={() => handleRoomClick(room)}
                  >
                    <Box maxWidth="350px" whiteSpace={'nowrap'} textOverflow={'ellipsis'} overflow={'hidden'}>
                      <Icon fontSize="2xl" mr="2">
                        <MdFolder />
                      </Icon>
                      {room.data.name}
                    </Box>
                    <Box alignItems={'left'}> </Box>
                    <Box>
                      <IconButton
                        size="sm"
                        fontSize="xl"
                        mr="2"
                        icon={savedRooms.includes(room._id) ? <MdStar /> : <MdStarOutline />}
                        aria-label={'favorite-board'}
                        onClick={(event) => handleRoomFavorite(event, room)}
                      ></IconButton>
                    </Box>
                  </Box>
                );
              })}
            <Text fontSize="xl" marginTop="4">
              Boards
            </Text>
            <Divider />
            {boards
              .filter(boardFilter)
              .sort((a, b) => a.data.name.localeCompare(b.data.name))
              .map((board) => {
                return (
                  <Box
                    width="100%"
                    my="1"
                    px="2"
                    py="1"
                    borderRadius="3px"
                    display="flex"
                    justifyContent={'space-between'}
                    cursor="pointer"
                    _hover={{ backgroundColor: hoverColor }}
                    onClick={() => handleBoardClick(board)}
                  >
                    <Box maxWidth="350px" whiteSpace={'nowrap'} textOverflow={'ellipsis'} overflow={'hidden'}>
                      <Icon fontSize="2xl" mr="2">
                        <MdApps />
                      </Icon>
                      {board.data.name}
                    </Box>
                    <Box alignItems={'left'}> </Box>
                    <Box>
                      <IconButton
                        size="sm"
                        fontSize="xl"
                        mr="2"
                        icon={savedBoards.includes(board._id) ? <MdStar /> : <MdStarOutline />}
                        aria-label={'favorite-board'}
                        onClick={(event) => handleBoardFavorite(event, board)}
                      ></IconButton>
                    </Box>
                  </Box>
                );
              })}
            <Text fontSize="xl" marginTop="4">
              Users
            </Text>
            <Divider />
            {users
              .filter(userFilter)
              .sort((a, b) => a.data.name.localeCompare(b.data.name))
              .map((user) => {
                return (
                  <Box
                    width="100%"
                    my="1"
                    px="2"
                    py="1"
                    borderRadius="3px"
                    display="flex"
                    justifyContent={'space-between'}
                    cursor="pointer"
                    _hover={{ backgroundColor: hoverColor }}
                    onClick={() => handleUserClick(user)}
                  >
                    <Box maxWidth="350px" whiteSpace={'nowrap'} textOverflow={'ellipsis'} overflow={'hidden'}>
                      <Icon fontSize="2xl" mr="2">
                        <MdPerson />
                      </Icon>
                      {user.data.name}
                    </Box>
                    <Box alignItems={'left'}> </Box>
                    <Box>
                      <IconButton
                        size="sm"
                        fontSize="xl"
                        mr="2"
                        icon={savedUsers.includes(user._id) ? <MdStar /> : <MdStarOutline />}
                        aria-label={'favorite-board'}
                        onClick={(event) => handleUserFavorite(event, user)}
                      ></IconButton>
                    </Box>
                  </Box>
                );
              })}
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
