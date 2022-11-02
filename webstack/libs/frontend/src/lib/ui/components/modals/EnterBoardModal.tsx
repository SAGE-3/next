/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
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
  Progress,
  ModalOverlay,
} from '@chakra-ui/react';
import { v5 as uuidv5 } from 'uuid';

import { useData, useRouteNav } from 'libs/frontend/src/lib/hooks';
import { serverConfiguration } from 'libs/frontend/src/lib/config';
import { timeout } from '../../../utils';
import { Board } from '@sage3/shared/types';

export interface EnterBoardProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
}

export const EnterBoardModal = (props: EnterBoardProps) => {
  const { toBoard } = useRouteNav();
  const [privateText, setPrivateText] = useState('');
  const toast = useToast();
  const initialRef = useRef<HTMLInputElement>(null);
  // Fetch configuration from the server
  const config = useData('/api/configuration') as serverConfiguration;

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function attemptToEnter() {
      if (props.isOpen && !props.board.data.isPrivate) {
        setLoading(true);
        await timeout(600);
        toBoard(props.board.data.roomId, props.board._id);
      }
    }
    attemptToEnter();
    // if the room is not protected, go ahead and enter the room
  }, [props.isOpen, props.board.data.isPrivate, props.board._id, props.board.data.roomId]);

  // Checks if the user entered pin matches the board pin
  const compareKey = async () => {
    // Feature of UUID v5: private key to 'sign' a string
    // Hash the PIN: the namespace comes from the server configuration
    const key = uuidv5(privateText, config.namespace);
    // compare the hashed keys
    if (key === props.board.data.privatePin) {
      setLoading(true);
      await timeout(600);
      toBoard(props.board.data.roomId, props.board._id);
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
      closeOnEsc={loading ? false : true}
      closeOnOverlayClick={loading ? false : true}
      size="md"
      isOpen={props.isOpen}
      onClose={props.onClose}
      blockScrollOnMount={false}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{loading ? 'Entering Board' : 'Enter the Board Password'}</ModalHeader>
        <ModalBody>
          {loading ? (
            <Progress size="md" colorScheme="teal" isIndeterminate mb="4" borderRadius="md" />
          ) : (
            <>
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
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
