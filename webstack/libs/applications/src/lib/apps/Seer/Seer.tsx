/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// SAGE Imports
import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import { Box, Button, ButtonGroup, HStack, Tooltip, useColorModeValue } from '@chakra-ui/react';
import { MdAdd, MdPlayArrow, MdRemove } from 'react-icons/md';

// Components
import { CodeBox, InputBox, OutputBox } from './components';

/* App component for Seer */
function AppComponent(props: App): JSX.Element {
  // Theme Colors
  const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A');

  return (
    <AppWindow app={props}>
      <Box
        w={'100%'}
        h={'100%'}
        p={3}
        bg={bgColor}
        overflowY={'scroll'}
        css={{
          '&::-webkit-scrollbar': {
            width: '.1em',
          },
          '&::-webkit-scrollbar-track': {
            '-webkit-box-shadow': 'inset 0 0 6px rgba(0,0,0,0.00)',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'teal',
            outline: '2px solid teal',
          },
        }}
      >
        <Box display="flex" flexDir="row" width="100%" height="100%">
          <Box display="flex" flexDir="column" width="100%" height="100%" borderRight="dotted 2px black" pr="3">
            <h2 style={{ fontWeight: 'bold' }}>Input</h2>
            <InputBox app={props} />
            <h2 style={{ fontWeight: 'bold' }}>Response</h2>
            <OutputBox app={props} />
            <Button colorScheme="teal">Copy to Code</Button>
          </Box>

          <Box display="flex" flexDir="column" width="100%" height="100%" pl="3">
            <h2 style={{ fontWeight: 'bold' }}>Generated Code </h2>
            <CodeBox app={props} />
            <Button colorScheme="teal">Generate SAGECell </Button>
          </Box>
        </Box>
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app Seer */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <HStack>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
          <Button
            isDisabled={s.fontSize <= 8}
            onClick={() => updateState(props._id, { fontSize: Math.max(10, s.fontSize - 2) })}
            _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
          >
            <MdRemove />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
          <Button
            isDisabled={s.fontSize > 42}
            onClick={() => updateState(props._id, { fontSize: Math.min(48, s.fontSize + 2) })}
            _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
          >
            <MdAdd />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </HStack>
  );
}

export default { AppComponent, ToolbarComponent };
