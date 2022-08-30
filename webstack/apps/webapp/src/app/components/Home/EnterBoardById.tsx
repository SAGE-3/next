/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Button, Input, InputGroup, InputLeftAddon, InputRightAddon, Progress, useToast } from '@chakra-ui/react';
import { Board } from '@sage3/shared/types';
import { ChangeEvent, useState } from 'react';

// Props
interface enterBoardProps {
  enterBoard: (board: Board) => void;
}

/**
 * Enter a board by their id Component.
 * @param props 
 * @returns 
 */
export function EnterBoardById(props: enterBoardProps) {
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
        description: `Joining Board ${board.data.name}`,
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
        title: 'Invalid board ID',
        duration: 3000,
        isClosable: true,
        status: 'error',
      });
    }
  };

  return submitStatus === 'pending' ? (
    <Box mx={2} width="500px">
      <form onSubmit={handleSubmit}>
        <InputGroup>
          <InputLeftAddon children="BoardID" />
          <Input value={boardId} onChange={handleInputChange} onSubmit={handleSubmit} fontSize="sm" />
          <InputRightAddon
            p="0"
            children={
              <Button colorScheme="green" borderRadius="0 4px 4px 0" onClick={handleSubmit}>
                Enter
              </Button>
            }
          />
        </InputGroup>
      </form>
    </Box>
  ) : (
    <Box mx={2} width="500px">
      <Progress size="xs" colorScheme="teal" borderRadius="md" boxShadow="none" isIndeterminate width="100%" />
    </Box>
  );
}

// Timeout function
// Could probably move into a utility function in the libs folder
function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
