/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useCallback, useState } from 'react';
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
  useToast,
  Button,
} from '@chakra-ui/react';
import { MdPerson } from 'react-icons/md';
import { RoomSchema } from '@sage3/shared/types';
import { useRoomStore, useUserStore } from '../../../stores';
import { randomSAGEColor } from '@sage3/shared';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomModal(props: CreateRoomModalProps): JSX.Element {
  const toast = useToast();

  const createRoom = useRoomStore(state => state.create);
  const user = useUserStore(state => state.user);

  const [name, setName] = useState<RoomSchema['name']>('');
  const [description, setDescription] = useState<RoomSchema['description']>('');

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)
  const handleDescription = (event: React.ChangeEvent<HTMLInputElement>) => setDescription(event.target.value)

  // the input element
  // When the modal panel opens, select the text for quick replacing
  const initialRef = React.useRef<HTMLInputElement>(null);
  const setRef = useCallback((_node: HTMLInputElement) => {
    if (initialRef.current) {
      initialRef.current.select();
    }
  }, [])

  // Keyboard handler: press enter to activate command
  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      create();
    }
  };

  const create = () => {
    if (name && description && user) {
      // remove leading and trailing space, and limit name length to 20
      const cleanedName = name.trim().substring(0, 19);

      if (cleanedName.split(' ').join('').length === 0) {
        toast({
          title: 'Name must have at least one character',
          status: 'error',
          duration: 2 * 1000,
          isClosable: true,
        });
      } else {
        console.log('new room')
        createRoom({
          name: cleanedName,
          description,
          color: randomSAGEColor().name,
          ownerId: user._id,
          isPrivate: false
        });
        props.onClose();
      }
    }
  };

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create Room</ModalHeader>
        <ModalBody>
          <InputGroup mt={4}>
            <InputLeftElement pointerEvents="none" children={<MdPerson size={'1.5rem'} />} />
            <Input
              ref={initialRef}
              type="text"
              placeholder={'Name'}
              mr={4}
              value={name}
              onChange={handleNameChange}
              onKeyDown={onSubmit}
              isRequired={true}
            />
          </InputGroup>
          <InputGroup mt={4}>
            <InputLeftElement pointerEvents="none" children={<MdPerson size={'1.5rem'} />} />
            <Input
              type="text"
              placeholder={'Description'}
              mr={4}
              value={description}
              onChange={handleDescription}
              onKeyDown={onSubmit}
              isRequired={true}
            />
          </InputGroup>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="green" onClick={() => create()} disabled={!name || !description || !user}>
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
