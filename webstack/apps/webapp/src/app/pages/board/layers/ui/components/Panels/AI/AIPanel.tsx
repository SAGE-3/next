/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useRef, useState } from 'react';
import { Button, useColorModeValue, VStack, useToast, ToastId } from '@chakra-ui/react';

import { useAppStore, useUIStore, useUser, GetConfiguration, AiAPI } from '@sage3/frontend';
import { Applications } from '@sage3/applications/apps';
import { initialValues } from '@sage3/applications/initialValues';
import { AppName, AppState } from '@sage3/applications/schema';

import { ButtonPanel, Panel } from '../Panel';
import { text } from 'd3';
import { AiQueryRequest } from '@sage3/shared';

// Development or production
const development: boolean = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

// Build list of applications from apps.json
// or all apps if in development mode

export interface AIPanelProps {
  boardId: string;
  roomId: string;
}

export function AIPanel(props: AIPanelProps) {
  // App Store
  const createApp = useAppStore((state) => state.create);
  const apps = useAppStore((state) => state.apps);

  // UI store
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);

  // Theme
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');
  // User
  const { user, accessId } = useUser();
  // Toast
  const toast = useToast();
  const toastIdRef = useRef<ToastId>();

  const createSummaryStickie = async () => {
    try {
      if (!user) return;
      if (!apps) return;

      const stickiesInBoard = apps.filter((app) => app.data.type === 'Stickie');

      if (stickiesInBoard.length > 0) {
        const x = Math.floor(-boardPosition.x + window.innerWidth / 2 / scale - 200);
        const y = Math.floor(-boardPosition.y + window.innerHeight / 2 / scale - 200);

        // Setup initial size
        let w = 400;
        let h = 420;

        // Create a list of text from stickies
        const textArrOfStickies = stickiesInBoard.map((app) => app.data.state.text);

        toastIdRef.current = toast({
          description: 'Summarizing stickies...',
          status: 'info',
          isClosable: false,
        });
        // Query AI to summarize the stickies
        const res = await AiAPI.query({
          model: 'openai',
          input: `Summarize the main ideas from the following list of ideas: ${JSON.stringify(textArrOfStickies)}`,
        } as AiQueryRequest);

        if (res.success) {
          toast.update(toastIdRef.current, {
            description: 'Stickies summarized.',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });

          const state = {
            text: res.output,
          } as AppState;

          createApp({
            title: 'Stickie',
            roomId: props.roomId,
            boardId: props.boardId,
            position: { x, y, z: 0 },
            size: { width: w, height: h, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'Stickie',
            state: { ...(initialValues['Stickie'] as any), ...state },
            raised: true,
            dragging: false,
            pinned: false,
          });
        }
      } else {
        toast({
          title: 'Error',
          description: 'No stickies are present to summarize.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast.update(toastIdRef.current as ToastId, {
        title: 'Error',
        description: 'An error has occurred while trying to summarize stickies.',
      });
    }
  };

  return (
    <Panel title="AI" name="ai" width={300} showClose={false}>
      <VStack
        maxH={300}
        w={'100%'}
        m={0}
        pr={2}
        spacing={1}
        overflow="auto"
        css={{
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: gripColor,
            borderRadius: 'md',
          },
        }}
      >
        {/* {appsList
          // create a button for each application
          .map((appName) => (
            <ButtonPanel key={appName} title={appName} candrag={'true'} onClick={() => newApplication(appName as AppName)} />
          ))} */}

        <ButtonPanel
          key="Summarize Stickies"
          title="Summarize Stickies"
          candrag={'false'}
          onClick={() => {
            createSummaryStickie();
          }}
        />
      </VStack>
      {/* </Box> */}
    </Panel>
  );
}
