/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ChangeEvent, useState } from 'react';
import {
  Box,
  Button,
  Input,
  InputGroup,
  InputLeftAddon,
  Progress,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
  ModalFooter,
} from '@chakra-ui/react';

import { Board } from '@sage3/shared/types';
import { ConfirmModal, apiUrls, isUUIDv4 } from '@sage3/frontend';

import { EnterBoardModal } from './EnterBoardModal';

// Props
interface enterBoardProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * Enter a board by their id Component.
 * @param props
 * @returns
 */
export function EnterBoardByURLModal(props: enterBoardProps) {
  // Local state
  const [boardUrl, setboardURL] = useState('');
  // Status of the request
  const [submitStatus, setSubmitStatus] = useState<'pending' | 'submitted' | 'success'>('pending');

  // Chakra Toast
  const toast = useToast();

  // Enter Board by ID Modal
  const { isOpen: isOpenEnterBoard, onOpen: onOpenEnterBoard, onClose: onCloseEnterBoard } = useDisclosure();
  const { isOpen: changeBoardIsOpen, onOpen: changeBoardOnOpen, onClose: changeBoardOnClose } = useDisclosure();
  const { isOpen: differentServerIsOpen, onOpen: differentServerOnOpen, onClose: differentServerOnClose } = useDisclosure();

  const [board, setBoard] = useState<Board>();

  // Input Changes
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setboardURL(e.target.value);
  };

  const invalidURLReset = () => {
    // Reset local state
    setSubmitStatus('pending');
    setboardURL('');
    // Give user some feedback
    toast({
      title: 'Invalid Board Reference',
      description: 'This link or ID is invalid.',
      duration: 3000,
      isClosable: true,
      status: 'error',
    });
  };

  // Handle the data from the useData hook
  const handleSubmit = async () => {
    // Update local state
    setSubmitStatus('submitted');
    // Clean up the string
    const useUrl = boardUrl.trim();
    // Is it a valid ID: 11 characters long and has a dash in the middle
    const isID = useUrl.length === 11 && (useUrl.split('-').length === 2);
    if (isID) {
      // Fetch board from the server
      const response = await fetch(apiUrls.boards.getBoards());
      const results = (await response.json()) as { success: boolean; data: Board[] };
      // Check the data we got back
      if (results.success) {
        // Get the data
        const board = results.data.find((board) => board.data.code === useUrl);
        if (board) {
          // Update local state
          setSubmitStatus('success');
          // Set Board
          setBoard(board);
          setSubmitStatus('pending');
          changeBoardOnOpen();
        }
        else {
          invalidURLReset();
          return;
        }
      } else {
        invalidURLReset();
        return;
      }
    } else if (!useUrl.startsWith('sage3://')) {
      // Invalid URL: reset local state
      invalidURLReset();
      return;
    } else {
      // Lets Process the URL: starts with sage3
      // Remove sage3://
      const url = new URL(useUrl.replace('sage3://', 'https://'));
      // Get the hostname
      const hostname = url.hostname;
      // Get the boardId
      const hash = url.hash;

      if (!hostname || !hash) {
        // Invalid URL
        // Reset local state
        invalidURLReset();
        return;
      }

      // Check if the hostname is the same as the current hostname
      if (hostname !== window.location.hostname) {
        // Invalid URL
        // Reset local state
        differentServerOnOpen();
        return;
      }

      // Extract the boardID
      const boardId = hash.split('/')[hash.split('/').length - 1];
      if (!isUUIDv4(boardId)) {
        // Invalid URL
        // Reset local state
        invalidURLReset();
        return;
      } else {
        // Fetch board from the server
        const response = await fetch(apiUrls.boards.getBoard(boardId));
        const results = (await response.json()) as { success: boolean; data: Board[] };
        // Check the data we got back
        if (results.success) {
          // Update local state
          setSubmitStatus('success');
          // Get the data
          const board = results.data[0];
          // Set Board
          setBoard(board);
          setSubmitStatus('pending');
          changeBoardOnOpen();
        } else {
          invalidURLReset();
          return;
        }
      }
    }
  };

  const differentServerConfirm = () => {
    const url = new URL(boardUrl.replace('sage3://', 'https://'));
    // Change the current address to the new url
    window.location.href = url.href;
  };

  const changeBoardConfirm = () => {
    if (board) {
      onOpenEnterBoard();
    }
  };

  const cancelReset = () => {
    setSubmitStatus('pending');
    setboardURL('');
    differentServerOnClose();
    changeBoardOnClose();
    onCloseEnterBoard();
    props.onClose();
  };

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} size="xl" blockScrollOnMount={false}>
      {board ? <EnterBoardModal isOpen={isOpenEnterBoard} onClose={onCloseEnterBoard} board={board}></EnterBoardModal> : null}
      <ConfirmModal
        isOpen={differentServerIsOpen}
        onClose={cancelReset}
        title={'Different Hub'}
        cancelText={'Cancel'}
        confirmText="Confirm"
        confirmColor="green"
        message={`This board exists on a different hub. Are you sure you want to leave this hub?`}
        onConfirm={differentServerConfirm}
      />

      <ConfirmModal
        isOpen={changeBoardIsOpen}
        onClose={cancelReset}
        title={'Change Board'}
        cancelText={'Cancel'}
        confirmText="Confirm"
        confirmColor="green"
        message={`Are you sure you want to enter "${board?.data.name}?`}
        onConfirm={changeBoardConfirm}
      />

      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Join Board with ID or URL</ModalHeader>
        <ModalBody mb="2">
          {submitStatus === 'pending' ? (
            <Box mx={2} width="500px">
              <form onSubmit={handleSubmit}>
                <InputGroup>
                  <InputLeftAddon children="Board" />
                  <Input
                    value={boardUrl}
                    onChange={handleInputChange}
                    onSubmit={handleSubmit}
                    fontSize="sm"
                    placeholder="Board ID or URL"
                    spellCheck={false}
                    _placeholder={{ opacity: 1, color: 'gray.600' }}
                  />
                </InputGroup>
              </form>
            </Box>
          ) : (
            <Box mx={2} width="500px">
              <Progress size="xs" colorScheme="teal" borderRadius="md" boxShadow="none" isIndeterminate width="100%" />
            </Box>
          )}
          <ModalFooter>
            <Button colorScheme="gray" mr={4} onClick={props.onClose}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={handleSubmit}>
              Enter
            </Button>
          </ModalFooter>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
