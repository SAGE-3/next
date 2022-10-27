/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { Button, Input } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { ChangeEvent, ChangeEventHandler, useEffect, useRef, useState } from 'react';
import { debounce } from 'throttle-debounce';

/* App component for chartMaker */

function AppComponent(props: App): JSX.Element {
  const state = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);

  // The text of the sticky for React
  const [input, setInput] = useState(state.input);

  // Saving the text after 1sec of inactivity
  const debounceSave = debounce(1000, (val) => {
    console.log('debounce');
    updateState(props._id, { input: val });
  });

  // Keep a copy of the function
  const debounceFunc = useRef(debounceSave);

  // Update local value with value from the server
  useEffect(() => {
    setInput(state.input);
  }, [state.input]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setInput(text);
    debounceFunc.current(text);
  };

  return (
    <AppWindow app={props}>
      <>
        <Input value={input} onChange={handleChange} />
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app chartMaker */

function ToolbarComponent(props: App): JSX.Element {
  // const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
      <Button colorScheme="green">Action</Button>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
