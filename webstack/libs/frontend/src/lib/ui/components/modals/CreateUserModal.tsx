/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
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
  Button,
  FormControl,
  FormLabel,
  Text,
  RadioGroup,
  Radio,
  Stack,
} from '@chakra-ui/react';
import { MdPerson } from 'react-icons/md';


import { UserSchema } from '@sage3/shared/types';
import { randomSAGEColor, SAGEColors } from '@sage3/shared';
import { useAuth } from '@sage3/frontend';

import { ColorPicker } from '../general';

type CreateUserProps = {
  createUser: (user: UserSchema) => void;
};

export function CreateUserModal(props: CreateUserProps): JSX.Element {
  // get the user information
  const { auth, logout } = useAuth();

  const [name, setName] = useState<UserSchema['name']>(auth?.displayName ?? '');
  const [type, setType] = useState<UserSchema['userType']>('client');
  const [color, setColor] = useState<UserSchema['color']>(randomSAGEColor());

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
  const handleColorChange = (color: string) => setColor(color as SAGEColors);
  const handleTypeChange = (type: UserSchema['userType']) => setType(type);

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
      createAccount();
    }
  };

  function createAccount() {
    if (name) {
      const newUser = {
        name: name.trim(),
        email: auth?.email ? auth.email : '',
        color: color,
        userRole: auth?.provider === 'guest' ? 'guest' : 'user',
        userType: type,
        profilePicture: '',
        savedRooms: [],
      } as UserSchema;
      props.createUser(newUser);
    }
  }

  return (
    <Modal
      isCentered
      isOpen={true}
      closeOnOverlayClick={false}
      onClose={() => {
        console.log('');
      }}
      blockScrollOnMount={false}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl">Create User Account</ModalHeader>
        <ModalBody>
          <FormControl isRequired mb={4}>
            <FormLabel htmlFor="htmlFor">Username</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none" children={<MdPerson size={'24px'} />} />
              <Input
                ref={initialRef}
                type="string"
                id="first-name"
                placeholder="First name"
                _placeholder={{ opacity: 1, color: 'gray.600' }}
                value={name}
                onChange={handleNameChange}
                onKeyDown={onSubmit}
              />
            </InputGroup>
          </FormControl>
          <FormControl isRequired mt="2">
            <FormLabel htmlFor="color">Color</FormLabel>
            <ColorPicker selectedColor={color as SAGEColors} onChange={handleColorChange}></ColorPicker>
          </FormControl>
          <FormControl mt="2">
            <FormLabel htmlFor="type">User Type</FormLabel>
            <RadioGroup onChange={handleTypeChange} value={type}>
              <Stack direction="row">
                {['client', 'wall'].map((value, i) => (
                  <Radio value={value} key={i}>
                    {value[0].toUpperCase() + value.substring(1)}
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          </FormControl>
          <Text mt={5} fontSize={'md'}>
            Authentication: <em> {auth?.provider} {auth?.provider !== 'guest' && <>- {auth?.email}</>}            </em>
          </Text>
          {auth?.provider === 'guest' && (
            <Text mt={1} fontSize={'md'}>
              Limited functionality as Guest
            </Text>
          )}
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="red" mx={2} onClick={logout}>
            Cancel
          </Button>
          <Button colorScheme="green" onClick={() => createAccount()} isDisabled={!name.trim()}>
            Create Account
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
