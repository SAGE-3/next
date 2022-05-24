/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
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
  useToast,
  Button,
} from '@chakra-ui/react';
import { UserService, useUser } from '@sage3/frontend/services';
import { MdPerson } from 'react-icons/md';

interface UserNameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserNameModal(props: UserNameModalProps): JSX.Element {
  const toast = useToast();
  const { name } = useUser();
  const [newName, setNewName] = useState<string>('');
  const handleSetNewName = (event: React.ChangeEvent<HTMLInputElement>) => setNewName(event.target.value);
  // the input element
  const initialRef = React.useRef<HTMLInputElement>(null);

  // Keyboard handler: press enter to activate command
  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      updateName();
    }
  };

  const updateName = () => {
    if (newName) {
      // remove leading and trailing space, and limit name length to 20
      const str = newName.trim().substring(0, 19);

      if (str.split(' ').join('').length === 0) {
        toast({
          title: 'Name must have at least one character',
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
          props.onClose();
        });
      }
    }
  };

  // When the modal panel opens, select the text for quick replacing
  useEffect(() => {
    initialRef.current?.select();
  }, [initialRef.current]);

  return (
    <Modal isCentered isOpen={props.isOpen} closeOnEsc={false} closeOnOverlayClick={false} onClose={props.onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Change Name</ModalHeader>
        <ModalBody>
          <InputGroup mt={4}>
            <InputLeftElement pointerEvents="none" children={<MdPerson size={'1.5rem'} />} />
            <Input
              ref={initialRef}
              type="string"
              placeholder={'Lorem J. Ipsum'}
              mr={4}
              value={newName}
              onChange={handleSetNewName}
              onKeyDown={onSubmit}
              isRequired={true}
            />
            <Button colorScheme="green" onClick={() => updateName()} disabled={!newName}>
              Update
            </Button>
          </InputGroup>
        </ModalBody>
        <ModalFooter></ModalFooter>
      </ModalContent>
    </Modal>
  );
}
