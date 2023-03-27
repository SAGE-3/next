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
import { isUUIDv4, useData, timeout } from '@sage3/frontend';
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
  // Fetch board from the server
  const results = useData(`api/boards/${boardId}`) as { success: boolean; data: Board[] };

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
        <ModalHeader>Enter Board by ID</ModalHeader>
        <ModalBody mb="2">
          {submitStatus === 'pending' ? (
            <Box mx={2} width="500px">
              <form onSubmit={handleSubmit}>
                <InputGroup>
                  <InputLeftAddon children="BoardID" />
                  <Input
                    value={boardId}
                    onChange={handleInputChange}
                    onSubmit={handleSubmit}
                    fontSize="sm"
                    placeholder="Enter a board ID"
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
            <Button colorScheme="green" onClick={handleSubmit} isDisabled={!isUUIDv4(boardId)}>
              Enter
            </Button>
          </ModalFooter>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
