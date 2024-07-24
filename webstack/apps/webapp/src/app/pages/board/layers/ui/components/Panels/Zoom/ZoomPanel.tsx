/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue, VStack, Tooltip, Box, Badge, Text, Button } from '@chakra-ui/react';
import { useAppStore, usePluginStore, useUIStore, useUser } from '@sage3/frontend';
import { ButtonPanel, Panel } from '../Panel';
import { useEffect, useRef, useState } from 'react';
import { use } from 'passport';
import uitoolkit from '@zoom/videosdk-ui-toolkit';
import '@zoom/videosdk-ui-toolkit/dist/videosdk-ui-toolkit.css';
import { set } from 'date-fns';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { useParams } from 'react-router';
export interface ZoomProps {
  boardId: string;
  roomId: string;
}

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

/**
 * Panel to show all the Server's plugins and allow the users to create new apps from them
 * @param props
 * @returns
 */
export function ZoomPanel(props: ZoomProps) {
  const { user } = useUser();

  const [token, setToken] = useState<string>('');
  const [pending, setPending] = useState<boolean>(false);
  const [joined, setJoined] = useState<boolean>(false);
  const { boardId } = useParams();

  // HTML Ref
  const zoomUIRef = useRef<HTMLDivElement>(null);

  function sessionClosed() {
    console.log('session closed');
    setPending(false);
    setJoined(false);
  }

  function sessionJoined() {
    console.log('session joined');
    setPending(false);
    setJoined(true);
  }

  async function joinSession() {
    if (!zoomUIRef.current) return;
    setPending(true);
    const token = await fetchToken(`${user?._id}`, props.boardId!);
    const config = {
      videoSDKJWT: token,
      sessionName: props.boardId,
      userName: user?.data.name,
      features: ['video', 'audio', 'settings', 'users'],
    };
    uitoolkit.joinSession(zoomUIRef.current, config);
    uitoolkit.onSessionJoined(() => sessionJoined());
    uitoolkit.onSessionClosed(() => sessionClosed());
    uitoolkit.offSessionClosed(() => sessionClosed());
  }

  async function leaveSession() {
    if (!zoomUIRef.current) return;
    // Check if ref has children
    if (zoomUIRef.current.children.length === 0) {
      sessionClosed();
      return;
    } else {
      uitoolkit.closeSession(zoomUIRef.current);
      sessionClosed();
    }
  }

  return (
    <Panel title={'Jitsi'} name="zoom" width={0} showClose={joined ? false : true}>
      <Box width="650px" height="625px" display="flex" flexDir="column" justifyContent="space-between">
        {boardId && (
          <JitsiMeeting
            domain={'nvip-viz.cis230038.projects.jetstream-cloud.org'}
            roomName={boardId}
            configOverwrite={{
              startWithAudioMuted: true,
              disableModeratorIndicator: true,
              startScreenSharing: true,
              enableEmailInStats: false,
            }}
            interfaceConfigOverwrite={{
              DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            }}
            userInfo={{
              displayName: user ? user?.data.name : 'Anonymous',
              email: user ? user?.data.email : 'Anonymous@gmail.com',
            }}
            onApiReady={(externalApi) => {
              // here you can attach custom event listeners to the Jitsi Meet External API
              // you can also store it locally to execute commands
            }}
            getIFrameRef={(iframeRef) => {
              iframeRef.style.height = '600px';
            }}
          />
        )}
      </Box>
    </Panel>
  );
}
