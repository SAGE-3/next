/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Box, useDisclosure, Modal } from '@chakra-ui/react';

import {
  AssetModal, ContextMenu, UploadModal, useAppStore, useBoardStore, useUIStore,
  usePresenceStore, useUser, processContentURL
} from '@sage3/frontend';

import { Applications, initialValues } from '@sage3/applications/apps';
import { AppName, AppState } from '@sage3/applications/schema';
import { AppToolbar } from './UI/AppToolbar';
import { BoardContextMenu } from './UI/BoardContextMenu';

import { InfoPanel } from './UI/InfoPanel';
import { MiniMap } from './UI/Minimap';
import { ButtonPanel, Panel } from './UI/Panel';
import { Twilio } from './UI/Twilio';
import { ClearBoardModal } from './UI/ClearBoardModal';
import { AlfredComponent } from '@sage3/frontend';

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
  const displayUI = useUIStore((state) => state.displayUI);
  const hideUI = useUIStore((state) => state.hideUI);

  // User
  const { user } = useUser();
  const presences = usePresenceStore((state) => state.presences);

  // Apps
  const apps = useAppStore((state) => state.apps);
  const createApp = useAppStore((state) => state.create);
  const deleteApp = useAppStore((state) => state.delete);

  // Asset manager modal
  const { isOpen: assetIsOpen, onOpen: assetOnOpen, onClose: assetOnClose } = useDisclosure();
  // Upload modal
  const { isOpen: uploadIsOpen, onOpen: uploadOnOpen, onClose: uploadOnClose } = useDisclosure();
  // Clear boar modal
  const { isOpen: clearIsOpen, onOpen: clearOnOpen, onClose: clearOnClose } = useDisclosure();

  const navigate = useNavigate();

  // Redirect the user back to the homepage when he clicks the green button in the top left corner
  function handleHomeClick() {
    navigate('/home');
  }

  // Function to create a new app
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
      state: { ...(initialValues[appName] as AppState) },
      ownerId: user._id || '',
      minimized: false,
      raised: true,
    });
  };

  // Connect to Twilio only if there are Screenshares or Webcam apps
  const twilioConnect = apps.filter((el) => el.data.type === 'Screenshare').length > 0;

  // Alfred quick bar response
  // TODO: move to another file
  const alfredAction = useCallback((term: string) => {
    if (!user) return;

    // Get the position of the cursor
    const me = presences.find((el) => (el.data.userId === user._id) && (el.data.boardId === props.boardId));
    const pos = me?.data.cursor || { x: 100, y: 100, z: 0 };
    const width = 400;
    const height = 400;
    pos.x -= width / 2;
    pos.y -= height / 2;
    // Decompose the search
    const terms = term.split(' ');

    if (terms[0] === 'app') {
      // app shortcuts
      const name = terms[1];
      if (name === "Webview" || name === "Screenshare" || name === "Clock") {
        newApplication(name);
      }
    } else if (terms[0] === 'w' || terms[0] === 'web' || terms[0] === 'webview') {
      let loc = terms[1];
      if (!loc.startsWith('http://') && !loc.startsWith('https://')) {
        loc = 'https://' + loc;
      }
      createApp({
        name: 'Webview',
        description: 'Webview',
        roomId: props.roomId,
        boardId: props.boardId,
        position: pos,
        size: { width, height, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'Webview',
        ownerId: user?._id,
        state: { webviewurl: processContentURL(loc) },
        minimized: false,
        raised: true
      });
    } else if (terms[0] === 'g' || terms[0] === 'goo' || terms[0] === 'google') {
      const rest = terms.slice(1).join('+');
      const searchURL = 'https://www.google.com/search?q=' + rest;
      createApp({
        name: 'Webview',
        description: 'Webview',
        roomId: props.roomId,
        boardId: props.boardId,
        position: pos,
        size: { width, height, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'Webview',
        ownerId: user?._id,
        state: { webviewurl: processContentURL(searchURL) },
        minimized: false,
        raised: true
      });

    } else if (terms[0] === 's' || terms[0] === 'n' || terms[0] === 'stick' || terms[0] === 'stickie' || terms[0] === 'note') {
      const content = terms.slice(1).join(' ');
      createApp({
        name: 'Stickie',
        description: 'Stckie>',
        roomId: props.roomId,
        boardId: props.boardId,
        position: pos,
        size: { width, height, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'Stickie',
        state: { ...initialValues['Stickie'] as AppState, text: content },
        ownerId: user._id,
        minimized: false,
        raised: true,
      });
    } else if (terms[0] === 'c' || terms[0] === 'cell') {
      const content = terms.slice(1).join(' ');
      console.log('Create cell', content)
    } else if (terms[0] === 'showui') {
      // Show all the UI elements
      displayUI();
    } else if (terms[0] === 'hideui') {
      // Hide all the UI elements
      hideUI();
    } else if (terms[0] === 'clear' || terms[0] === 'clearall' || terms[0] === 'closeall') {
      apps.forEach((a) => deleteApp(a._id));
    }
  }, [user, apps, props.boardId, presences]);

  /**
   * Clear the board confirmed
   */
  const onClearConfirm = () => {
    // delete all apps
    apps.forEach((a) => deleteApp(a._id));
    // close the modal
    clearOnClose();
  };

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
        <ButtonPanel title="Clear Board" onClick={clearOnOpen} />
      </Panel>

      <AppToolbar position={appToolbarPanelPosition} setPosition={setAppToolbarPosition}></AppToolbar>

      <MiniMap position={minimapPanelPosition} setPosition={setminimapPanelPosition} stuck={true} />

      <ContextMenu divId="board">
        <BoardContextMenu boardId={props.boardId} roomId={props.roomId} clearBoard={clearOnOpen} />
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

      {/* Clear board dialog */}
      <Modal isCentered isOpen={clearIsOpen} onClose={clearOnClose}>
        <ClearBoardModal onClick={onClearConfirm} onClose={clearOnClose} ></ClearBoardModal>
      </Modal>

      <Twilio roomName={props.boardId} connect={twilioConnect} />

      {/* Alfred modal dialog */}
      <AlfredComponent onAction={alfredAction} />

    </Box>
  );
}
