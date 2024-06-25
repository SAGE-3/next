// /**
//  * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
//  * University of Hawaii, University of Illinois Chicago, Virginia Tech
//  *
//  * Distributed under the terms of the SAGE3 License.  The full license is in
//  * the file LICENSE, distributed as part of this software.
//  */

import { useAppStore } from '@sage3/frontend';
import { Container, Tooltip, Button, Input, Grid, GridItem, useToast } from '@chakra-ui/react';
import { MdCopyAll } from 'react-icons/md';
import { App, AppGroup } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  // Set size for the app
  props.data.size.width = 275;
  props.data.size.height = 370;

  const handleButtonClick = (value: string) => {
    let newInput = s.input + value;
    if (s.input == "Error") {
      newInput = value
    }
    updateState(props._id, { input: newInput });
  }

  const handleBackspace = () => {
    updateState(props._id, { input: s.input.toString().slice(0, -1) })
  }

  const handleClear = () => {
    updateState(props._id, { input: "" });
  }

  const handleEqual = () => {
    try {
      updateState(props._id, { input: eval(s.input.toString()) });
    }
    catch {
      updateState(props._id, { input: "Error" });
    }
  }

  return (
    <AppWindow app={props} disableResize={true}>
      <>
        <Container maxW="xs" p="6">
          <Input
            value={s.input}
            isReadOnly
            mb="5"
            p="4"
            textAlign="right"
            borderRadius="md"
          />
          <Grid templateColumns="repeat(4, 1fr)" gap={3}>
            <GridItem colSpan={2}><Button onClick={handleClear} width="105px" colorScheme="teal">Clear</Button></GridItem>
            <GridItem colSpan={2}><Button onClick={handleBackspace} width="105px" colorScheme="teal">⌫</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('1')} width="42px">1</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('2')} width="42px">2</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('3')} width="42px">3</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('+')} width="42px" colorScheme="teal">+</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('4')} width="42px">4</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('5')} width="42px">5</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('6')} width="42px">6</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('-')} width="42px" colorScheme="teal">-</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('7')} width="42px">7</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('8')} width="42px">8</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('9')} width="42px">9</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('*')} width="42px" colorScheme="teal">*</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('.')} width="42px">.</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('0')} width="42px">0</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={handleEqual} width="42px">=</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('/')} width="42px" colorScheme="teal">/</Button></GridItem>
          </Grid>
        </Container>
      </>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const toast = useToast();

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
      <Tooltip placement="top-start" hasArrow={true} label={'Copy Result to Clipboard'} openDelay={400}>
        <Button onClick={handleCopy} size="xs" colorScheme="teal" mx={1}>
          <MdCopyAll />
        </Button>
      </Tooltip>
    </>
  );
}

const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
