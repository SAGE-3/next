/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useRef } from 'react';
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

import { RoomSchema } from '@sage3/shared/types';
import { randomSAGEColor, SAGEColors } from '@sage3/shared';

import { useRoomStore, useConfigStore } from '../../../stores';
import { useUser } from '../../../providers';
import { ColorPicker } from '../general';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomModal(props: CreateRoomModalProps): JSX.Element {
  // Configuration information
  const config = useConfigStore((state) => state.config);

  const toast = useToast();

  const { user } = useUser();
  const createRoom = useRoomStore((state) => state.create);
  const rooms = useRoomStore((state) => state.rooms);
  const joinRoomMembership = useRoomStore((state) => state.joinRoomMembership);

  const [name, setName] = useState<RoomSchema['name']>('');
  const [description, setDescription] = useState<RoomSchema['description']>('');
  const [isListed, setIsListed] = useState(true);
  const [isProtected, setProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [color, setColor] = useState('red' as SAGEColors);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
  const handleDescription = (event: React.ChangeEvent<HTMLInputElement>) => setDescription(event.target.value);
  const handleColorChange = (c: string) => setColor(c as SAGEColors);

  // Run on every open of the dialog
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
    // Reset the fields
    setName('');
    setDescription('');
    setColor(randomSAGEColor());
  }, [props.isOpen]);

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

  const create = async () => {
    if (name && description && user) {
      // remove leading and trailing space, and limit name length to 20
      const cleanedName = name.trim().substring(0, 19);
      const roomNames = rooms.map((room) => room.data.name);
      if (cleanedName.split(' ').join('').length === 0) {
        toast({
          title: 'Name must have at least one character',
          status: 'error',
          duration: 2 * 1000,
          isClosable: true,
        });
      } else if (roomNames.includes(cleanedName)) {
        toast({
          title: 'Room name already exists',
          status: 'error',
          duration: 2 * 1000,
          isClosable: true,
        });
      } else {
        // hash the PIN: the namespace comes from the server configuration
        const key = uuidv5(password, config.namespace);
        const room = await createRoom({
          name: cleanedName,
          description,
          color: color,
          ownerId: user._id,
          isPrivate: isProtected,
          privatePin: isProtected ? key : '',
          isListed: isListed,
        });
        if (room) {
          toast({
            title: 'Room created successfully',
            status: 'success',
            duration: 2 * 1000,
            isClosable: true,
          });
          // Join the room membership
          joinRoomMembership(room._id);
        }
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
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl">Create Room</ModalHeader>
        <ModalBody>
          <InputGroup>
            <InputLeftElement pointerEvents="none" children={<MdPerson size={'24px'} />} />
            <Input
              ref={initialRef}
              type="text"
              placeholder={'Room Name'}
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
              placeholder={'Room Description'}
              _placeholder={{ opacity: 1, color: 'gray.600' }}
              mr={4}
              value={description}
              onChange={handleDescription}
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
        <ModalFooter>
          <Button colorScheme="green" onClick={() => create()} isDisabled={!name || !description}>
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
