/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import {
  Container,
  Tooltip,
  ButtonGroup,
  Button,
  Input,
  Grid,
  GridItem,
  useToast,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  Box,
  AspectRatio,
} from '@chakra-ui/react';
import { MdList, MdCopyAll, MdBackspace, MdDelete } from 'react-icons/md';

import { useAppStore } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);

  // Scaling the app based on its width
  const [scale, setScale] = useState(1);

  // Set a title for the app
  useEffect(() => {
    if (props.data.title !== 'Calculator') {
      update(props._id, { title: 'Calculator' });
    }
  }, []);

  const handleButtonClick = (value: string) => {
    let newInput = s.input + value;
    if (s.input == 'Error') {
      newInput = value;
    }
    updateState(props._id, { input: newInput });
  };

  // Button handlers
  const handleBackspace = () => {
    updateState(props._id, { input: s.input.toString().slice(0, -1) });
  };

  const handleClear = () => {
    updateState(props._id, { input: '' });
  };

  const handleEqual = () => {
    // Save expression
    const expression: string = s.input;
    let result: string;

    try {
      result = eval(s.input.toString());
    } catch {
      result = 'Error';
    }

    updateState(props._id, { input: result });
    // Store history of results
    updateState(props._id, { history: s.history + expression + ' = ' + result + '\n' });
  };

  // Track the width of the app window and set the scale accordingly
  useEffect(() => {
    setScale(props.data.size.width / 230);
  }, [props.data.size.width]);

  return (
    <AppWindow app={props} lockAspectRatio={true}>
      <AspectRatio width={"100%"} height="100%" ratio={0.7} p={0} m={0}>
        <Box transform={`scale(${scale})`} transformOrigin={'center'} p={0} m={0}>
          <Grid templateColumns="repeat(4, 1fr)" gap="2">
            <GridItem colSpan={4}>
              <Input value={s.input} isReadOnly textAlign="right" borderRadius="md" />
            </GridItem>
            <GridItem colSpan={2}>
              <Button onClick={handleClear} w="100%" colorScheme="orange">
                Clear
              </Button>
            </GridItem>
            <GridItem colSpan={2}>
              <Button onClick={handleBackspace} w="100%" colorScheme="orange">
                <MdBackspace />
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={() => handleButtonClick('1')} w="100%">
                1
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={() => handleButtonClick('2')} w="100%">
                2
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={() => handleButtonClick('3')} w="100%">
                3
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={() => handleButtonClick('+')} w="100%" colorScheme="teal">
                +
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={() => handleButtonClick('4')} w="100%">
                4
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={() => handleButtonClick('5')} w="100%">
                5
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={() => handleButtonClick('6')} w="100%">
                6
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={() => handleButtonClick('-')} w="100%" colorScheme="teal">
                -
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={() => handleButtonClick('7')} w="100%">
                7
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={() => handleButtonClick('8')} w="100%">
                8
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={() => handleButtonClick('9')} w="100%">
                9
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={() => handleButtonClick('*')} w="100%" colorScheme="teal">
                *
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={() => handleButtonClick('.')} w="100%">
                .
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={() => handleButtonClick('0')} w="100%">
                0
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={handleEqual} w="100%" colorScheme="orange">
                =
              </Button>
            </GridItem>
            <GridItem colSpan={1}>
              <Button onClick={() => handleButtonClick('/')} w="100%" colorScheme="teal">
                /
              </Button>
            </GridItem>
          </Grid>
        </Box>
      </AspectRatio>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  // UI for calculation history
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const clearHistory = () => {
    updateState(props._id, { history: '' });
  };

  // Copy result to clipboard
  const handleCopy = () => {
    if (!s.input) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(s.input);
      toast({
        title: 'Copied result to clipboard',
        status: 'success',
        duration: 3000,
      });
    }
  };

  return (
    <>
      <Drawer placement="right" variant="code" isOpen={isOpen} onClose={onClose} closeOnOverlayClick={true}>
        <DrawerContent
          maxW="25vw"
          height={window.innerHeight - 80}
          rounded={'lg'}
          transitionDuration={'0.2s'}
          position="absolute"
          style={{ top: undefined, bottom: '45px', right: '10px' }}
        >
          <DrawerCloseButton />
          <DrawerHeader p={1} pl={5} m={1}>
            Calculation History
          </DrawerHeader>
          <DrawerBody pl={6} m={1} boxSizing="border-box">
            <pre>{s.history}</pre>
            <br />
            <Tooltip placement="bottom-start" hasArrow={true} label={'Clear History'} openDelay={400}>
              <Button onClick={clearHistory}>
                <MdDelete />
              </Button>
            </Tooltip>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'View History'} openDelay={400}>
          <Button onClick={onOpen}>
            <MdList />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Copy Result to Clipboard'} openDelay={400}>
          <Button onClick={handleCopy}>
            <MdCopyAll />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
