/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ArticulateAPI, useAppStore } from '@sage3/frontend';
import { Button, Text } from '@chakra-ui/react';
import { App, AppGroup } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { useAudio } from '@sage3/frontend';

// Styling
import './styling.css';
import { useEffect } from 'react';

/* App component for transcribe */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);

  const { startRecording, transcription } = useAudio({});

  return (
    <AppWindow app={props}>
      <>
        <Button onClick={startRecording}>start</Button>
        <Text>transcription: {transcription.join('')}</Text>
        {/* <h1> value : {s.value}</h1> */}
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app transcribe */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
      <Button colorScheme="green">Action</Button>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
