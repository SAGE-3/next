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
  Text,
  ButtonGroup,
  useColorMode,
  useColorModeValue,
} from '@chakra-ui/react';
import { MdPerson } from 'react-icons/md';
import { UserSchema } from '@sage3/shared/types';
import { useAuth } from '@sage3/frontend';
import { useUser } from '../../../hooks';
import { SAGEColors } from '@sage3/shared';

interface EditUserModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function EditUserModal(props: EditUserModalProps): JSX.Element {
  const { user, update } = useUser();
  const { auth } = useAuth();

  const [name, setName] = useState<UserSchema['name']>(user?.data.name || '');
  const [email, setEmail] = useState<UserSchema['email']>(user?.data.email || '');
  const [color, setColor] = useState<UserSchema['color']>('red');

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value);
  const handleColorChange = (color: string) => setColor(color);

  const modalBackground = useColorModeValue('white', 'gray.700');

  // the input element
  // When the modal panel opens, select the text for quick replacing
  const initialRef = React.useRef<HTMLInputElement>(null);
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
      updateAccount();
    }
  };

  const updateAccount = () => {
    if (name !== user?.data.name && update) {
      update({ name });
    }
    if (email !== user?.data.email && update) {
      update({ email });
    }
    if (color !== user?.data.color && update) {
      update({ color });
    }
    props.onClose();
  };

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl">Edit User Account</ModalHeader>
        <ModalBody>
          <InputGroup>
            <InputLeftElement pointerEvents="none" children={<MdPerson size={'1.5rem'} />} />
            <Input
              ref={initialRef}
              type="string"
              placeholder={user?.data.name}
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
              type="email"
              placeholder={user?.data.email}
              _placeholder={{ opacity: 1, color: 'gray.600' }}
              mr={4}
              value={email}
              onChange={handleEmailChange}
              onKeyDown={onSubmit}
              isRequired={true}
            />
          </InputGroup>
          <ButtonGroup isAttached size="xs" colorScheme="teal" mt="6">
            {/* Colors */}
            {SAGEColors.map((s3color) => {
              return (
                <Button
                  key={s3color}
                  value={s3color}
                  _hover={{ transform: 'scaleY(1.3)' }}
                  size="md"
                  onClick={() => handleColorChange(s3color)}
                  border={s3color === color ? '3px solid' : 'none'}
                  borderColor={s3color === color ? modalBackground : 'none'}
                  width="43px"
                  colorScheme={s3color}
                />
              );
            })}
          </ButtonGroup>
          <Text mt={3} fontSize={'md'}>
            Authentication: <em>{auth?.provider}</em>
          </Text>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="green" onClick={() => updateAccount()} disabled={!name || !email}>
            Update
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
