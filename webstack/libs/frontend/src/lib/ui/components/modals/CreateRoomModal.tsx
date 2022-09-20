/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState, useRef } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody,
  InputGroup, InputLeftElement, Input, useToast, Button, Checkbox
} from '@chakra-ui/react';

import { v5 as uuidv5 } from 'uuid';
import { MdPerson, MdLock } from 'react-icons/md';

import { useData } from 'libs/frontend/src/lib/hooks';
import { serverConfiguration } from 'libs/frontend/src/lib/config';

import { RoomSchema } from '@sage3/shared/types';
import { randomSAGEColor } from '@sage3/shared';
import { useRoomStore } from '../../../stores';
import { useUser } from '../../../hooks';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomModal(props: CreateRoomModalProps): JSX.Element {
  // Fetch configuration from the server
  const config = useData('/api/configuration') as serverConfiguration;

  const toast = useToast();

  const createRoom = useRoomStore(state => state.create);
  const { user } = useUser();

  const [name, setName] = useState<RoomSchema['name']>('');
  const [description, setDescription] = useState<RoomSchema['description']>('');
  const [isListed, setIsListed] = useState(true);
  const [isProtected, setProtected] = useState(false);
  const [password, setPassword] = useState('');

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)
  const handleDescription = (event: React.ChangeEvent<HTMLInputElement>) => setDescription(event.target.value)

  useEffect(() => {
    // Generate a PIN
    const makeid = (length: number): string => {
      let result = '';
      const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789'; // removed letter O
      const charactersLength = characters.length;
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      return result;
    };
    setPassword(makeid(6));
  }, []);

  // the input element
  // When the modal panel opens, select the text for quick replacing
  const initialRef = useRef<HTMLInputElement>(null);

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
        // hash the PIN: the namespace comes from the server configuration
        const key = uuidv5(password, config.namespace);
        createRoom({
          name: cleanedName,
          description,
          color: randomSAGEColor().name,
          ownerId: user._id,
          isPrivate: isProtected,
          privatePin: isProtected ? key : '',
          isListed: isListed,
        });
        props.onClose();
      }
    }
  };

  // To enable/disable
  const checkListed = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsListed(e.target.checked);
  };
  const checkProtected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProtected(e.target.checked);
  };
  const handlePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
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
              _placeholder={{ opacity: 1, color: 'gray.600' }}
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
              _placeholder={{ opacity: 1, color: 'gray.600' }}
              mr={4}
              value={description}
              onChange={handleDescription}
              onKeyDown={onSubmit}
              isRequired={true}
            />
          </InputGroup>

          <Checkbox mt={4} mr={4} onChange={checkListed} defaultChecked={isListed}>
            Room Listed Publicly
          </Checkbox>
          <Checkbox mt={4} mr={4} onChange={checkProtected} defaultChecked={isProtected}>
            Room Protected with a Password
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
              disabled={!isProtected}
            />
          </InputGroup>

        </ModalBody>
        <ModalFooter>
          <Button colorScheme="green" onClick={() => create()} disabled={!name || !description}>
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
