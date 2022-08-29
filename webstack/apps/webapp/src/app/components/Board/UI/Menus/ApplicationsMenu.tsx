/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

 import { useEffect, useState, useRef, createContext } from 'react';
 import { Box, useColorModeValue, Text } from '@chakra-ui/react';
 import { AssetModal, ContextMenu, UploadModal, useAppStore, useBoardStore, useUIStore, useUser } from '@sage3/frontend';
 import { Rnd } from 'react-rnd';
 import { Applications, initialValues } from '@sage3/applications/apps';
 import { AppName } from '@sage3/applications/schema';

 import { ButtonPanel, Panel , PanelProps} from '../Panel';

 export interface ApplicationProps   {
  // position: { x: number; y: number };
  // setPosition: (pos: { x: number; y: number }) => void;
  // stuck?: boolean;
  boardId: string;
  roomId: string;
 };
 
 

  

 export function ApplicatiosnMenu(props: ApplicationProps) {
   // App Store
   const apps = useAppStore((state) => state.apps);
  const createApp = useAppStore((state) => state.create);
  const deleteApp = useAppStore((state) => state.delete);
   // UI store
   const boardPosition = useUIStore((state) => state.boardPosition);

   const position = useUIStore((state) => state.applicationsMenu.position);
   const setPosition = useUIStore((state) => state.applicationsMenu.setPosition);
   const opened = useUIStore((state) => state.applicationsMenu.opened);
   const setOpened = useUIStore((state) => state.applicationsMenu.setOpened);

   // Theme
   const textColor = useColorModeValue('gray.800', 'gray.100');
   // User
  const { user } = useUser();

   //const setAppPanelPosition = props.setPosition;
   //const appPanelPosition = props.position;


   const newApplication = (appName: AppName) => {
    if (!user) return;

    const x = Math.floor(boardPosition.x + window.innerWidth / 2 - 400 / 2);
    const y = Math.floor(boardPosition.y + window.innerHeight / 2 - 400 / 2);
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
         
        <Panel title="Applications" opened={opened} setOpened={setOpened} setPosition={setPosition} position={position} >
            <Box>
            {Object.keys(Applications).map((appName) => (
                <ButtonPanel key={appName} title={appName} onClick={(e) => newApplication(appName as AppName)} />
            ))}
            </Box>
       </Panel>);
     
 }
 