/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { useColorModeValue, VStack } from '@chakra-ui/react';

import { useAppStore, useUIStore, useUser, useData } from '@sage3/frontend';
import { Applications } from '@sage3/applications/apps';
import { initialValues } from '@sage3/applications/initialValues';
import { AppName } from '@sage3/applications/schema';

import { ButtonPanel, Panel } from '../Panel';

// Development or production
const development: boolean = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

// Build list of applications from apps.json
// or all apps if in development mode
const appListed = development
  ? Object.keys(Applications).sort((a, b) => a.localeCompare(b))
  : [
      'AIPane',
      'ChartMaker',
      'KernelDashboard',
      'JupyterLab',
      'LeafLet',
      'Notepad',
      'SageCell',
      'Screenshare',
      'Stickie',
      'Webview',
      'Hawaii Mesonet',
    ];

const aiApps = ['AIPane', 'ChartMaker', 'KernelDashboard', 'JupyterLab', 'SageCell'].sort((a, b) => a.localeCompare(b));

export interface ApplicationProps {
  boardId: string;
  roomId: string;
}

export function ApplicationsPanel(props: ApplicationProps) {
  const data = useData('/api/info');
  const [appsList, setAppsList] = useState(appListed);

  // App Store
  const createApp = useAppStore((state) => state.create);

  // UI store
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);

  useEffect(() => {
    if (data) {
      const features = data.features;
      setAppsList((prev) => {
        let newlist = prev;
        if (!features['twilio']) {
          newlist = newlist.filter((a) => a !== 'Screenshare');
        }
        if (!features['ai']) {
          newlist = newlist.filter((a) => a !== 'AIPane');
        }
        if (!features['cell']) {
          newlist = newlist.filter((a) => a !== 'SageCell');
        }
        if (!features['jupyter']) {
          newlist = newlist.filter((a) => a !== 'JupyterLab');
          newlist = newlist.filter((a) => a !== 'KernelDashboard');
        }
        if (!features['articulate']) {
          newlist = newlist.filter((a) => a !== 'ChartMaker');
        }

        return newlist;
      });
    }
  }, [data]);

  // Theme
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');
  // User
  const { user } = useUser();

  const newApplication = (appName: AppName) => {
    if (!user) return;

    const x = Math.floor(-boardPosition.x + window.innerWidth / 2 / scale - 200);
    const y = Math.floor(-boardPosition.y + window.innerHeight / 2 / scale - 200);

    // Setup initial size
    let w = 400;
    let h = 400;
    if (appName === 'SageCell') {
      w = 650;
      h = 400;
    } else if (appName === 'KernelDashboard') {
      w = 800;
      h = 300;
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
      state: { ...(initialValues[appName] as any) },
      raised: true,
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
        <>
          <>Apps</>
          {appsList
            // create a button for each application
            .map((appName) => {
              const isAi = aiApps.includes(appName);
              return !isAi ? (
                <ButtonPanel key={appName} title={appName} candrag={'true'} onClick={() => newApplication(appName as AppName)} />
              ) : null;
            })}
          <>AI Apps</>
          {/* <Box > */}
          {aiApps.map((appName) => {
            return appsList.includes(appName) ? (
              <ButtonPanel key={appName} title={appName} candrag={'true'} onClick={() => newApplication(appName as AppName)} />
            ) : null;
          })}
        </>
      </VStack>
      {/* </Box> */}
    </Panel>
  );
}
