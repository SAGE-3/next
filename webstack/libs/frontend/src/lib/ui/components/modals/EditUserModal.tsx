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
  Text,
  RadioGroup,
  Stack,
  Radio,
  FormLabel,
  FormControl,
  useDisclosure,
} from '@chakra-ui/react';
import { MdPerson } from 'react-icons/md';
import { formatDistance } from 'date-fns';

import { UserSchema } from '@sage3/shared/types';
import { SAGEColors } from '@sage3/shared';
import { useAuth } from '@sage3/frontend';

import { useUser } from '../../../providers';
import { ColorPicker } from '../general';
import { AccountDeletion } from './AccountDeletion';

interface EditUserModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function EditUserModal(props: EditUserModalProps): JSX.Element {
  const { user, update } = useUser();
  // Get the user auth information
  const { auth, expire } = useAuth();
  const [isGuest, setIsGuest] = useState(true);

  // Are you a guest?
  useEffect(() => {
    if (auth) {
      setIsGuest(auth.provider === 'guest');
    }
  }, [auth]);

  const [name, setName] = useState<UserSchema['name']>(user?.data.name || '');
  const [color, setColor] = useState(user?.data.color as SAGEColors);
  const [type, setType] = useState<UserSchema['userType']>(user?.data.userType || 'client');

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
  const handleColorChange = (color: string) => setColor(color as SAGEColors);
  const handleTypeChange = (type: UserSchema['userType']) => setType(type);

  // Account Delete Disclosure
  const { isOpen, onOpen, onClose } = useDisclosure();

  // When the modal panel opens, select the text for quick replacing
  const initialRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.data.name) {
      setName(user.data.name);
    }
  }, [user?.data.name]);

  // Keyboard handler: press enter to activate command
  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      updateAccount();
    }
  };

  const updateAccount = () => {
    const newname = name.trim();
    if (newname !== user?.data.name && update) {
      update({ name: newname });
    }
    if (color !== user?.data.color && update) {
      update({ color });
    }
    if (type !== user?.data.userType && update) {
      update({ userType: type });
    }
    props.onClose();
  };

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false}>
      {user && <AccountDeletion user={user} isOpen={isOpen} onClose={onClose} />}
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl">Edit User Account</ModalHeader>
        <ModalBody>
          <FormControl mt="2">
            <FormLabel htmlFor="color">Name</FormLabel>

            <InputGroup>
              <InputLeftElement pointerEvents="none" children={<MdPerson size={'24px'} />} />
              <Input
                ref={initialRef}
                type="string"
                placeholder={'Enter a username'}
                _placeholder={{ opacity: 1, color: 'gray.600' }}
                mr={4}
                value={name}
                onChange={handleNameChange}
                onKeyDown={onSubmit}
                isRequired={true}
              />
            </InputGroup>
          </FormControl>

          <FormControl mt="2">
            <FormLabel htmlFor="color">Color</FormLabel>
            <ColorPicker selectedColor={user ? (user?.data.color as SAGEColors) : 'red'} onChange={handleColorChange}></ColorPicker>
          </FormControl>
          <FormControl mt="2">
            <FormLabel htmlFor="type">Type</FormLabel>
            <RadioGroup onChange={handleTypeChange} value={type} colorScheme="green">
              <Stack direction="row">
                {['client', 'wall'].map((value, i) => (
                  <Radio value={value} key={i}>
                    {' '}
                    {value[0].toUpperCase() + value.substring(1)}{' '}
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          </FormControl>

          <Text mt={5} fontSize={'md'}>
            Authentication:{' '}
            <em>
              {auth?.provider} {!isGuest && <>- {auth?.email}</>}
            </em>
          </Text>
          <Text fontSize={'md'}>
            Login expiration: <em>{formatDistance(new Date(expire), new Date(), { includeSeconds: true, addSuffix: true })}</em>
          </Text>
          {isGuest && (
            <Text mt={1} fontSize={'md'}>
              Limited functionality as Guest
            </Text>
          )}
        </ModalBody>
        <ModalFooter justifyContent={'space-between'}>
          <Button colorScheme="red" onClick={onOpen} isDisabled={!user}>
            Delete Account
          </Button>
          <Button colorScheme="green" onClick={() => updateAccount()} isDisabled={!name.trim()}>
            Update
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
