/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

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
  ModalFooter,
  ModalBody,
} from '@chakra-ui/react';
import { Board } from '@sage3/shared/types';
import { ChangeEvent, useState } from 'react';
import { isUUIDv4 } from '@sage3/frontend';

// Props
interface enterBoardProps {
  enterBoard: (board: Board) => void;
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
  const [submitStatus, setSubmitStatus] = useState<'pending' | 'submitted' | 'success'>('pending');

  // Chakra Toast
  const toast = useToast();

  // Input Changes
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setBoardId(e.target.value);
  };

  // Handle the for submit
  const handleSubmit = async () => {
    // Update local state
    setSubmitStatus('submitted');

    // Lets wait so the user doesn't spam
    await timeout(1000);

    // Fetch the board
    const res = await fetch(`/api/boards/${boardId}`);

    // Was it successful?
    if (res.status === 200) {
      // Parse Response
      const data = await res.json();
      const board = data.data[0] as Board;

      // Update local state
      setSubmitStatus('success');

      // Give user some feedback
      toast({
        title: 'Success',
        description: `Joining Board "${board.data.name}"`,
        duration: 3000,
        isClosable: true,
        status: 'success',
      });
      // Lets wait again
      await timeout(1000);
      // Enter the board
      props.enterBoard(board);
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
                        placement="top"
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

// Timeout function
// Could probably move into a utility function in the libs folder
function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
