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
import { apiUrls, isUUIDv4 } from '@sage3/frontend';

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
export function EnterBoardByIdModal(props: enterBoardProps) {
  // Local state
  const [boardId, setBoardId] = useState('');
  // Status of the request
  const [submitStatus, setSubmitStatus] = useState<'pending' | 'submitted' | 'success'>('pending');

  // Chakra Toast
  const toast = useToast();

  // Enter Board by ID Modal
  const { isOpen: isOpenEnterBoard, onOpen: onOpenEnterBoard, onClose: onCloseEnterBoard } = useDisclosure();
  const [board, setBoard] = useState<Board>();

  // Input Changes
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setBoardId(e.target.value);
  };

  // Handle the data from the useData hook
  const handleSubmit = async () => {
    // Update local state
    setSubmitStatus('submitted');
    let url: any = '';
    try {
      url = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch (e) {
      console.log('Invalid URL');
      // Reset local state
      setSubmitStatus('pending');
      setBoardId('');
      // Give user some feedback
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid URL',
        duration: 3000,
        isClosable: true,
        status: 'error',
      });
      return;
    }
    console.log(url);
    // Check if the hostname is the same as the current hostname
    if (url.hostname !== window.location.hostname) {
      // Reset local state
      setSubmitStatus('pending');
      setBoardId('');
      // Give user some feedback
      toast({
        title: 'Invalid Board ID',
        description: 'This link is for a different server.',
        duration: 3000,
        isClosable: true,
        status: 'error',
      });
      return;
    }
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
      onOpenEnterBoard();

      // Give user some feedback
      toast({
        title: 'Success',
        description: `Joining Board "${board.data.name}"`,
        duration: 3000,
        isClosable: true,
        status: 'success',
      });

      setSubmitStatus('pending');
    } else {
      // Reset local state
      setSubmitStatus('pending');
      setBoardId('');
      // Give user some feedback
      toast({
        title: 'Invalid Board ID',
        duration: 3000,
        isClosable: true,
        status: 'error',
      });
    }
  };

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} size="xl" blockScrollOnMount={false}>
      {board ? <EnterBoardModal isOpen={isOpenEnterBoard} onClose={onCloseEnterBoard} board={board}></EnterBoardModal> : null}

      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Enter Board by URL</ModalHeader>
        <ModalBody mb="2">
          {submitStatus === 'pending' ? (
            <Box mx={2} width="500px">
              <form onSubmit={handleSubmit}>
                <InputGroup>
                  <InputLeftAddon children="URL" />
                  <Input
                    value={boardId}
                    onChange={handleInputChange}
                    onSubmit={handleSubmit}
                    fontSize="sm"
                    placeholder="Enter URL"
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
            <Button colorScheme="blue" mr={4} onClick={props.onClose}>
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
