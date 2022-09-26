/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { ChangeEvent, useState } from 'react';
import {
  Box,
  Button,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  Progress,
  Tooltip,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router';

import { Board } from '@sage3/shared/types';
import { isUUIDv4, useData, timeout } from '@sage3/frontend';

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
  const results = useData(`/api/boards/${boardId}`) as { success: boolean, data: Board[] };

  // Chakra Toast
  const toast = useToast();

  // Navigate to the new board
  const navigate = useNavigate();
  function handleEnterBoard(board: Board) {
    navigate('/board', { state: { roomId: board.data.roomId, boardId: board._id } });
  }

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
      // Give user some feedback
      toast({
        title: 'Success', description: `Joining Board "${board.data.name}"`,
        duration: 3000, isClosable: true, status: 'success',
      });
      // Slow down transition
      await timeout(600);
      handleEnterBoard(board);
    } else {
      // Reset local state
      setSubmitStatus('pending');
      setBoardId('');
      // Give user some feedback
      toast({
        title: 'Invalid Board ID',
        duration: 3000, isClosable: true, status: 'error',
      });
    }
  };

  return (
    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose} size="xl">
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
                  <InputRightAddon
                    p="0"
                    children={
                      <Tooltip
                        isOpen={!isUUIDv4(boardId) ? undefined : false}
                        placement="top-start"
                        gutter={20}
                        hasArrow={true}
                        label={'Enter a Valid BoardID'}
                        openDelay={400}
                        shouldWrapChildren
                      >
                        <Button colorScheme="green" borderRadius="0 4px 4px 0" onClick={handleSubmit} disabled={!isUUIDv4(boardId)}>
                          Enter
                        </Button>
                      </Tooltip>
                    }
                  />
                </InputGroup>
              </form>
            </Box>
          ) : (
            <Box mx={2} width="500px">
              <Progress size="xs" colorScheme="teal" borderRadius="md" boxShadow="none" isIndeterminate width="100%" />
            </Box>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
