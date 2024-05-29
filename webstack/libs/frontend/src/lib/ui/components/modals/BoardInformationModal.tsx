/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  Text,
  InputGroup,
  InputLeftElement,
  Input,
  Button,
  Box,
  Checkbox,
  useDisclosure,
} from '@chakra-ui/react';

import { v5 as uuidv5 } from 'uuid';
import { MdPerson, MdLock } from 'react-icons/md';

import { Board, BoardSchema } from '@sage3/shared/types';
import { useBoardStore, useAppStore, useConfigStore, ConfirmModal, useUsersStore } from '@sage3/frontend';
import { SAGEColors } from '@sage3/shared';
import { ColorPicker } from '../general';

interface BoardInformationProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  board: Board;
}

export function BoardInformationModal(props: BoardInformationProps): JSX.Element {
  // Stores
  const { users } = useUsersStore((state) => state);

  const [name, setName] = useState<string>(props.board.data.name);
  const [description, setDescription] = useState<string>(props.board.data.description);
  const [code, setCode] = useState<string>(props.board.data.code);
  const [owner, setOwner] = useState<string>(users.find((u) => u._id === props.board._createdBy)?.data.name || "");
  const [creationDate, setCreationDate] = useState<string>(new Date(props.board._createdAt).toLocaleDateString());

  useEffect(() => {
    setName(props.board.data.name);
    setDescription(props.board.data.description);
    setCode(props.board.data.code);
    setOwner(users.find((u) => u._id === props.board._createdBy)?.data.name || "");
    setCreationDate(new Date(props.board._createdAt).toLocaleDateString());
  }, [props.board]);

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl">Board Information</ModalHeader>
        <ModalBody>
          {/* fontWeight={'bold'} */}
          <Text fontSize="lg" mb="2">
            Name: {name}
          </Text>
          <Text fontSize="lg" mb="2">
            Description: {description}
          </Text>
          <Text fontSize="lg" mb="2">
            Board ID: {code}
          </Text>
          <Text fontSize="lg" mb="2">
            Created by {owner}
          </Text>
          <Text fontSize="lg" mb="2">
            Created on {creationDate}
          </Text>
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
