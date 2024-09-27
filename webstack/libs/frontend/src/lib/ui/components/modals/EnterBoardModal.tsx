/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
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

import { useRouteNav } from 'libs/frontend/src/lib/hooks';

import { timeout } from '../../../utils';
import { Board } from '@sage3/shared/types';
import { useConfigStore } from '@sage3/frontend';

export interface EnterBoardProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
}

export const EnterBoardModal = (props: EnterBoardProps) => {
  // Navigation
  const { toBoard } = useRouteNav();

  // Configuration information
  const config = useConfigStore((state) => state.config);

  // Toast for information feedback
  const toast = useToast();

  // Reference to the input field
  const initialRef = useRef<HTMLInputElement>(null);

  // Private information setter and getter
  const [privateText, setPrivateText] = useState<string | undefined>(undefined);
  const updatePrivateText = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrivateText(e.target.value);
  };

  // State for loading and password prompt
  const isPrivate = props.board.data.isPrivate;
  const [loading, setLoading] = useState(isPrivate ? false : true);
  const [passwordPrompt, setPasswordPrompt] = useState(isPrivate ? true : false);

  useEffect(() => {
    setLoading(isPrivate ? false : true);
    setPasswordPrompt(isPrivate ? true : false);
    setPrivateText(undefined);
  }, [JSON.stringify(props.board)]);

  const enterBoard = useCallback(async () => {
    if (props.isOpen) {
      setPrivateText(undefined);
      setLoading(true);
      setPasswordPrompt(false);
      await timeout(300);
      toBoard(props.board.data.roomId, props.board._id);
      props.onClose();
    }
  }, [props, toBoard, setLoading]);

  // Check if the board is private
  // If it is, prompt the user for a password
  useEffect(() => {
    if (!isPrivate && props.isOpen) {
      enterBoard();
    }
    // if the room is not protected, go ahead and enter the room
  }, [enterBoard, isPrivate, props.isOpen]);

  // Checks if the user entered pin matches the board pin
  const compareKey = async () => {
    if (!privateText) return;
    // Feature of UUID v5: private key to 'sign' a string
    // Hash the PIN: the namespace comes from the server configuration
    const key = uuidv5(privateText, config.namespace);

    // compare the hashed keys
    if (key === props.board.data.privatePin) {
      enterBoard();
    } else {
      toast({
        title: `The password you have entered is incorrect`,
        status: 'error',
        duration: 4 * 1000,
        isClosable: true,
      });
    }
  };

  const handleKeyClick = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      compareKey();
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
          {passwordPrompt && !loading ? (
            <>
              <InputGroup>
                <InputLeftAddon children="Password" />
                <Input
                  onKeyDown={handleKeyClick}
                  ref={initialRef}
                  width="full"
                  value={privateText}
                  type="password"
                  autoCapitalize="off"
                  onChange={updatePrivateText}
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
          ) : (
            <Progress size="md" colorScheme="teal" isIndeterminate mb="4" borderRadius="md" />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
