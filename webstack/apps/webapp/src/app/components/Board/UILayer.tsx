/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, useDisclosure } from '@chakra-ui/react';
import { Applications, initialValues } from '@sage3/applications/apps';
import { AppName } from '@sage3/applications/schema';
import { AssetModal, ContextMenu, UploadModal, useAppStore, useBoardStore, useUIStore, useUser } from '@sage3/frontend';
import { useNavigate } from 'react-router';
import { AppToolbar } from './UI/AppToolbar';
import { BoardContextMenu } from './UI/BoardContextMenu';

import { InfoPanel } from './UI/InfoPanel';
import { MainMenu } from './UI/Menus/MainMenu';
import { NavigationMenu } from './UI/Menus/NavigationMenu';
import { ApplicatiosnMenu } from './UI/Menus/ApplicationsMenu';
import { MiniMap } from './UI/Minimap';
import { ButtonPanel, Panel } from './UI/Panel';
import { Twilio } from './UI/Twilio';
import { AvatarMenu } from './UI/Menus/AvatarMenu';

type UILayerProps = {
  boardId: string;
  roomId: string;
};

export function UILayer(props: UILayerProps) {
  // Boards
  const boards = useBoardStore((state) => state.boards);
  const board = boards.find((el) => el._id === props.boardId);

  // UI Store
  const boardPosition = useUIStore((state) => state.boardPosition);
  //const menuPanelPosition = useUIStore((state) => state.menuPanelPosition);
  //const appPanelPosition = useUIStore((state) => state.appPanelPosition);
  const appToolbarPanelPosition = useUIStore((state) => state.appToolbarPanelPosition);
  //const minimapPanelPosition = useUIStore((state) => state.minimapPanelPosition);
  //const infoPanelPosition = useUIStore((state) => state.infoPanelPosition);
  //const setminimapPanelPosition = useUIStore((state) => state.setminimapPanelPosition);
  //const setMenuPanelPosition = useUIStore((state) => state.setMenuPanelPosition);
  //const setAppPanelPosition = useUIStore((state) => state.setAppPanelPosition);
  const setAppToolbarPosition = useUIStore((state) => state.setAppToolbarPosition);
  //const setInfoPanelPosition = useUIStore((state) => state.setInfoPanelPosition);

 
  // User
  const { user } = useUser();

  // Apps
  const apps = useAppStore((state) => state.apps);
  const createApp = useAppStore((state) => state.create);
  const deleteApp = useAppStore((state) => state.delete);

  // Asset manager button
  const { isOpen: assetIsOpen, onOpen: assetOnOpen, onClose: assetOnClose } = useDisclosure();

  // Upload modal
  const { isOpen: uploadIsOpen, onOpen: uploadOnOpen, onClose: uploadOnClose } = useDisclosure();

    
  // Connect to Twilio only if there are Screenshares or Webcam apps
  const twilioConnect = apps.filter((el) => el.data.type === 'Screenshare').length > 0;

  return (
    <Box display="flex" flexDirection="column" height="100vh" id="uilayer">
      
      <ApplicatiosnMenu boardId={props.boardId} roomId={props.roomId} />

      <MainMenu uploadOnOpen={uploadOnOpen} assetOnOpen={assetOnOpen} />
       
      <AvatarMenu boardId={props.boardId} />

      <NavigationMenu  width={260} />

      <ContextMenu divId="board">
        <BoardContextMenu boardId={props.boardId} roomId={props.roomId} clearBoard={() => apps.forEach((a) => deleteApp(a._id))} />
      </ContextMenu>

      
      <AppToolbar position={appToolbarPanelPosition} setPosition={setAppToolbarPosition}></AppToolbar>
      
      {/* Asset dialog */}
      <AssetModal isOpen={assetIsOpen} onOpen={assetOnOpen} onClose={assetOnClose} center={boardPosition}></AssetModal>

      {/* Upload dialog */}
      <UploadModal isOpen={uploadIsOpen} onOpen={uploadOnOpen} onClose={uploadOnClose}></UploadModal>

      <Twilio roomName={props.boardId} connect={twilioConnect} />
    </Box>
  );
}
