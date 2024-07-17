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
    <Panel title={'Zoom'} name="zoom" width={0} showClose={joined ? false : true}>
      <Box width="650px" height="625px" display="flex" flexDir="column" justifyContent="space-between">
        <Box
          position="absolute"
          height="620px"
          width="640px"
          display="flex"
          justifyContent="center"
          alignItems="center"
          fontSize="4xl"
          fontWeight="bold"
          pointerEvents="none"
        >
          {pending || joined ? '' : 'Zoom Conference'}
        </Box>
        <Box display="flex" alignItems="start" transform="translateY(-5px)" height="620px" width="640px">
          <Box ref={zoomUIRef}></Box>
        </Box>

        <Box display="flex" justifyContent="space-around" mb="10px">
          <Button onClick={joinSession} isDisabled={pending || joined} colorScheme="teal" size="xs">
            Join Zoom Call
          </Button>
          <Button onClick={leaveSession} isDisabled={!joined} colorScheme="red" size="xs">
            Leave Zoom Call
          </Button>
        </Box>
      </Box>
    </Panel>
  );
}
