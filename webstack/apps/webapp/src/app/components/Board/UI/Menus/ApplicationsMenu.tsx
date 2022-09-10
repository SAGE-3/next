/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState, useRef, createContext } from 'react';
import { Box, useColorModeValue, Text } from '@chakra-ui/react';
import { AssetModal, ContextMenu, StuckTypes, UploadModal, useAppStore, useBoardStore, useUIStore, useUser } from '@sage3/frontend';
import { Rnd } from 'react-rnd';
import { Applications } from '@sage3/applications/apps';
import { initialValues } from '@sage3/applications/initialValues';
import { AppName } from '@sage3/applications/schema';

import { ButtonPanel, Panel, PanelProps } from '../Panel';

export interface ApplicationProps {
  boardId: string;
  roomId: string;
}

export function ApplicatiosnMenu(props: ApplicationProps) {
  // App Store
  const apps = useAppStore((state) => state.apps);
  const createApp = useAppStore((state) => state.create);
  const deleteApp = useAppStore((state) => state.delete);
  // UI store
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);

  const position = useUIStore((state) => state.applicationsMenu.position);
  const setPosition = useUIStore((state) => state.applicationsMenu.setPosition);
  const opened = useUIStore((state) => state.applicationsMenu.opened);
  const setOpened = useUIStore((state) => state.applicationsMenu.setOpened);
  const show = useUIStore((state) => state.applicationsMenu.show);
  const setShow = useUIStore((state) => state.applicationsMenu.setShow);
  const stuck = useUIStore((state) => state.applicationsMenu.stuck);
  const setStuck = useUIStore((state) => state.applicationsMenu.setStuck);

  const controllerPosition = useUIStore((state) => state.controller.position);
  // if a menu is currently closed, make it "jump" to the controller
  useEffect(() => {
    if (!show) {
      setPosition({ x: controllerPosition.x + 40, y: controllerPosition.y + 90 });
      setStuck(StuckTypes.Controller);
    }
  }, [show]);
  useEffect(() => {
    if (stuck == StuckTypes.Controller) {
      setPosition({ x: controllerPosition.x + 40, y: controllerPosition.y + 90 });
    }
  }, [controllerPosition]);

  // Theme
  const textColor = useColorModeValue('gray.800', 'gray.100');
  // User
  const { user } = useUser();

  //const setAppPanelPosition = props.setPosition;
  //const appPanelPosition = props.position;

  const newApplication = (appName: AppName) => {
    if (!user) return;

    console.log(boardPosition, scale, window.innerHeight, window.innerWidth);

    const x = Math.floor(-boardPosition.x + window.innerWidth / 2 / scale - 200);
    const y = Math.floor(-boardPosition.y + window.innerHeight / 2 / scale - 200);

    createApp({
      name: appName,
      description: appName + '>',
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
    >
      <Box>
        {Object.keys(Applications)
          .filter((el) => !el.includes('Viewer'))
          .map((appName) => (
            <ButtonPanel key={appName} title={appName} onClick={(e) => newApplication(appName as AppName)} />
          ))}
      </Box>
    </Panel>
  );
}
