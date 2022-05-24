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
import { UserSchema } from '@sage3/shared/types';
import { useUserStore } from '../../../stores';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateUserModal(props: CreateUserModalProps): JSX.Element {
  const toast = useToast();

  const createUser = useUserStore(state => state.createUser);

  const [name, setName] = useState<UserSchema['name']>('');
  const [email, setEmail] = useState<UserSchema['email']>('');

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)
  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)

  // the input element
  // When the modal panel opens, select the text for quick replacing
  const initialRef = React.useRef<HTMLInputElement>(null);
  const setRef = useCallback(node => {
    if (initialRef.current) {
      initialRef.current.select();
    }
  }, [])



  // Keyboard handler: press enter to activate command
  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      createAccount();
    }
  };

  const createAccount = () => {
    if (name && email) {
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
        createUser(cleanedName, email);
        props.onClose();
      }
    }
  };



  return (
    <Modal isCentered isOpen={props.isOpen} closeOnEsc={false} closeOnOverlayClick={false} onClose={props.onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create User Account</ModalHeader>
        <ModalBody>
          <InputGroup mt={4}>
            <InputLeftElement pointerEvents="none" children={<MdPerson size={'1.5rem'} />} />
            <Input
              ref={initialRef}
              type="string"
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
              type="email"
              placeholder={'Email'}
              mr={4}
              value={email}
              onChange={handleEmailChange}
              onKeyDown={onSubmit}
              isRequired={true}
            />
          </InputGroup>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="green" onClick={() => createAccount()} disabled={!name || !email}>
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
