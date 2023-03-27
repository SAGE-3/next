/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useRef, useEffect } from 'react';
import {
  useToast,
  Button,
  Input,
  InputGroup,
  InputLeftAddon,
  Modal,
  ModalFooter,
  ModalContent,
  ModalHeader,
  ModalBody,
} from '@chakra-ui/react';
import { v5 as uuidv5 } from 'uuid';

import { useData } from 'libs/frontend/src/lib/hooks';
import { OpenConfiguration } from '@sage3/shared/types';

export interface EnterRoomProps {
  isOpen: boolean;
  onClose: () => void;
  onEnter: () => void;
  roomId: string;
  name: string;
  isPrivate: boolean;
  privatePin: string;
}

export const EnterRoomModal = (props: EnterRoomProps) => {
  // Fetch configuration from the server
  const config = useData('api/configuration') as OpenConfiguration;

  const [privateText, setPrivateText] = useState('');
  const toast = useToast();
  const initialRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // if the room is not protected, go ahead and enter the room
    if (props.isOpen && !props.isPrivate) {
      props.onClose();
      props.onEnter();
    }
  }, [props]);

  // Checks if the user entered pin matches the board pin
  const compareKey = () => {
    // Feature of UUID v5: private key to 'sign' a string
    // Hash the PIN: the namespace comes from the server configuration
    const key = uuidv5(privateText, config.namespace);
    // compare the hashed keys
    if (key === props.privatePin) {
      props.onClose();
      props.onEnter();
    } else {
      toast({
        title: `The password you have entered is incorrect`,
        status: 'error',
        duration: 4 * 1000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal
      isCentered
      initialFocusRef={initialRef}
      closeOnEsc={true}
      closeOnOverlayClick={true}
      size="md"
      isOpen={props.isOpen}
      onClose={props.onClose}
      blockScrollOnMount={false}
    >
      <ModalContent>
        <ModalHeader>Enter the Room Password</ModalHeader>
        <ModalBody>
          <InputGroup>
            <InputLeftAddon children="Password" />
            <Input
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') compareKey();
              }}
              ref={initialRef}
              width="full"
              value={privateText}
              type="password"
              onChange={(e) => setPrivateText(e.target.value)}
            />
          </InputGroup>
          <ModalFooter>
            <Button colorScheme="blue" mr={5} onClick={props.onClose}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={compareKey}>
              Enter
            </Button>
          </ModalFooter>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
