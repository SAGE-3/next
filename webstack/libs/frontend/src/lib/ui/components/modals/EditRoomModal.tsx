/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useState } from 'react';
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

import { Room, RoomSchema } from '@sage3/shared/types';
import { useRoomStore, useBoardStore, useAppStore, useConfigStore, ConfirmModal } from '@sage3/frontend';
import { SAGEColors } from '@sage3/shared';
import { ColorPicker } from '../general';

interface EditRoomModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  room: Room;
}

export function EditRoomModal(props: EditRoomModalProps): JSX.Element {
  // Configuration information
  const config = useConfigStore((state) => state.config);

  const [name, setName] = useState<RoomSchema['name']>(props.room.data.name);
  const [description, setEmail] = useState<RoomSchema['description']>(props.room.data.description);
  const [color, setColor] = useState(props.room.data.color as SAGEColors);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value);
  const handleColorChange = (c: string) => setColor(c as SAGEColors);

  const deleteRoom = useRoomStore((state) => state.delete);
  const updateRoom = useRoomStore((state) => state.update);

  // Apps
  const fetchBoardApps = useAppStore((state) => state.fetchBoardApps);
  const deleteApp = useAppStore((state) => state.delete);

  // Boards
  const boards = useBoardStore((state) => state.boards);
  const deleteBoard = useBoardStore((state) => state.delete);

  const [isListed, setIsListed] = useState(props.room.data.isListed);
  const [isProtected, setProtected] = useState(props.room.data.isPrivate);
  const [password, setPassword] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [valid, setValid] = useState(true);

  // Delete Confirmation  Modal
  const { isOpen: delConfirmIsOpen, onOpen: delConfirmOnOpen, onClose: delConfirmOnClose } = useDisclosure();

  // Toast
  const toast = useToast();

  useEffect(() => {
    setName(props.room.data.name);
    setEmail(props.room.data.description);
    setColor(props.room.data.color as SAGEColors);
    setIsListed(props.room.data.isListed);
    setProtected(props.room.data.isPrivate);
    setPassword('');
  }, [props.room]);

  // the input element
  // When the modal panel opens, select the text for quick replacing
  const initialRef = React.useRef<HTMLInputElement>(null);

  // Keyboard handler: press enter to activate command
  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    updateRoom(props.room._id, { name, description, color, isListed });

    if (passwordChanged) {
      if (!isProtected) {
        updateRoom(props.room._id, { privatePin: '', isPrivate: false });
      } else {
        if (password === '') {
          updateRoom(props.room._id, { privatePin: '', isPrivate: false });
        } else {
          // hash the PIN: the namespace comes from the server configuration
          const key = uuidv5(password, config.namespace);
          updateRoom(props.room._id, { privatePin: key, isPrivate: true });
        }
      }
      toast({
        title: 'Room Updated',
        description: 'Room password has been updated',
        status: 'success',
        duration: 3000,
      });
      setPasswordChanged(false);
    }

    props.onClose();
  };

  /**
   * Delete the room and its boards and its apps
   */
  const handleDeleteRoom = () => {
    delConfirmOnClose();
    props.onClose();
    boards.forEach((b) => {
      // Skip if this board doesn't belong to the room
      if (b.data.roomId !== props.room._id) return;
      fetchBoardApps(b._id)
        .then((apps) => {
          // delete all apps in the board
          if (apps) apps.forEach((a) => deleteApp(a._id));
        })
        .finally(() => {
          deleteBoard(b._id);
        });
    });
    // delete the room
    deleteRoom(props.room._id);
  };

  // To enable/disable
  const checkListed = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsListed(e.target.checked);
  };

  // Toggle of protect room with password
  const checkProtected = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Set value of protected
    setProtected(e.target.checked);
    // Reset password
    setPassword('');
    setPasswordChanged(true);
    if (e.target.checked) {
      setValid(false);
    } else {
      setValid(true);
    }
  };
  const handlePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordChanged(true);
    if (e.target.value === '') setValid(false);
    else setValid(true);
  };

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl">Edit Room: {props.room.data.name}</ModalHeader>
        <ModalBody>
          <InputGroup mb={2}>
            <InputLeftElement pointerEvents="none" children={<MdPerson size={'24px'} />} />
            <Input
              ref={initialRef}
              type="text"
              placeholder={name}
              _placeholder={{ opacity: 1, color: 'gray.600' }}
              mr={4}
              value={name}
              onChange={handleNameChange}
              onKeyDown={onSubmit}
              isRequired={true}
            />
          </InputGroup>
          <InputGroup my={4}>
            <InputLeftElement pointerEvents="none" children={<MdPerson size={'24px'} />} />
            <Input
              type="text"
              placeholder={props.room.data.description}
              _placeholder={{ opacity: 1, color: 'gray.600' }}
              mr={4}
              value={description}
              onChange={handleDescriptionChange}
              onKeyDown={onSubmit}
              isRequired={true}
            />
          </InputGroup>

          <ColorPicker selectedColor={color} onChange={handleColorChange}></ColorPicker>

          <Checkbox mt={4} mr={4} onChange={checkListed} defaultChecked={isListed}>
            Room Listed Publicly
          </Checkbox>
          <Checkbox mt={4} mr={4} onChange={checkProtected} defaultChecked={isProtected}>
            Room Protected with a Password
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
            <Button colorScheme="green" onClick={handleSubmit} isDisabled={!name || !description || !valid}>
              Update
            </Button>
          </Box>
        </ModalFooter>
      </ModalContent>
      <ConfirmModal
        isOpen={delConfirmIsOpen}
        onClose={delConfirmOnClose}
        onConfirm={handleDeleteRoom}
        title="Delete Room"
        message="Are you sure you want to delete this room?"
        cancelText="Cancel"
        confirmText="Delete"
        confirmColor="red"
      ></ConfirmModal>
    </Modal>
  );
}
