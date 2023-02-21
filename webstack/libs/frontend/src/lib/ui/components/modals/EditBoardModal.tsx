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
} from '@chakra-ui/react';

import { v5 as uuidv5 } from 'uuid';
import { MdPerson, MdLock } from 'react-icons/md';

import { Board, BoardSchema, OpenConfiguration } from '@sage3/shared/types';
import { useBoardStore, useAppStore, ConfirmModal } from '@sage3/frontend';
import { SAGEColors } from '@sage3/shared';
import { useData } from 'libs/frontend/src/lib/hooks';
import { ColorPicker } from '../general';

interface EditBoardModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  board: Board;
}

export function EditBoardModal(props: EditBoardModalProps): JSX.Element {
  // Fetch configuration from the server
  const config = useData('/api/configuration') as OpenConfiguration;

  const [name, setName] = useState<BoardSchema['name']>(props.board.data.name);
  const [description, setEmail] = useState<BoardSchema['description']>(props.board.data.description);
  const [color, setColor] = useState<BoardSchema['color']>(props.board.data.color);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value);
  const handleColorChange = (color: string) => setColor(color);

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

  useEffect(() => {
    setName(props.board.data.name);
    setEmail(props.board.data.description);
    setColor(props.board.data.color);
    setProtected(props.board.data.isPrivate);
    setPassword('');
  }, [props.board]);

  // the input element
  // When the modal panel opens, select the text for quick replacing
  const initialRef = useRef<HTMLInputElement>(null);
  // useEffect(() => {
  //   initialRef.current?.select();
  // }, [initialRef.current]);

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
    if (name !== props.board.data.name) {
      updateBoard(props.board._id, { name });
    }
    if (description !== props.board.data.description) {
      updateBoard(props.board._id, { description });
    }
    if (color !== props.board.data.color) {
      updateBoard(props.board._id, { color });
    }
    if (isProtected !== props.board.data.isPrivate) {
      updateBoard(props.board._id, { isPrivate: isProtected });
    }
    if (isProtected && isPasswordChanged) {
      if (password) {
        // hash the PIN: the namespace comes from the server configuration
        const key = uuidv5(password, config.namespace);
        updateBoard(props.board._id, { privatePin: key });
      } else {
        setValid(false);
      }
    }
    props.onClose();
  };

  /**
   * Delete the board: delete all the apps and the board itself
   */
  const handleDeleteBoard = () => {
    delConfirmOnClose();
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
          <InputGroup mb={2}>
            <InputLeftElement pointerEvents="none" children={<MdPerson size={'1.5rem'} />} />
            <Input
              ref={initialRef}
              type="text"
              placeholder={props.board.data.name}
              _placeholder={{ opacity: 1, color: 'gray.600' }}
              mr={4}
              value={name}
              onChange={handleNameChange}
              onKeyDown={onSubmit}
              isRequired={true}
            />
          </InputGroup>
          <InputGroup my={4}>
            <InputLeftElement pointerEvents="none" children={<MdPerson size={'1.5rem'} />} />
            <Input
              type="text"
              placeholder={props.board.data.description}
              _placeholder={{ opacity: 1, color: 'gray.600' }}
              mr={4}
              value={description}
              onChange={handleDescriptionChange}
              onKeyDown={onSubmit}
              isRequired={true}
            />
          </InputGroup>

          <ColorPicker selectedColor={color as SAGEColors} onChange={handleColorChange}></ColorPicker>

          <Checkbox mt={4} mr={4} onChange={checkProtected} defaultChecked={isProtected}>
            Board Protected with a Password
          </Checkbox>
          <InputGroup mt={4}>
            <InputLeftElement pointerEvents="none" children={<MdLock size={'1.5rem'} />} />
            <Input
              type="text"
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
            <Button colorScheme="green" onClick={handleSubmit} isDisabled={!name || !description || !valid}>
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
