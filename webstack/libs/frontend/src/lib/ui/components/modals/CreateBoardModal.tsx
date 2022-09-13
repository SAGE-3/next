/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useCallback, useEffect, useState } from 'react';

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
  Checkbox,
} from '@chakra-ui/react';

import { v5 as uuidv5 } from 'uuid';
import { MdPerson, MdLock } from 'react-icons/md';

import { useData } from 'libs/frontend/src/lib/hooks';
import { serverConfiguration } from 'libs/frontend/src/lib/config';

import { RoomSchema } from '@sage3/shared/types';
import { randomSAGEColor } from '@sage3/shared';
import { useUser } from '@sage3/frontend';
import { useBoardStore } from '../../../stores';

interface CreateBoardModalProps {
  isOpen: boolean;
  roomId: string;
  onClose: () => void;
}

export function CreateBoardModal(props: CreateBoardModalProps): JSX.Element {
  // Fetch configuration from the server
  const config = useData('/api/configuration') as serverConfiguration;

  const toast = useToast();

  const createBoard = useBoardStore((state) => state.create);

  const { user } = useUser();

  const [name, setName] = useState<RoomSchema['name']>('');
  const [description, setDescription] = useState<RoomSchema['description']>('');
  const [isListed, setIsListed] = useState(true);
  const [isProtected, setProtected] = useState(false);
  const [password, setPassword] = useState('');

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
  const handleDescription = (event: React.ChangeEvent<HTMLInputElement>) => setDescription(event.target.value);

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
  const initialRef = React.useRef<HTMLInputElement>(null);

  const setRef = useCallback((_node: HTMLInputElement) => {
    if (initialRef.current) {
      initialRef.current.select();
    }
  }, []);

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
        // Create the board
        createBoard({
          name: cleanedName,
          description,
          roomId: props.roomId,
          ownerId: user._id,
          color: randomSAGEColor().name,
          isListed: isListed,
          isPrivate: isProtected,
          privatePin: isProtected ? key : '',
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
        <ModalHeader>Create Board</ModalHeader>
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
            Board Publicly Listed
          </Checkbox>
          <Checkbox mt={4} mr={4} onChange={checkProtected} defaultChecked={isProtected}>
            Board Protected with PIN
          </Checkbox>
          <InputGroup mt={4}>
            <InputLeftElement pointerEvents="none" children={<MdLock size={'1.5rem'} />} />
            <Input
              type="text"
              placeholder={'Set PIN'}
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
          <Button colorScheme="green" onClick={() => create()} disabled={!name || !description || (isProtected && !password)}>
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
