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
import { ZoomMtg } from '@zoom/meetingsdk';
// ZoomMtg.preLoadWasm();
// ZoomMtg.prepareWebSDK();

import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded';
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

async function fetchMeetingToken(role: number, meetingNumber: number) {
  const reponse = await fetch(`/zoom/meetingtoken?role=${role}&meetingnumber=${meetingNumber}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const { token, sdkKey } = await reponse.json();
  console.log('Zoom> Token: ', token);
  console.log('Zoom> SDK Key: ', sdkKey);
  return { token, sdkKey };
}

/**https://us05web.zoom.us/j/84208980859?pwd=RD2eVirJqBiJuw4uPfTfbflW432SNO.1
 * https://uic.zoom.us/j/89893595365?pwd=UHM0a3dhZlhxNjNjejZ5MzhmL1dGZz09
 * https://us05web.zoom.us/j/84699182633?pwd=E24FSFntBZZyG0yUCZax2HTpgP0uq1.1
 * Panel to show all the Server's plugins and allow the users to create new apps from them
 * @param props
 * @returns
 */
export function ZoomPanel(props: ZoomProps) {
  var meetingNumber = '84699182633';
  var passWord = 'E24FSFntBZZyG0yUCZax2HTpgP0uq1.1';
  var role = 0;
  var userName = 'React';
  var userEmail = '';
  var registrantToken = '';
  var zakToken = '';
  var leaveUrl = 'http://localhost:3000';

  const { user } = useUser();

  const eleRef = useRef(null);

  async function getSignature(e: any) {
    e.preventDefault();

    const { token, sdkKey } = await fetchMeetingToken(role, parseInt(meetingNumber));
    startMeeting(token, sdkKey);
  }

  function startMeeting(signature: any, sdkKey: any) {
    const ele = eleRef.current;
    if (!ele) return;
    const client = ZoomMtgEmbedded.createClient();
    client.init({ zoomAppRoot: ele, language: 'en-US' });
    client.join({
      signature: signature,
      sdkKey: sdkKey,
      meetingNumber: meetingNumber,
      password: passWord,
      userName: user ? user?.data.name : 'SAGE3-User',
    });
  }

  return (
    <Panel title={'Zoom'} name="zoom" width={0} showClose={true}>
      <Box height="500px" width="500px">
        <h1>Zoom Meeting SDK Sample React</h1>
        <Box ref={eleRef}></Box>
        <button onClick={getSignature}>Join Meeting</button>
      </Box>
    </Panel>
  );
}
// https://us05web.zoom.us/j/85023518182?pwd=X3nuy0mbX9oBbEUYsjbdqrtHQ08qWR.1
