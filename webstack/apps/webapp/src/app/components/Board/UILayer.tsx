/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, useDisclosure, Modal, useToast } from '@chakra-ui/react';
import { format as formatDate } from 'date-fns';
import JSZip from 'jszip';

import { ContextMenu, downloadFile, useAssetStore, useAppStore, useUIStore, useBoardStore } from '@sage3/frontend';

import { Controller, AssetsPanel, ApplicationsPanel, NavigationPanel, UsersPanel, WhiteboardPanel } from './UI/Panels';
import { BoardContextMenu } from './UI/BoardContextMenu';
import { ClearBoardModal } from './UI/ClearBoardModal';
import { AppToolbar } from './UI/AppToolbar';
import { Twilio } from './UI/Twilio';
import { Alfred } from './UI/Alfred';
import { LassoPanel } from './UI/Panels/LassoPanel/LassoPanel';

type UILayerProps = {
  boardId: string;
  roomId: string;
};

export function UILayer(props: UILayerProps) {
  // UI Store
  const fitApps = useUIStore((state) => state.fitApps);
  const setClearAllMarkers = useUIStore((state) => state.setClearAllMarkers);

  // Asset store
  const assets = useAssetStore((state) => state.assets);
  // Board store
  const boards = useBoardStore((state) => state.boards);
  // Apps
  const apps = useAppStore((state) => state.apps);
  const deleteApp = useAppStore((state) => state.delete);

  // Toast
  const toast = useToast();

  // Clear board modal
  const { isOpen: clearIsOpen, onOpen: clearOnOpen, onClose: clearOnClose } = useDisclosure();

  // Connect to Twilio only if there are Screenshares or Webcam apps
  const twilioConnect = apps.filter((el) => el.data.type === 'Screenshare').length > 0;

  /**
   * Clear the board confirmed
   */
  const onClearConfirm = () => {
    // delete all apps
    apps.forEach((a) => deleteApp(a._id));
    setClearAllMarkers(true);
    // close the modal
    clearOnClose();
  };

  // Show all the application
  const showAllApps = () => {
    fitApps(apps);
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
      } else if (a.data.type === 'Stickie') {
        // Stickies are saved as text files
        if ('text' in a.data.state) {
          const filename = `stickie-${a._id}.txt`;
          if (filename && session) {
            // add to zip
            session.file(filename, a.data.state.text || '');
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
    <Box display="flex" flexDirection="column" height="100vh" id="uilayer" position={'absolute'}>
      <AppToolbar></AppToolbar>

      <ContextMenu divId="board">
        <BoardContextMenu
          boardId={props.boardId}
          roomId={props.roomId}
          clearBoard={clearOnOpen}
          showAllApps={showAllApps}
          downloadBoard={downloadBoard}
        />
      </ContextMenu>

      <ApplicationsPanel boardId={props.boardId} roomId={props.roomId} />

      <UsersPanel boardId={props.boardId} roomId={props.roomId} />

      <NavigationPanel clearBoard={clearOnOpen} fitApps={showAllApps} boardId={props.boardId} />

      <AssetsPanel boardId={props.boardId} roomId={props.roomId} />

      <WhiteboardPanel boardId={props.boardId} roomId={props.roomId} />

      <LassoPanel boardId={props.boardId} roomId={props.roomId} />

      {/* Clear board dialog */}
      <Modal isCentered isOpen={clearIsOpen} onClose={clearOnClose}>
        <ClearBoardModal onClick={onClearConfirm} onClose={clearOnClose} isOpen={clearIsOpen}></ClearBoardModal>
      </Modal>

      <Twilio roomName={props.boardId} connect={twilioConnect} />

      <Controller boardId={props.boardId} roomId={props.roomId} />
      {/* Alfred modal dialog */}
      <Alfred boardId={props.boardId} roomId={props.roomId} />
    </Box>
  );
}
