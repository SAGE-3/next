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
  Text,
  RadioGroup,
  Stack,
  Radio,
  FormLabel,
  FormControl,
} from '@chakra-ui/react';
import { MdPerson } from 'react-icons/md';
import { UserSchema } from '@sage3/shared/types';
import { useAuth } from '@sage3/frontend';
import { useUser } from '../../../hooks';
import { randomSAGEColor, SAGEColors } from '@sage3/shared';
import { ColorPicker } from '../general';

interface EditUserModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function EditUserModal(props: EditUserModalProps): JSX.Element {
  const { user, update } = useUser();
  const { auth } = useAuth();
  const isGuest = auth?.provider === 'guest';

  const [name, setName] = useState<UserSchema['name']>(user?.data.name || '');
  const [color, setColor] = useState(user?.data.color as SAGEColors);
  const [type, setType] = useState<UserSchema['userType']>(user?.data.userType || 'client');

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
  const handleColorChange = (color: string) => setColor(color as SAGEColors);
  const handleTypeChange = (type: UserSchema['userType']) => setType(type);

  // const modalBackground = useColorModeValue('white', 'gray.700');

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
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl">Edit User Account</ModalHeader>
        <ModalBody>
          <FormControl mt="2">
            <FormLabel htmlFor="color">Name</FormLabel>

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
          </FormControl>

          <FormControl mt="2">
            <FormLabel htmlFor="color">Color</FormLabel>
            <ColorPicker selectedColor={user ? (user?.data.color as SAGEColors) : 'red'} onChange={handleColorChange}></ColorPicker>
          </FormControl>
          <FormControl mt="2">
            <FormLabel htmlFor="type">Type</FormLabel>
            <RadioGroup onChange={handleTypeChange} value={type}>
              <Stack direction="row">
                {['client', 'wall'].map((value, i) => (
                  <Radio value={value} key={i}>
                    {value[0].toUpperCase() + value.substring(1)}
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>{' '}
          </FormControl>

          <Text mt={5} fontSize={'md'}>
            Authentication:{' '}
            <em>
              {auth?.provider} {!isGuest && <>- {auth?.email}</>}
            </em>
          </Text>
          {isGuest && (
            <Text mt={1} fontSize={'md'}>
              Limited functionality as Guest
            </Text>
          )}
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="green" onClick={() => updateAccount()} disabled={!name}>
            Update
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
