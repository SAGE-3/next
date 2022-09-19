/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, useDisclosure, Modal, useToast } from '@chakra-ui/react';
import { format as formatDate } from 'date-fns';

import { Controller, AssetsPanel, ApplicationsPanel, NavigationPanel, UsersPanel } from './UI/Panels';
import { ContextMenu, downloadFile, useAssetStore, useAppStore, useUIStore, useBoardStore } from '@sage3/frontend';
import { AppToolbar } from './UI/AppToolbar';
import { BoardContextMenu } from './UI/BoardContextMenu';
import { Twilio } from './UI/Twilio';
import { ClearBoardModal } from './UI/ClearBoardModal';
import { Alfred } from './UI/Alfred';

import JSZip from 'jszip';
// import * as JSZipType from 'jszip';

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
  // Asset store
  const assets = useAssetStore((state) => state.assets);
  // Board store
  const boards = useBoardStore((state) => state.boards);
  // Apps
  const apps = useAppStore((state) => state.apps);
  const deleteApp = useAppStore((state) => state.delete);

  // Toast
  const toast = useToast();

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
    // Fit the smaller dimension into the browser size
    const sm = Math.min(window.innerWidth / boardWidth, window.innerHeight / boardHeight);
    const x = window.innerWidth / sm / 2 - boardWidth / 2;
    const y = window.innerHeight / sm / 2 - boardHeight / 2;
    setBoardPosition({ x, y });
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

    // 85% of the smaller dimension (horizontal or vertical )
    const sw = 0.85 * (window.innerWidth / w);
    const sh = 0.85 * (window.innerHeight / h);
    const sm = Math.min(sw, sh);

    // Offset to center the board...
    const bx = Math.floor(-cx + window.innerWidth / sm / 2);
    const by = Math.floor(-cy + window.innerHeight / sm / 2);
    setBoardPosition({ x: bx, y: by });
    setScale(sm);
  };

  // How to save a board opened files into a ZIP archive
  const downloadBoard = async () => {
    // Create a ZIP object
    const zip = new JSZip();
    // Generate a filename using date and board name
    const boardName = boards.find((b) => b._id === props.boardId)?.data.name || 'session';
    const prettyDate = formatDate(new Date(), 'yyyy-MM-dd-HH-mm-ss');
    const name = `SAGE3-${boardName.replace(' ', '-')}-${prettyDate}.zip`;
    // Create a folder in the archive
    const session = zip.folder(`SAGE3-${boardName}`);
    // Iterate over all the apps
    await apps.reduce(async (promise, a) => {
      // wait for the last async function to finish
      await promise;
      // process the next app with an asset
      if ('assetid' in a.data.state) {
        const assetid = a.data.state.assetid;
        if (assetid) {
          // Get the asset from the store
          const asset = assets.find((a) => a._id === assetid);
          // Derive the public URL
          const url = 'api/assets/static/' + asset?.data.file;
          // Get the filename for the asset
          const filename = asset?.data.originalfilename;
          // if all set, add the file to the zip
          if (asset && url && filename && session) {
            // Download the file contents
            const buffer = await fetch(url).then((r) => r.arrayBuffer());
            // add to zip
            session.file(filename, buffer);
          }
        }
      } else if (a.data.name === 'Stickie') {
        // Stickies are saved as text files
        if ('text' in a.data.state) {
          const filename = `stickie-${a._id}.txt`;
          if (filename && session) {
            // add to zip
            session.file(filename, a.data.state.text);
          }
        }
      }
    }, Promise.resolve());
    // Display a message
    toast({ title: 'Assets Packaged', status: 'info', duration: 2000, isClosable: true });
    // Finish the zip and trigger the download
    zip.generateAsync({ type: 'blob' }).then(function (content) {
      // Create a URL from the blob
      const url = URL.createObjectURL(content);
      //Trigger the download
      downloadFile(url, name);
      toast({ title: 'Download in Progress', status: 'success', duration: 2000, isClosable: true });
    });
  };

  return (
    <Box display="flex" flexDirection="column" height="100vh" id="uilayer">
      <AppToolbar position={appToolbarPanelPosition} setPosition={setAppToolbarPosition}></AppToolbar>

      <ContextMenu divId="board">
        <BoardContextMenu
          boardId={props.boardId}
          roomId={props.roomId}
          clearBoard={clearOnOpen}
          fitToBoard={fitToBoard}
          showAllApps={showAllApps}
          downloadBoard={downloadBoard}
        />
      </ContextMenu>

      <ApplicationsPanel boardId={props.boardId} roomId={props.roomId} />

      <UsersPanel boardId={props.boardId} roomId={props.roomId} />

      <NavigationPanel clearBoard={clearOnOpen} fitToBoard={fitToBoard} fitApps={showAllApps} boardId={props.boardId} />

      <AssetsPanel boardId={props.boardId} roomId={props.roomId} />

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
