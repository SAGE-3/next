/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: snippets
 * created by: Luc Renambot
 */

// Import the React library
import React, { MouseEvent } from 'react';

import { Box, VStack, HStack, Button, Textarea, Text } from '@chakra-ui/react';

// Unique ID Generation
import { v4 as getUUID } from 'uuid';

// State management functions from SAGE3
import { useSageStateReducer } from '@sage3/frontend/smart-data/hooks';

// Import the props definition for this application
import { snippetsProps } from './metadata';
import { FaPlay } from 'react-icons/fa';

// Import state type definition
import { snippetsReducer } from './state-reducer';
// User information
import { useUser } from '@sage3/frontend/services';

export const Appssnippets = (props: snippetsProps): JSX.Element => {
  const { data: snippets, dispatch } = useSageStateReducer(props.state.snippets, snippetsReducer);
  const user = useUser();

  /**
   * Reducers functions
   */
  function addCell() {
    dispatch({
      type: 'create',
      id: getUUID(),
      code: 'x = 4;',
      user: user.id,
      needrun: false
    });
  }
  function clearCells() {
    dispatch({ type: 'clear' });
  }
  function changeCell(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const inputValue = e.target.value;
    const id = e.target.id;
    // console.log('Text>', inputValue, id);
    dispatch({ type: 'update', code: inputValue, id: id });
  }

  function runCell(id: string) {
    // console.log('Run Cell', id);
    dispatch({ type: 'run', id: id })
  }

  return (
    // Main application layout
    <VStack width="100%" >
      <HStack m={4}>
        <Button colorScheme="teal" fontSize="3xl"
          onClick={() => addCell()} >
          Add
        </Button>
        <Button colorScheme="teal" fontSize="3xl"
        >
          Delete
        </Button>
        <Button colorScheme="teal" fontSize="3xl"
          onClick={() => clearCells()} >
          Clear All
        </Button>
      </HStack>
      <Box width="90%">
        {snippets.map((c, i) => (
          <VStack key={'stack' + i} pb={6} align="left">
            <Button leftIcon={<FaPlay />} bg="gray.600" w="100px"
              id={c.id} onClick={() => runCell(c.id)}
            >
              Run </Button>
            <Textarea key={'code' + i} height="12rem"
              fontSize="3xl" fontFamily="mono"
              p={2} bg="white" color="gray.800"
              shadow="base" rounded="md"
              placeholder="Code here..."
              size="sm"
              _placeholder={{ color: 'gray.500' }}
              id={c.id}
              value={c.code}
              onChange={changeCell} />
            <Textarea key={'ouput' + i}
              fontSize="3xl"
              p={2} bg="gray.200" color="gray.800"
              shadow="base" rounded="md"
              placeholder="Result here..."
              size="sm"
              _placeholder={{ color: 'gray.500' }}
              id={c.id}
              isReadOnly={true}
              value={c.output}
            />
          </VStack>
        ))}
      </Box>

    </VStack>
  );
};

export default Appssnippets;
