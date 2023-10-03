/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Box, useDisclosure, Modal, useToast, useColorModeValue } from '@chakra-ui/react';
import { format as formatDate } from 'date-fns';
import JSZip from 'jszip';

import {
  ContextMenu,
  downloadFile,
  useAssetStore,
  useAppStore,
  useUIStore,
  useBoardStore,
  MainButton,
  useRouteNav,
  useRoomStore,
  useConfigStore,
  Clock,
  useThrottleApps,
  useAbility,
  apiUrls,
} from '@sage3/frontend';

import {
  BoardContextMenu,
  ClearBoardModal,
  AppToolbar,
  Twilio,
  Alfred,
  LassoToolbar,
  Controller,
  AssetsPanel,
  ApplicationsPanel,
  NavigationPanel,
  UsersPanel,
  AnnotationsPanel,
  PluginsPanel,
  PresenceFollow,
  BoardTitle,
  KernelsPanel,
} from './components';

type UILayerProps = {
  boardId: string;
  roomId: string;
};

export function UILayer(props: UILayerProps) {
  // Abilities
  const canLasso = useAbility('lasso', 'apps');

  // UI Store
  const fitApps = useUIStore((state) => state.fitApps);
  const setClearAllMarkers = useUIStore((state) => state.setClearAllMarkers);
  const showUI = useUIStore((state) => state.showUI);
  const selectedApp = useUIStore((state) => state.selectedAppId);

  // Asset store
  const assets = useAssetStore((state) => state.assets);
  // Board store
  const boards = useBoardStore((state) => state.boards);
  const board = boards.find((el) => el._id === props.boardId);
  // Configuration information
  const config = useConfigStore((state) => state.config);
  // Room Store
  const rooms = useRoomStore((state) => state.rooms);
  const room = rooms.find((el) => el._id === props.roomId);
  // Apps
  const apps = useThrottleApps(250);
  const deleteApp = useAppStore((state) => state.delete);

  // Logo
  const logoUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  // Navigation
  const { toHome } = useRouteNav();

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
    // apps.forEach((a) => deleteApp(a._id));
    const ids = apps.map((a) => a._id);
    deleteApp(ids);
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
          if (asset) {
            // Derive the public URL
            const url = apiUrls.assets.getAssetById(asset.data.file);
            // Get the filename for the asset
            const filename = asset.data.originalfilename;
            // if all set, add the file to the zip
            if (url && filename && session) {
              // Download the file contents
              const buffer = await fetch(url).then((r) => r.arrayBuffer());
              // add to zip
              session.file(filename, buffer);
            }
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
    <>
      {/* The Corner SAGE3 Image Bottom Right */}
      <Box position="absolute" bottom="2" right="2" opacity={0.7}>
        <img src={logoUrl} width="75px" alt="sage3 collaborate smarter" draggable={false} />
      </Box>

      {/* Main Button Bottom Left */}
      <Box position="absolute" left="2" bottom="2" zIndex={101} display={showUI ? 'flex' : 'none'}>
        <MainButton
          buttonStyle="solid"
          backToRoom={() => toHome(props.roomId)}
          boardInfo={{
            boardId: props.boardId,
            roomId: props.roomId,
            boardName: board ? board?.data.name : '',
            roomName: room ? room?.data.name : '',
          }}
          config={config}
        />
      </Box>

      {/* Buttons Middle Bottom */}
      {/* <Box position="absolute" left="calc(50% - 110px)" bottom="2" display={showUI ? 'flex' : 'none'}>
        <FunctionButtons boardId={props.boardId} roomId={props.roomId} />
      </Box> */}

      {/* ServerName Top Left */}
      <Box position="absolute" left="1" top="1" display={showUI ? 'flex' : 'none'}>
        <BoardTitle room={room} board={board} config={config} />
      </Box>

      {/* The clock Top Right */}
      <Box position="absolute" right="1" top="1" display={showUI ? 'flex' : 'none'}>
        <Clock isBoard={true} />
      </Box>

      {selectedApp && <AppToolbar></AppToolbar>}

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

      <PluginsPanel boardId={props.boardId} roomId={props.roomId} />

      <KernelsPanel boardId={props.boardId} roomId={props.roomId} />

      <AnnotationsPanel />

      {/* Clear board dialog */}
      <Modal isCentered isOpen={clearIsOpen} onClose={clearOnClose}>
        <ClearBoardModal onClick={onClearConfirm} onClose={clearOnClose} isOpen={clearIsOpen}></ClearBoardModal>
      </Modal>

      <Twilio roomName={props.boardId} connect={twilioConnect} />

      <Controller boardId={props.boardId} roomId={props.roomId} plugins={config ? config.features.plugins : false} />

      {/* Lasso Toolbar that is shown when apps are selected using the lasso tool */}
      {canLasso && <LassoToolbar />}

      {/* Alfred modal dialog */}
      <Alfred boardId={props.boardId} roomId={props.roomId} />

      {/* Presence Follow Component. Doesnt Render Anything */}
      <PresenceFollow />
    </>
  );
}
