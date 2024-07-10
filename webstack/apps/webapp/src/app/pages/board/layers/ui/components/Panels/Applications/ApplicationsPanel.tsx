/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { useColorModeValue, VStack } from '@chakra-ui/react';

import { useAppStore, useUIStore, useUser, GetConfiguration } from '@sage3/frontend';
import { Applications } from '@sage3/applications/apps';
import { initialValues } from '@sage3/applications/initialValues';
import { AppName, AppState } from '@sage3/applications/schema';

import { ButtonPanel, Panel } from '../Panel';

// Development or production
const development: boolean = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

// Build list of applications from apps.json
// or all apps if in development mode

export interface ApplicationProps {
  boardId: string;
  roomId: string;
}

export function ApplicationsPanel(props: ApplicationProps) {
  const [appsList, setAppsList] = useState<string[]>([]);

  // App Store
  const createApp = useAppStore((state) => state.create);

  // UI store
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);

  useEffect(() => {
    const updateAppList = async () => {
      const data = await GetConfiguration();

      // If developer show all apps
      if (development) {
        const apps = Object.keys(Applications).sort((a, b) => a.localeCompare(b));
        setAppsList(apps);
        // If Production show only the apps in the config file. config.features.apps
      } else if (!development && data) {
        const apps = data.features.apps.sort((a, b) => a.localeCompare(b));
        setAppsList(apps);
      } else {
        setAppsList([]);
      }
    };
    updateAppList();
  }, []);

  // Theme
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');
  // User
  const { user, accessId } = useUser();

  const newApplication = (appName: AppName) => {
    if (!user) return;

    const state = {} as AppState;
    const x = Math.floor(-boardPosition.x + window.innerWidth / 2 / scale - 200);
    const y = Math.floor(-boardPosition.y + window.innerHeight / 2 / scale - 200);

    // Setup initial size
    let w = 400;
    let h = 420;
    if (appName === 'SageCell') {
      w = 650;
      h = 400;
    } else if (appName === 'Screenshare') {
      w = 1280;
      h = 720;
    }

    const title = appName == 'Stickie' ? user.data.name : ''; // Gross
    createApp({
      title: title,
      roomId: props.roomId,
      boardId: props.boardId,
      position: { x, y, z: 0 },
      size: { width: w, height: h, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: appName,
      state: { ...(initialValues[appName] as any), ...state },
      raised: true,
      dragging: false,
      pinned: false,
    });
  };

  return (
    <Panel title="Applications" name="applications" width={300} showClose={false}>
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
        {appsList
          // create a button for each application
          .map((appName) => (
            <ButtonPanel key={appName} title={appName} draggable={true} onClick={() => newApplication(appName as AppName)} />
          ))}
      </VStack>
      {/* </Box> */}
    </Panel>
  );
}
