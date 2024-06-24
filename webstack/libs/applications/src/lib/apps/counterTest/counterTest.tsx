// /**
//  * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
//  * University of Hawaii, University of Illinois Chicago, Virginia Tech
//  *
//  * Distributed under the terms of the SAGE3 License.  The full license is in
//  * the file LICENSE, distributed as part of this software.
//  */

import { useAppStore } from '@sage3/frontend';
import { Container, Button, Input, Grid, GridItem } from '@chakra-ui/react';
import { App, AppGroup } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const handleButtonClick = (value: string) => {
    let newInput = s.input + value;
    if (s.input == "Error") {
      newInput = value
    }
    updateState(props._id, { input: newInput });
  }

  const handleBackspace = () => {
    updateState(props._id, { input: s.input.slice(0, -1) })
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
    <AppWindow app={props}>
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
            <GridItem colSpan={2}><Button width="110px" onClick={handleClear}>Clear</Button></GridItem>
            <GridItem colSpan={2}><Button width="110px" onClick={handleBackspace}>⌫</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('1')}>1</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('2')}>2</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('3')}>3</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('+')}>+</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('4')}>4</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('5')}>5</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('6')}>6</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('-')}>-</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('7')}>7</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('8')}>8</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('9')}>9</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('*')}>*</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('.')}>.</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('0')}>0</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={handleEqual}>=</Button></GridItem>
            <GridItem colSpan={1}><Button onClick={() => handleButtonClick('/')}>/</Button></GridItem>
          </Grid>
        </Container>
      </>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  //copy result to clipboard

  return (
    <>
    </>
  );
}

const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
