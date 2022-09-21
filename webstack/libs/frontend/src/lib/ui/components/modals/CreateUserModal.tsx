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
  Button,
  FormControl,
  FormLabel,
  Text,
  ButtonGroup,
} from '@chakra-ui/react';
import { MdPerson, MdEmail } from 'react-icons/md';
import { UserSchema } from '@sage3/shared/types';
import { randomSAGEColor, SAGEColors } from '@sage3/shared';
import { useAuth } from '@sage3/frontend';

type CreateUserProps = {
  createUser: (user: UserSchema) => void;
};

export function CreateUserModal(props: CreateUserProps): JSX.Element {
  // get the user information
  const auth = useAuth();

  const [name, setName] = useState<UserSchema['name']>(auth.auth?.displayName ?? '');
  const [email, setEmail] = useState<UserSchema['email']>(auth.auth?.email ?? '');
  const [color, setColor] = useState<UserSchema['color']>('red');

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value);
  const handleColorChange = (color: string) => setColor(color);

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
    if (name && email) {
      const newUser = {
        name,
        email,
        color: color,
        userRole: 'user',
        userType: 'client',
        profilePicture: '',
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
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create User Account</ModalHeader>
        <ModalBody>
          <FormControl isRequired mb={4}>
            <FormLabel htmlFor="htmlFor">Username</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none" children={<MdPerson size={'1.5rem'} />} />
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
          <FormControl isRequired>
            <FormLabel htmlFor="email">Email</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none" children={<MdEmail size={'1.5rem'} />} />
              <Input
                id="email"
                type="email"
                value={email}
                placeholder="name@email.com"
                _placeholder={{ opacity: 1, color: 'gray.600' }}
                onChange={handleEmailChange}
                onKeyDown={onSubmit}
              />
            </InputGroup>
          </FormControl>
          <FormControl isRequired mt="2">
            <FormLabel htmlFor="color">Color</FormLabel>
            <ButtonGroup isAttached size="xs" colorScheme="teal" py="2">
              {/* Colors */}
              {SAGEColors.map((s3color) => {
                return (
                  <Button
                    key={s3color.name}
                    value={s3color.name}
                    bgColor={s3color.value}
                    _hover={{ background: s3color.value, opacity: 0.7, transform: 'scaleY(1.3)' }}
                    _active={{ background: s3color.value, opacity: 0.9 }}
                    size="md"
                    onClick={() => handleColorChange(s3color.name)}
                    border={s3color.name === color ? '3px solid white' : 'none'}
                    width="43px"
                  />
                );
              })}
            </ButtonGroup>
          </FormControl>
          <Text mt={3} fontSize={'md'}>
            Authentication: <em>{auth.auth?.provider}</em>
          </Text>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="red" mx={2} onClick={auth.logout}>
            Cancel
          </Button>
          <Button colorScheme="green" onClick={() => createAccount()} disabled={!name || !email}>
            Create Account
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
