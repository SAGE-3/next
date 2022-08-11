/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, StatHelpText, useDisclosure } from '@chakra-ui/react';
import { Applications, initialValues } from '@sage3/applications/apps';
import { AppName } from '@sage3/applications/schema';
import { AssetModal, ContextMenu, UploadModal, useAppStore, useBoardStore, useUIStore, useUser } from '@sage3/frontend';
import { useNavigate } from 'react-router';
import { AppToolbar } from './UI/AppToolbar';
import { BoardContextMenu } from './UI/BoardContextMenu';
import { BoardFooter } from './UI/BoardFooter';
import { BoardHeader } from './UI/BoardHeader';
import { MiniMap } from './UI/Minimap';
import { ButtonPanel, Panel } from './UI/Panel';

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
  const setminimapPanelPosition = useUIStore((state) => state.setminimapPanelPosition);
  const setMenuPanelPosition = useUIStore((state) => state.setMenuPanelPosition);
  const setAppPanelPosition = useUIStore((state) => state.setAppPanelPosition);
  const setAppToolbarPosition = useUIStore((state) => state.setAppToolbarPosition);

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
    createApp({
      name: appName,
      description: appName + '>',
      roomId: props.roomId,
      boardId: props.boardId,
      position: { x: boardPosition.x, y: boardPosition.y, z: 0 },
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
    <Box display="flex" flexDirection="column" height="100vw">
      {/* Top Bar */}
      <BoardHeader boardName={board?.data.name ? board.data.name : ''} boardId={props.boardId} />

      <Panel title={'Applications'} opened={true} setPosition={setAppPanelPosition} position={appPanelPosition}>
        {Object.keys(Applications).map((appName) => (
          <ButtonPanel key={appName} title={appName} onClick={(e) => newApplication(appName as AppName)} />
        ))}
      </Panel>

    

      <Panel title={'Menu'} opened={true} setPosition={setMenuPanelPosition} position={menuPanelPosition}>
        <ButtonPanel title="Home" backgroundColor="green.500" onClick={handleHomeClick} />
        <ButtonPanel title="Asset Browser" backgroundColor="blue.500"  onClick={assetOnOpen} />
        <ButtonPanel title="Upload"  backgroundColor="blue.500"  onClick={uploadOnOpen} />
        <ButtonPanel title="Clear Board" backgroundColor="red.500" onClick={() => apps.forEach((a) => deleteApp(a._id))} />
      </Panel>

      {/* Bottom Bar */}
      <BoardFooter boardId={props.boardId} roomId={props.roomId}></BoardFooter>

      <AppToolbar position={appToolbarPanelPosition} setPosition={setAppToolbarPosition}></AppToolbar>

      <MiniMap position={minimapPanelPosition} setPosition={setminimapPanelPosition}/>

      <ContextMenu divId="board">
        <BoardContextMenu boardId={props.boardId} roomId={props.roomId} clearBoard={() => apps.forEach((a) => deleteApp(a._id))} />
      </ContextMenu>

      {/* Asset dialog */}
      <AssetModal isOpen={assetIsOpen} onOpen={assetOnOpen} onClose={assetOnClose} center={boardPosition}></AssetModal>
      {/* Upload dialog */}
      <UploadModal isOpen={uploadIsOpen} onOpen={uploadOnOpen} onClose={uploadOnClose}></UploadModal>
    </Box>
  );
}
