/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Chakra and React imports
import { useCallback, useEffect, useRef } from 'react';
import { Box, Button, ButtonGroup } from '@chakra-ui/react';

// SAGE imports
import { useUser, useZoomStore } from '@sage3/frontend';
import {} from '@sage3/shared';

// App
import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { MdScreenShare } from 'react-icons/md';
import uitoolkit from '@zoom/videosdk-ui-toolkit';
import '@zoom/videosdk-ui-toolkit/dist/videosdk-ui-toolkit.css';
import { useParams } from 'react-router';

async function fetchToken(userId: string, roomName: string) {
  const reponse = await fetch(`/zoom/token?identity=${userId}&room=${roomName}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const { token } = await reponse.json();
  console.log('Zoom> Token: ', token);
  return token;
}

type ElectronSource = {
  appIcon: null | string;
  display_id: string;
  id: string;
  name: string;
  thumbnail: string;
};
const screenShareTimeLimit = 3600 * 1000 * 6; // 6 hours

/* App component for Twilio */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // HTML Ref
  const sessionsRef = useRef<HTMLDivElement>(null);

  // BoardId
  const { boardId } = useParams();

  // User
  const { user } = useUser();

  function sessionClosed(ref: HTMLDivElement) {
    if (!ref) return;
    console.log('session closed');
  }

  async function joinSession() {
    if (!sessionsRef.current) return;
    const token = await fetchToken(`${user?._id}`, boardId!);
    const config = {
      videoSDKJWT: token,
      sessionName: boardId,
      userName: user?.data.name,
      features: ['video', 'audio', 'settings', 'users', 'chat', 'share'],
    };
    uitoolkit.joinSession(sessionsRef.current, config);
    uitoolkit.onSessionClosed(() => sessionClosed(sessionsRef.current!));
  }

  // // Start Video
  // async function startVideo(ref: HTMLVideoElement) {
  //   if (!zoom) return;
  //   if (!ref) return;
  //   const stream = zoom.getMediaStream();
  //   await stream.startVideo();
  //   stream.renderVideo(ref, zoom.getCurrentUserInfo().userId, props.data.size.width, props.data.size.height, 0, 0, VideoQuality.Video_720P);
  // }

  // function subscribeToVideoStateChange(ref: HTMLVideoElement) {
  //   if (!zoom) return;
  //   if (!ref) return;
  //   zoom.on('peer-video-state-change', async (payload) => {
  //     console.log('Video State Change: ', payload);
  //     const zoomSession = zoom.getMediaStream();
  //     if (payload.action === 'Start') {
  //       // a user turned on their video, render it
  //       zoomSession.renderVideo(ref, payload.userId, undefined, undefined, undefined, undefined, VideoQuality.Video_720P);
  //     } else if (payload.action === 'Stop') {
  //       // a user turned off their video, stop rendering it
  //       zoomSession.detachVideo(payload.userId);
  //     }
  //   });
  // }

  return (
    <AppWindow app={props} hideBackgroundIcon={MdScreenShare}>
      <Box backgroundColor="black" width="100%" height="100%">
        <Box ref={sessionsRef}></Box>
        <Button onClick={joinSession} disabled={!sessionsRef.current}>
          Join Sessions
        </Button>
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app Twilio */

function ToolbarComponent(props: App): JSX.Element {
  // Current User
  const { user } = useUser();
  const yours = user?._id === props._createdBy;

  // Handle stopping the stream
  const stopStream = useCallback((id: string) => {
    // Stop the stream
    // stopStream(id);
  }, []);

  return (
    <ButtonGroup>
      {yours ? (
        <Button onClick={() => stopStream(props._id)} colorScheme="red" size="xs">
          Stop Stream
        </Button>
      ) : null}
    </ButtonGroup>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
