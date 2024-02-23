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
// import { Socket, io } from 'socket.io-client';

import React, { useEffect } from 'react';

// Styling
import './styling.css';
import { useState } from 'react';

/* App component for SpeechRecognition */

function AppComponent(props: App): JSX.Element {
  const [socketInstance, setSocketInstance] = useState<null>(null);

  const [prediction, setPrediction] = useState('0');

  // useEffect(() => {
  //   const socket = io('http://127.0.0.1:5000/', {
  //     transports: ['websocket'],
  //     // cors: {
  //     //   origin: "*",
  //     // },
  //   });

  //   setSocketInstance(socket);
  //   socket.on('conection', (data: string) => {
  //     const output = JSON.parse(data);
  //     console.log(output);
  //   });

  //   socket.on('disconnect', (data: string) => {
  //     console.log(data);
  //   });

  //   socket.on('prediction', (data: string) => {
  //     setPrediction(JSON.parse(data)[0][0]);
  //   });

  //   return () => {
  //     socket.disconnect();
  //   };
  // }, []);

  const record_and_send = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    const chunks: BlobPart[] | undefined = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      console.log('Blob Recorded');
      const blob = new Blob(chunks, { type: 'audio/webm' });
      if (socketInstance) {
        // socketInstance.emit('stream_audio', blob);
      }
    };
    setTimeout(() => {
      recorder.stop();
    }, 5000);
    recorder.start();
  };

  const startRecording = async () => {
    setInterval(record_and_send, 3100);
  };

  const updateState = useAppStore((state) => state.updateState);

  return (
    <AppWindow app={props}>
      <>
        <button onClick={startRecording}>Start</button>

        {/* <p>Recording: {recording}</p>
        <p>Speaking: {speaking}</p>
        <p>Transcribing: {transcribing}</p>
        <p>Transcribed Text: {transcript.text}</p>
        <button onClick={() => startRecording()}>Start</button>
        <button onClick={() => pauseRecording()}>Pause</button>
        <button onClick={() => stopRecording()}>Stop</button> */}
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
