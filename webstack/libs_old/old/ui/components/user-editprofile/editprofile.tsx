/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  InputGroup,
  InputLeftElement,
  Button,
  Input,
  Select,
  useToast,
  useColorMode,
} from '@chakra-ui/react';

import { MdPerson } from 'react-icons/md';
import { UserService, useUser } from '@sage3/frontend/services';

interface EditProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

const colors = [
  {
    name: 'Red',
    value: '#FC8181',
  },
  {
    name: 'Orange',
    value: '#F6AD55',
  },
  {
    name: 'Yellow',
    value: '#F6E05E',
  },
  {
    name: 'Green',
    value: '#68D391',
  },
  {
    name: 'Teal',
    value: '#4FD1C5',
  },
  {
    name: 'Blue',
    value: '#63b3ed',
  },
  {
    name: 'Cyan',
    value: '#76E4F7',
  },
  {
    name: 'Purple',
    value: '#B794F4',
  },
  {
    name: 'Pink',
    value: '#F687B3',
  },
];

const UserTypes = [
  {
    name: 'Client',
    value: 'client',
  },
  {
    name: 'Wall',
    value: 'wall',
  },
];

const SchemeTypes = [
  {
    name: 'Dark',
    value: 'dark',
  },
  {
    name: 'Light',
    value: 'light',
  },
];

export function EditProfileModal(props: EditProfileProps) {
  const toast = useToast();

  const { name, color, userType } = useUser();
  const { colorMode, toggleColorMode } = useColorMode();
  const initialRef = React.useRef<HTMLInputElement>(null);

  const [newColor, setNewColor] = useState(color);
  const handleSetNewColor = (event: React.ChangeEvent<HTMLSelectElement>) => setNewColor(event.target.value);

  const [newName, setNewName] = useState<string>(name);
  const handleSetNewName = (event: React.ChangeEvent<HTMLInputElement>) => setNewName(event.target.value);

  const [newUsertype, setNewUserType] = useState(userType != undefined ? userType.toString() : '');
  const handleSetNewUserType = (event: React.ChangeEvent<HTMLSelectElement>) => setNewUserType(event.target.value);

  // If new name was updated in user-name-modal
  useEffect(() => {
    if (newName !== name) {
      // remove leading and trailing space, and limit name length to 20
      const str = name.trim().substring(0, 19);
      setNewName(str);
    }
  }, [name]);

  // Keyboard handler: press enter to activate command
  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      updateUser();
    }
  };

  const updateUser = () => {
    if (newUsertype !== userType) {
      UserService.updateType(newUsertype).then((response) => {
        toast({
          title: 'Type Update',
          description: response.message,
          status: response.success ? 'success' : 'error',
          duration: 2 * 1000,
          isClosable: true,
        });
      });
    }
    if (newName !== name) {
      const str = newName.trim().substring(0, 19);
      if (str.split(' ').join('').length === 0) {
        toast({
          title: 'Username must have at least 1 character.',
          status: 'error',
          duration: 2 * 1000,
          isClosable: true,
        });
      } else {
        UserService.updateName(str).then((response) => {
          toast({
            title: 'Name Update',
            description: response.message,
            status: response.success ? 'success' : 'error',
            duration: 2 * 1000,
            isClosable: true,
          });
        });
      }
    }
    if (newColor !== color) {
      UserService.updateColor(newColor).then((response) => {
        toast({
          title: 'Color Update',
          description: response.message,
          status: response.success ? 'success' : 'error',
          duration: 2 * 1000,
          isClosable: true,
        });
      });
    }
  };

  // When the modal panel opens, select the text for quick replacing
  useEffect(() => {
    initialRef.current?.select();
  }, [initialRef.current]);

  return (
    <Modal initialFocusRef={initialRef} isOpen={props.isOpen} onClose={props.onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit Profile - {name} </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <InputGroup mt={4}>
            <InputLeftElement pointerEvents="none" children={<MdPerson size={'1.5rem'} />} />
            <Input
              onKeyDown={onSubmit}
              ref={initialRef}
              type="string"
              placeholder={name}
              value={newName}
              onChange={handleSetNewName}
              mr={4}
            />
          </InputGroup>
          <InputGroup mt={4}>
            <Select
              placeholder="User Color"
              value={newColor ? newColor : color}
              onChange={handleSetNewColor}
              color={newColor ? newColor : color}
              mr={4}
            >
              {colors.map((el) => {
                return (
                  <option key={el.value} value={el.value} style={{ color: el.value }}>
                    {el.name}
                  </option>
                );
              })}
            </Select>
          </InputGroup>
          <InputGroup mt={4}>
            <Select placeholder="User Type" value={newUsertype ? newUsertype : userType} onChange={handleSetNewUserType} mr={4}>
              {UserTypes.map((el) => {
                return (
                  <option key={el.value} value={el.value}>
                    {el.name}
                  </option>
                );
              })}
            </Select>
          </InputGroup>
          <InputGroup mt={4}>
            <Select placeholder="Color Scheme" value={colorMode === 'light' ? 'light' : 'dark'} onChange={toggleColorMode} mr={4}>
              {SchemeTypes.map((el) => {
                return (
                  <option key={el.value} value={el.value}>
                    {el.name}
                  </option>
                );
              })}
            </Select>
          </InputGroup>
        </ModalBody>

        <ModalFooter>
          <Button float="right" colorScheme="green" onClick={() => updateUser()}>
            Update
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
