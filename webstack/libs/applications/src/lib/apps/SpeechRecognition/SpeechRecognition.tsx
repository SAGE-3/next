/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore, useConfigStore } from '@sage3/frontend';
import { Button } from '@chakra-ui/react';
import { App, AppGroup } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import '@babel/polyfill';

// @ts-ignore
import { useWhisper } from '@chengsokdara/use-whisper';

// Styling
import './styling.css';
import { useState } from 'react';
import { OpenConfiguration } from '@sage3/shared/types';

/* App component for SpeechRecognition */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // Configuration information
  const config = useConfigStore((state: { config: OpenConfiguration }) => state.config);
  const { recording, speaking, transcribing, transcript, pauseRecording, startRecording, stopRecording } = useWhisper({
    apiKey: config.openai.apiKey, // YOUR_OPEN_AI_TOKEN
  });

  const updateState = useAppStore((state) => state.updateState);

  return (
    <AppWindow app={props}>
      <>
        <p>Recording: {recording}</p>
        <p>Speaking: {speaking}</p>
        <p>Transcribing: {transcribing}</p>
        <p>Transcribed Text: {transcript.text}</p>
        <button onClick={() => startRecording()}>Start</button>
        <button onClick={() => pauseRecording()}>Pause</button>
        <button onClick={() => stopRecording()}>Stop</button>
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app SpeechRecognition */
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
