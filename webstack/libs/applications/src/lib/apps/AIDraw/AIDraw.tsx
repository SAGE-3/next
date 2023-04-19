/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore } from '@sage3/frontend';
import { Button, ButtonGroup, Input, InputGroup } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { useEffect, useState } from 'react';

/* App component for AIDraw */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);

  return (
    <AppWindow app={props} processing={s.processing} lockAspectRatio={1}>
      <>
        <img src={s.imgSrc} width="100%" height="100%"></img>
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app AIDraw */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  // from the UI to the react state
  const [promptValue, setPromptValue] = useState(s.textPrompt);

  useEffect(() => {
    setPromptValue(s.textPrompt);
  }, [s.textPrompt, setPromptValue]);

  const handlePromptChange = (event: any) => setPromptValue(event.target.value);
  const changeAddr = (evt: any) => {
    evt.preventDefault();
    fetch('/api/stablediff', {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: promptValue, imgSrc: s.imgSrc, appId: props._id }),
    });
    updateState(props._id, { textPrompt: promptValue });
  };

  return (
    <>
      <ButtonGroup>
        <form onSubmit={changeAddr}>
          <InputGroup size="xs" minWidth="200px">
            <Input
              defaultValue={promptValue}
              value={promptValue}
              onChange={handlePromptChange}
              onPaste={(event) => {
                event.stopPropagation();
              }}
              backgroundColor="whiteAlpha.300"
              // placeholder="Type a text prompt..."
              _placeholder={{ opacity: 1, color: 'gray.400' }}
              disabled={s.processing}
            />
          </InputGroup>
        </form>
      </ButtonGroup>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
