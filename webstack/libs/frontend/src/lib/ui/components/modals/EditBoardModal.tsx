/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
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
  InputGroup,
  InputLeftElement,
  Input,
  Button,
  Box,
  Checkbox,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';

import { v5 as uuidv5 } from 'uuid';
import { MdPerson, MdLock } from 'react-icons/md';

import { Board, BoardSchema } from '@sage3/shared/types';
import { useBoardStore, useAppStore, useConfigStore, ConfirmModal } from '@sage3/frontend';
import { isAlphanumericWithSpacesAndForeign, SAGEColors } from '@sage3/shared';
import { ColorPicker } from '../general';

interface EditBoardModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  board: Board;
}

export function EditBoardModal(props: EditBoardModalProps): JSX.Element {
  // Configuration information
  const config = useConfigStore((state) => state.config);

  const [name, setName] = useState<BoardSchema['name']>(props.board.data.name);
  const [color, setColor] = useState<BoardSchema['color']>(props.board.data.color);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
  const handleColorChange = (color: string) => setColor(color);

  // Board Store
  const boards = useBoardStore((state) => state.boards);
  const deleteBoard = useBoardStore((state) => state.delete);
  const updateBoard = useBoardStore((state) => state.update);

  // Apps
  const fetchBoardApps = useAppStore((state) => state.fetchBoardApps);
  const deleteApp = useAppStore((state) => state.delete);

  const [isProtected, setProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [valid, setValid] = useState(true);
  const [isPasswordChanged, setPasswordChanged] = useState(false);

  // Delete Confirmation  Modal
  const { isOpen: delConfirmIsOpen, onOpen: delConfirmOnOpen, onClose: delConfirmOnClose } = useDisclosure();

  // Toast
  const toast = useToast();

  useEffect(() => {
    setName(props.board.data.name);
    setColor(props.board.data.color);
    setProtected(props.board.data.isPrivate);
    setPassword('');
  }, [props.board]);

  // When the modal panel opens, select the text for quick replacing
  const initialRef = useRef<HTMLInputElement>(null);

  const setRef = useCallback((_node: HTMLInputElement) => {
    if (initialRef.current) {
      initialRef.current.select();
    }
  }, []);

  // Keyboard handler: press enter to activate command
  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // Update button handler
  const handleSubmit = () => {
    let updated = false;
    if (name !== props.board.data.name) {
      const cleanedName = cleanNameCheckDoubles(name, props.board.data.roomId);
      if (cleanedName) {
        updateBoard(props.board._id, { name: cleanedName });
        updated = true;
      } else {
        return;
      }
    }
    if (color !== props.board.data.color) {
      updateBoard(props.board._id, { color });
      updated = true;
    }
    if (isProtected !== props.board.data.isPrivate) {
      updateBoard(props.board._id, { isPrivate: isProtected });
      updated = true;
    }
    if (isProtected && isPasswordChanged) {
      if (password) {
        // hash the PIN: the namespace comes from the server configuration
        const key = uuidv5(password, config.namespace);
        updateBoard(props.board._id, { privatePin: key });
        updated = true;
      } else {
        setValid(false);
      }
    }
    if (updated) {
      toast({
        title: 'Board updated',
        status: 'success',
        duration: 2 * 1000,
        isClosable: true,
      });
    }

    props.onClose();
  };

  function cleanNameCheckDoubles(name: string, roomId: string): string | null {
    // Remove leading and trailing space, and limit name length to 32
    const cleanedName = name.trim().substring(0, 31);
    // Get the names of all boards in the same room, excluding the current board
    const boardNames = boards.filter((r) => r.data.roomId === roomId && r._id !== props.board._id).map((board) => board.data.name);
    if (cleanedName.split(' ').join('').length === 0) {
      toast({
        title: 'Name must have at least one character',
        status: 'error',
        duration: 2 * 1000,
        isClosable: true,
      });
      return null;
    } else if (boardNames.includes(cleanedName)) {
      toast({
        title: 'Board name already exists',
        status: 'error',
        duration: 2 * 1000,
        isClosable: true,
      });
      return null;
    } else if (!isAlphanumericWithSpacesAndForeign(cleanedName)) {
      toast({
        title: 'Name must only contain Unicode letters, numbers, comma, hyphen, underscore and spaces',
        status: 'error',
        duration: 3 * 1000,
        isClosable: true,
      });
      return null;
    }
    return cleanedName;
  }

  /**
   * Delete the board: delete all the apps and the board itself
   */
  const handleDeleteBoard = () => {
    delConfirmOnClose();
    props.onClose();
    fetchBoardApps(props.board._id)
      .then((apps) => {
        // delete all apps in the board
        if (apps) apps.forEach((a) => deleteApp(a._id));
      })
      .finally(() => {
        deleteBoard(props.board._id);
      });
  };

  // To enable/disable
  const checkProtected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProtected(e.target.checked);
    setValid(!e.target.checked);
  };
  const handlePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordChanged(true);
    setValid(!!e.target.value);
    setPassword(e.target.value);
  };

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl">Edit Board: {props.board.data.name}</ModalHeader>
        <ModalBody>
          <InputGroup mb={4}>
            <InputLeftElement pointerEvents="none" children={<MdPerson size={'24px'} />} />
            <Input
              ref={initialRef}
              type="text"
              placeholder={props.board.data.name}
              _placeholder={{ opacity: 1, color: 'gray.600' }}
              mr={0}
              value={name}
              onChange={handleNameChange}
              onKeyDown={onSubmit}
              isRequired={true}
              maxLength={20}
            />
          </InputGroup>

          <ColorPicker selectedColor={color as SAGEColors} onChange={handleColorChange}></ColorPicker>

          <Checkbox mt={4} mr={4} onChange={checkProtected} defaultChecked={isProtected}>
            Board Protected with a Password
          </Checkbox>
          <InputGroup mt={4}>
            <InputLeftElement pointerEvents="none" children={<MdLock size={'24px'} />} />
            <Input
              type="text"
              autoCapitalize="off"
              placeholder={'Set Password'}
              _placeholder={{ opacity: 1, color: 'gray.600' }}
              mr={4}
              value={password}
              onChange={handlePassword}
              isRequired={isProtected}
              isDisabled={!isProtected}
            />
          </InputGroup>
        </ModalBody>
        <ModalFooter pl="4" pr="8" mb="2">
          <Box display="flex" justifyContent="space-between" width="100%">
            <Button colorScheme="red" onClick={delConfirmOnOpen} mx="2">
              Delete
            </Button>
            <Button colorScheme="green" onClick={handleSubmit} isDisabled={!name || !valid}>
              Update
            </Button>
          </Box>
        </ModalFooter>
      </ModalContent>
      <ConfirmModal
        isOpen={delConfirmIsOpen}
        onClose={delConfirmOnClose}
        onConfirm={handleDeleteBoard}
        title="Delete Board"
        message="Are you sure you want to delete this board?"
        cancelText="Cancel"
        confirmText="Delete"
        confirmColor="red"
      ></ConfirmModal>
    </Modal>
  );
}
