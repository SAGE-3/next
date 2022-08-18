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
import { MiniMap } from './UI/Minimap';
import { ButtonPanel, Panel } from './UI/Panel';
import { Twilio } from './UI/Twilio';

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
  const menuPanelPosition = useUIStore((state) => state.menuPanelPosition);
  const appPanelPosition = useUIStore((state) => state.appPanelPosition);
  const appToolbarPanelPosition = useUIStore((state) => state.appToolbarPanelPosition);
  const minimapPanelPosition = useUIStore((state) => state.minimapPanelPosition);
  const infoPanelPosition = useUIStore((state) => state.infoPanelPosition);
  const setminimapPanelPosition = useUIStore((state) => state.setminimapPanelPosition);
  const setMenuPanelPosition = useUIStore((state) => state.setMenuPanelPosition);
  const setAppPanelPosition = useUIStore((state) => state.setAppPanelPosition);
  const setAppToolbarPosition = useUIStore((state) => state.setAppToolbarPosition);
  const setInfoPanelPosition = useUIStore((state) => state.setInfoPanelPosition);

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

  const navigate = useNavigate();

  // Redirect the user back to the homepage when he clicks the green button in the top left corner
  function handleHomeClick() {
    navigate('/home');
  }

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

  // Connect to Twilio only if there are Screenshares or Webcam apps
  const twilioConnect = apps.filter((el) => el.data.type === 'Screenshare').length > 0;

  return (
    <Box display="flex" flexDirection="column" height="100vh" id="uilayer">
      <Panel title={'Applications'} opened={true} setPosition={setAppPanelPosition} position={appPanelPosition} height={351}>
        {Object.keys(Applications).map((appName) => (
          <ButtonPanel key={appName} title={appName} canDrag={true} onClick={(e) => newApplication(appName as AppName)} />
        ))}
      </Panel>

      <Panel title={'Menu'} opened={true} setPosition={setMenuPanelPosition} position={menuPanelPosition} height={182} stuck={true}>
        <ButtonPanel title="Home" onClick={handleHomeClick} colorScheme="blackAlpha" />
        <ButtonPanel title="Asset Browser" onClick={assetOnOpen} />
        <ButtonPanel title="Upload" onClick={uploadOnOpen} />
        <ButtonPanel title="Clear Board" onClick={() => apps.forEach((a) => deleteApp(a._id))} />
      </Panel>

      <AppToolbar position={appToolbarPanelPosition} setPosition={setAppToolbarPosition}></AppToolbar>

      <MiniMap position={minimapPanelPosition} setPosition={setminimapPanelPosition} stuck={true} />

      <ContextMenu divId="board">
        <BoardContextMenu boardId={props.boardId} roomId={props.roomId} clearBoard={() => apps.forEach((a) => deleteApp(a._id))} />
      </ContextMenu>

      <InfoPanel
        title={board?.data.name ? board.data.name : ''}
        boardId={props.boardId}
        position={infoPanelPosition}
        setPosition={setInfoPanelPosition}
        stuck={true}
      />

      {/* Asset dialog */}
      <AssetModal isOpen={assetIsOpen} onOpen={assetOnOpen} onClose={assetOnClose} center={boardPosition}></AssetModal>

      {/* Upload dialog */}
      <UploadModal isOpen={uploadIsOpen} onOpen={uploadOnOpen} onClose={uploadOnClose}></UploadModal>

      <Twilio roomName={props.boardId} connect={twilioConnect} />
    </Box>
  );
}
