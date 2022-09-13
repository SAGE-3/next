/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, useDisclosure, Modal } from '@chakra-ui/react';

import { Controller, AssetsPanel, ApplicationsPanel, NavigationPanel, UsersPanel } from './UI/Panels';
import { ContextMenu, UploadModal, useAppStore, useUIStore } from '@sage3/frontend';
import { AppToolbar } from './UI/AppToolbar';
import { BoardContextMenu } from './UI/BoardContextMenu';
import { Twilio } from './UI/Twilio';
import { ClearBoardModal } from './UI/ClearBoardModal';
import { Alfred } from './UI/Alfred';

type UILayerProps = {
  boardId: string;
  roomId: string;
};

export function UILayer(props: UILayerProps) {
  // UI Store
  const setScale = useUIStore((state) => state.setScale);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);

  const appToolbarPanelPosition = useUIStore((state) => state.appToolbarPanelPosition);
  const setAppToolbarPosition = useUIStore((state) => state.setAppToolbarPosition);
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);

  // Apps
  const apps = useAppStore((state) => state.apps);
  const deleteApp = useAppStore((state) => state.delete);

  // Clear boar modal
  const { isOpen: clearIsOpen, onOpen: clearOnOpen, onClose: clearOnClose } = useDisclosure();

  // Connect to Twilio only if there are Screenshares or Webcam apps
  const twilioConnect = apps.filter((el) => el.data.type === 'Screenshare').length > 0;

  /**
   * Clear the board confirmed
   */
  const onClearConfirm = () => {
    // delete all apps
    apps.forEach((a) => deleteApp(a._id));
    // close the modal
    clearOnClose();
  };

  // Show whole board on the screen
  const fitToBoard = () => {
    setBoardPosition({ x: 0, y: 0 });
    // Fit the smaller dimension into the browser size
    const sm = Math.min(window.innerWidth / boardWidth, window.innerHeight / boardHeight);
    setScale(sm);
  };

  // Show all the application, selecting center and scale
  // BUG: I dont think the math is right but seems OK for now
  const showAllApps = () => {
    let x1 = boardWidth;
    let x2 = 0;
    let y1 = boardHeight;
    let y2 = 0;
    // Bounding box for all applications
    apps.forEach((a) => {
      const p = a.data.position;
      const s = a.data.size;
      if (p.x < x1) x1 = p.x;
      if (p.x > x2) x2 = p.x;
      if (p.y < y1) y1 = p.y;
      if (p.y > y2) y2 = p.y;

      if (p.x + s.width > x2) x2 = p.x + s.width;
      if (p.y + s.height > y2) y2 = p.y + s.height;
    });
    // Width and height of bounding box
    const w = x2 - x1;
    const h = y2 - y1;
    // Center
    const cx = x1 + w / 2;
    const cy = y1 + h / 2;
    // Offset to center the board...
    const bx = Math.floor(-cx + window.innerWidth / 2);
    const by = Math.floor(-cy + window.innerHeight / 2);
    setBoardPosition({ x: bx, y: by });
    // 85% of the smaller dimension (horizontal or vertical )
    const sw = 0.85 * (window.innerWidth / w);
    const sh = 0.85 * (window.innerHeight / h);
    const sm = Math.min(sw, sh);
    setScale(sm);
  };

  return (
    <Box display="flex" flexDirection="column" height="100vh" id="uilayer">
      <ContextMenu divId="board">
        <BoardContextMenu
          boardId={props.boardId}
          roomId={props.roomId}
          clearBoard={clearOnOpen}
          fitToBoard={fitToBoard}
          showAllApps={showAllApps}
        />
      </ContextMenu>

      <ApplicationsPanel boardId={props.boardId} roomId={props.roomId} />

      <UsersPanel boardId={props.boardId} roomId={props.roomId} />

      <NavigationPanel />

      <AssetsPanel boardId={props.boardId} roomId={props.roomId} />

      <AppToolbar position={appToolbarPanelPosition} setPosition={setAppToolbarPosition}></AppToolbar>

      {/* Clear board dialog */}
      <Modal isCentered isOpen={clearIsOpen} onClose={clearOnClose}>
        <ClearBoardModal onClick={onClearConfirm} onClose={clearOnClose}></ClearBoardModal>
      </Modal>

      <Twilio roomName={props.boardId} connect={twilioConnect} />

      <Controller boardId={props.boardId} roomId={props.roomId} />
      {/* Alfred modal dialog */}
      <Alfred boardId={props.boardId} roomId={props.roomId} />
    </Box>
  );
}
