/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useEffect } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, Button, Box } from '@chakra-ui/react';

import { Board, Room } from '@sage3/shared/types';
import { useUsersStore } from '@sage3/frontend';

interface BoardInformationProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  board: Board;
  room: Room;
}

export function BoardInformationModal(props: BoardInformationProps): JSX.Element {
  // Stores
  const users = useUsersStore((state) => state.users);

  const [name, setName] = useState<string>(props.board.data.name);
  const [code, setCode] = useState<string>(props.board.data.code);
  const [owner, setOwner] = useState<string>(users.find((u) => u._id === props.board._createdBy)?.data.name || '');
  const [creationDate, setCreationDate] = useState<string>(new Date(props.board._createdAt).toLocaleDateString());
  const [roomName, setRoomName] = useState<string>(props.room?.data.name);

  useEffect(() => {
    setName(props.board.data.name);
    setCode(props.board.data.code);
    setOwner(users.find((u) => u._id === props.board._createdBy)?.data.name || '');
    setCreationDate(new Date(props.board._createdAt).toLocaleDateString());
    setRoomName(props.room?.data.name);
  }, [props.board, props.room]);

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl">Board Information</ModalHeader>
        <ModalBody px={8} pb={8}>
          <Box display="flex" flexDir="row" justifyContent="space-evenly">
            <Box display="flex" flexDir="column" textAlign={'left'} width="55%">
              <Box fontWeight={'bold'}>Board Name</Box>
              <Box fontWeight={'bold'}>Room Name</Box>
              <Box fontWeight={'bold'}>Board ID</Box>
              <Box fontWeight={'bold'}>Created by</Box>
              <Box fontWeight={'bold'}>Created on</Box>
            </Box>
            <Box display="flex" flexDir="column" textAlign={'left'} width="70%">
              <Box whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                {name}
              </Box>
              <Box whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                {roomName}
              </Box>

              <Box whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                {code}
              </Box>
              <Box whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                {owner}
              </Box>
              <Box whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                {creationDate}
              </Box>
            </Box>
          </Box>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="green" size="sm" mr={3} onClick={props.onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
