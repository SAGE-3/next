/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect } from 'react';
import { Box, useColorModeValue, VStack } from '@chakra-ui/react';

import { StuckTypes, useAppStore, useUIStore, useUser } from '@sage3/frontend';
import { Applications } from '@sage3/applications/apps';
import { initialValues } from '@sage3/applications/initialValues';
import { AppName } from '@sage3/applications/schema';

import { ButtonPanel, Panel } from '../Panel';

// Build list of applications from apps.json
const appListed = [
  "AIPane",
  // "CSVViewer",
  // "Clock",
  // "Cobrowse",
  "CodeCell",
  // "Counter",
  // "DataTable",
  // "DeepZoomImage",
  // "GLTFViewer",
  // "ImageViewer",
  "JupyterLab",
  "Kernels",
  "LeafLet",
  // "Linker",
  "Notepad",
  // "PDFViewer",
  // "RTCChat",
  "Screenshare",
  "Stickie",
  // "TwilioScreenshare",
  // "VegaLite",
  // "VegaLiteViewer",
  // "VideoViewer",
  "Webview"
];

export interface ApplicationProps {
  boardId: string;
  roomId: string;
}

export function ApplicationsPanel(props: ApplicationProps) {
  // App Store
  const apps = useAppStore((state) => state.apps);
  const createApp = useAppStore((state) => state.create);
  const deleteApp = useAppStore((state) => state.delete);
  // UI store
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);

  const position = useUIStore((state) => state.applicationsPanel.position);
  const setPosition = useUIStore((state) => state.applicationsPanel.setPosition);
  const opened = useUIStore((state) => state.applicationsPanel.opened);
  const setOpened = useUIStore((state) => state.applicationsPanel.setOpened);
  const show = useUIStore((state) => state.applicationsPanel.show);
  const setShow = useUIStore((state) => state.applicationsPanel.setShow);
  const stuck = useUIStore((state) => state.applicationsPanel.stuck);
  const setStuck = useUIStore((state) => state.applicationsPanel.setStuck);

  const zIndex = useUIStore((state) => state.panelZ).indexOf('applications');

  const controllerPosition = useUIStore((state) => state.controller.position);
  // if a menu is currently closed, make it "jump" to the controller
  useEffect(() => {
    if (!show) {
      setPosition({ x: controllerPosition.x + 40, y: controllerPosition.y + 95 });
      setStuck(StuckTypes.Controller);
    }
  }, [show]);
  useEffect(() => {
    if (stuck == StuckTypes.Controller) {
      setPosition({ x: controllerPosition.x + 40, y: controllerPosition.y + 95 });
    }
  }, [controllerPosition]);

  // Theme
  // const textColor = useColorModeValue('gray.800', 'gray.100');
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');
  // User
  const { user } = useUser();

  // const setAppPanelPosition = props.setPosition;
  // const appPanelPosition = props.position;

  const newApplication = (appName: AppName) => {
    if (!user) return;

    const x = Math.floor(-boardPosition.x + window.innerWidth / 2 / scale - 200);
    const y = Math.floor(-boardPosition.y + window.innerHeight / 2 / scale - 200);

    createApp({
      name: appName,
      description: appName,
      roomId: props.roomId,
      boardId: props.boardId,
      position: { x, y, z: 0 },
      size: { width: 400, height: 400, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: appName,
      state: { ...(initialValues[appName] as any) },
      ownerId: user._id || '',
      minimized: false,
      raised: true,
    });
  };

  return (
    <Panel
      title="Applications"
      name="applications"
      opened={opened}
      setOpened={setOpened}
      setPosition={setPosition}
      position={position}
      width={230}
      showClose={true}
      show={show}
      setShow={setShow}
      stuck={stuck}
      setStuck={setStuck}
      zIndex={zIndex}
    >
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
        {/* <Box > */}
        {appListed
          // sort alphabetically by name
          .sort((a, b) => a.localeCompare(b))
          // create a button for each application
          .map((appName) => (
            <ButtonPanel key={appName} title={appName} candrag={'true'} onClick={(e) => newApplication(appName as AppName)} />
          ))}
      </VStack>
      {/* </Box> */}
    </Panel>
  );
}
