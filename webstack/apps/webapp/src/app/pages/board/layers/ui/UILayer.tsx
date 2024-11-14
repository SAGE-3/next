/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  Box,
  useDisclosure,
  Modal,
  useToast,
  useColorModeValue,
  HStack,
  IconButton,
  Tooltip,
  Divider,
  ButtonGroup,
  Text,
  Button,
  Flex,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from '@chakra-ui/react';
import {
  MdAdd,
  MdApps,
  MdArrowBack,
  MdArrowCircleLeft,
  MdFolder,
  MdLock,
  MdMap,
  MdPeople,
  MdRemove,
  MdRemoveRedEye,
  MdScreenShare,
} from 'react-icons/md';

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
  useHotkeys,
  Alfred,
  HotkeysEvent,
  useUserSettings,
  useHexColor,
  EditVisibilityModal,
  useUser,
  useThrottleScale,
} from '@sage3/frontend';

import {
  BoardContextMenu,
  ClearBoardModal,
  AppToolbar,
  Twilio,
  LassoToolbar,
  PresenceFollow,
  BoardTitle,
  TagsDisplay,
  Interactionbar,
  ScreenshareMenu,
  ToolbarButton,
  ApplicationsMenu,
  NavigationMenu,
  KernelsMenu,
  PluginsMenu,
  UsersMenu,
  AssetsMenu,
} from './components';
import { HiChip, HiPuzzle } from 'react-icons/hi';
import { IoSparklesSharp } from 'react-icons/io5';
import { FaUndo, FaEraser, FaTrash } from 'react-icons/fa';
import { useState } from 'react';
import { SAGEColors } from '@sage3/shared';

type UILayerProps = {
  boardId: string;
  roomId: string;
};

export function UILayer(props: UILayerProps) {
  // Abilities
  const canLasso = useAbility('lasso', 'apps');

  // Settings
  // const { settings, setPrimaryActionMode } = useUserSettings();
  const { settings } = useUserSettings();
  const showUI = settings.showUI;
  // const primaryActionMode = settings.primaryActionMode;

  // Colors
  const tealColorMode = useColorModeValue('teal.500', 'teal.200');
  const teal = useHexColor(tealColorMode);

  // User
  const { user } = useUser();
  const usersColor = user ? user.data.color : 'teal';
  const usersColorMode = useColorModeValue(`${usersColor}.500`, `${usersColor}.300`);
  const userColorHex = useHexColor(user ? usersColorMode : 'teal');

  // Scale
  const scale = useThrottleScale(250);

  // UI Store
  const fitApps = useUIStore((state) => state.fitApps);
  const setClearAllMarkers = useUIStore((state) => state.setClearAllMarkers);
  const selectedApp = useUIStore((state) => state.selectedAppId);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const savedSelectedAppsIds = useUIStore((state) => state.savedSelectedAppsIds);
  const clearSavedSelectedAppsIds = useUIStore((state) => state.clearSavedSelectedAppsIds);
  const setSelectedAppsIds = useUIStore((state) => state.setSelectedAppsIds);
  const resetZoom = useUIStore((state) => state.resetZoom);
  const zoomIn = useUIStore((state) => state.zoomInDelta);
  const zoomOut = useUIStore((state) => state.zoomOutDelta);

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
  const { toHome, back } = useRouteNav();

  // Toast
  const toast = useToast();

  // Clear board modal
  const { isOpen: clearIsOpen, onOpen: clearOnOpen, onClose: clearOnClose } = useDisclosure();

  // Alfred Modal
  const { isOpen: alfredIsOpen, onOpen: alfredOnOpen, onClose: alfredOnClose } = useDisclosure();
  // Presence settings modal
  const { isOpen: visibilityIsOpen, onOpen: visibilityOnOpen, onClose: visibilityOnClose } = useDisclosure();

  // Connect to Twilio only if there are Screenshares or Webcam apps
  const twilioConnect = apps.filter((el) => el.data.type === 'Screenshare').length > 0;

  const handlePresenceSettingsOpen = () => {
    visibilityOnOpen();
  };

  /**
   * Clear the board confirmed
   */
  const onClearConfirm = () => {
    // delete all apps
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
  const downloadRoomAssets = async (ids: string[]) => {
    // Create a ZIP object
    const zip = new JSZip();
    // Generate a filename using date and board name
    const boardName = boards.find((b) => b._id === props.boardId)?.data.name || 'session';
    const prettyDate = formatDate(new Date(), 'yyyy-MM-dd-HH-mm-ss');
    const name = `SAGE3-${boardName.replace(' ', '-')}-${prettyDate}.zip`;
    // Create a folder in the archive
    const session = zip.folder(`SAGE3-${boardName}`);
    // Iterate over all the apps
    await assets.reduce(async (promise, asset) => {
      // wait for the last async function to finish
      await promise;
      // Assets from the room and in the list
      if (asset.data.room === props.roomId && ids.includes(asset._id)) {
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
    }, Promise.resolve());
    // Display a message
    toast({ title: 'Assets Packaged', status: 'info', duration: 4000, isClosable: true });
    // Finish the zip and trigger the download
    zip.generateAsync({ type: 'blob' }).then(function (content) {
      // Create a URL from the blob
      const url = URL.createObjectURL(content);
      // Trigger the download
      downloadFile(url, name);
      toast({ title: 'Download in Progress', status: 'success', duration: 2000, isClosable: true });
    });
  };

  const downloadBoardAssets = async () => {
    // Create a ZIP object
    const zip = new JSZip();
    // Generate a filename using date and board name
    const boardName = boards.find((b) => b._id === props.boardId)?.data.name || 'session';
    const prettyDate = formatDate(new Date(), 'yyyy-MM-dd-HH-mm-ss');
    const name = `SAGE3-${boardName.replace(' ', '-')}-${prettyDate}.zip`;
    // Create a folder in the archive
    const session = zip.folder(`SAGE3-${boardName}`);
    // Iterate over all the apps
    await savedSelectedAppsIds.reduce(async (promise, id) => {
      // wait for the last async function to finish
      await promise;
      const a = apps.find((a) => a._id === id);
      // process the next app with an asset
      if (a && 'assetid' in a.data.state) {
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
      } else if (a && a.data.type === 'Stickie') {
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
    toast({ title: 'Assets Packaged', status: 'info', duration: 4000, isClosable: true });
    // Finish the zip and trigger the download
    zip.generateAsync({ type: 'blob' }).then(function (content) {
      // Create a URL from the blob
      const url = URL.createObjectURL(content);
      //Trigger the download
      downloadFile(url, name);
      toast({ title: 'Download in Progress', status: 'success', duration: 2000, isClosable: true });
    });
  };

  // Deselect all apps when the escape key is pressed
  useHotkeys('esc', () => {
    setSelectedApp('');
    clearSavedSelectedAppsIds();
    setSelectedAppsIds([]);
  });

  // Open Alfred
  useHotkeys('cmd+k,ctrl+k', (ke: KeyboardEvent, he: HotkeysEvent): void | boolean => {
    // Open the window
    alfredOnOpen();
    return false;
  });

  // Redirect the user back to the homepage when clicking the arrow button
  function handleHomeClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    if (event.shiftKey) {
      // Just go back to the previous room
      back();
    } else {
      if (room) {
        // Back to the homepage with the room id
        toHome(room._id);
      } else {
        back();
      }
    }
  }

  return (
    <>
      {/* Presence settings modal dialog */}
      <EditVisibilityModal isOpen={visibilityIsOpen} onClose={visibilityOnClose} />

      {/* The bottom right corner showing the visibility icon when the user decides to hide the UI */}
      <HStack position="absolute" bottom="2" right="2" opacity={1} userSelect={'none'}>
        {!showUI && (
          <Tooltip label={'Visibility'} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
            <IconButton
              borderRadius="md"
              h="auto"
              p={0}
              mx={-2}
              justifyContent="center"
              aria-label={'Presence'}
              icon={<MdRemoveRedEye size="24px" />}
              background={'transparent'}
              colorScheme="gray"
              transition={'all 0.2s'}
              opacity={0.5}
              variant="ghost"
              onClick={handlePresenceSettingsOpen}
              isDisabled={false}
              _hover={{ color: teal, opacity: 1, transform: 'scale(1.15)' }}
            />
          </Tooltip>
        )}
      </HStack>

      {/* Map Buttons Bottom Right */}
      <Box position="absolute" right="2" bottom="2" zIndex={101} display={showUI ? 'flex' : 'none'} borderRadius="md">
        <ButtonGroup isAttached size="xs" gap="0" mr="1">
          <Tooltip label={'Zoom In'}>
            <IconButton
              size="sm"
              icon={<MdAdd />}
              fontSize="lg"
              aria-label={'input-type'}
              onClick={() => zoomIn(10)}
              sx={{
                _dark: {
                  bg: 'gray.600', // 'inherit' didnt seem to work
                },
              }}
            ></IconButton>
          </Tooltip>
          <Tooltip label={'Reset Zoom'}>
            <IconButton
              size="sm"
              aria-label={'input-type'}
              px="1"
              onClick={resetZoom}
              minWidth="45px"
              maxWidth="45px"
              sx={{
                _dark: {
                  bg: 'gray.600', // 'inherit' didnt seem to work
                },
              }}
              icon={<Text>{(scale * 100).toFixed(0)}%</Text>}
            ></IconButton>
          </Tooltip>
          <Tooltip label={'Zoom Out'}>
            <IconButton
              size="sm"
              icon={<MdRemove />}
              fontSize="lg"
              aria-label={'input-type'}
              onClick={() => zoomOut(10)}
              sx={{
                _dark: {
                  bg: 'gray.600', // 'inherit' didnt seem to work
                },
              }}
            ></IconButton>
          </Tooltip>
        </ButtonGroup>
        <ToolbarButton bgColor={usersColor as SAGEColors} icon={<MdMap />} tooltip={'Map'} title={'Map'} offset={[-97, 6]} stayActive>
          <NavigationMenu />
        </ToolbarButton>
      </Box>

      {/* Main Button Bottom Left */}
      <Box position="absolute" left="2" bottom="2" zIndex={101} display={showUI ? 'flex' : 'none'} borderRadius="md">
        <Box display="flex" gap="1">
          <Tooltip label={'Back to Home'} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
            <Button onClick={handleHomeClick} aria-label={''} size="sm" p="0" colorScheme={usersColor} fontSize="lg">
              <MdArrowBack />
            </Button>
          </Tooltip>
          <Divider orientation="vertical" mx="1" />
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
          <Divider orientation="vertical" mx="1" /> <Interactionbar />
          <Divider orientation="vertical" mx="1" />
          <ToolbarButton bgColor={usersColor as SAGEColors} icon={<MdPeople />} tooltip={'Users'} title={'Users'}>
            <UsersMenu boardId={props.boardId} />
          </ToolbarButton>
          <ToolbarButton bgColor={usersColor as SAGEColors} icon={<MdScreenShare />} tooltip={'Screenshares'} title={'Screenshares'}>
            <ScreenshareMenu boardId={props.boardId} roomId={props.roomId} />
          </ToolbarButton>
          <ToolbarButton bgColor={usersColor as SAGEColors} icon={<MdApps />} tooltip={'Applications'} title={'Applications'}>
            {room && board && <ApplicationsMenu roomId={room?._id} boardId={board?._id} />}
          </ToolbarButton>
          <ToolbarButton bgColor={usersColor as SAGEColors} icon={<HiPuzzle />} tooltip={'Plugins'} title={'Plugins'}>
            {room && board && <PluginsMenu roomId={room?._id} boardId={board?._id} />}
          </ToolbarButton>
          <ToolbarButton bgColor={usersColor as SAGEColors} icon={<MdFolder />} tooltip={'Assets'} title={'Assets'} offset={[8, 8]}>
            {room && board && <AssetsMenu roomId={room?._id} boardId={board?._id} downloadRoomAssets={downloadRoomAssets} />}
          </ToolbarButton>
          <ToolbarButton bgColor={usersColor as SAGEColors} icon={<HiChip />} tooltip={'Kernels'} title={'Kernels'}>
            {room && board && <KernelsMenu roomId={room?._id} boardId={board?._id} />}
          </ToolbarButton>
          <Divider orientation="vertical" mx="1" />{' '}
          <ToolbarButton bgColor={'purple'} icon={<IoSparklesSharp />} tooltip={'SAGE Intelligence'} title={'SAGE Intelligence'}>
            <Text>Hello Mr. Anderson.</Text>
          </ToolbarButton>
        </Box>
      </Box>

      {/* Hub-Room-Board Name Top Left */}
      <Box position="absolute" left="1" top="1" display={showUI ? 'initial' : 'none'}>
        <BoardTitle room={room} board={board} config={config} />
      </Box>

      {/* The clock Top Right */}
      <Box position="absolute" right="1" top="1">
        <Clock isBoard={true} />
      </Box>

      {/* App Toolbar to show when the user selects an app */}
      {selectedApp && <AppToolbar boardId={props.boardId} roomId={props.roomId}></AppToolbar>}

      {/* Right click context menu */}
      <ContextMenu divIds={['board', 'lasso', 'whiteboard']}>
        <BoardContextMenu boardId={props.boardId} roomId={props.roomId} clearBoard={clearOnOpen} showAllApps={showAllApps} />
      </ContextMenu>

      {/* Clear board dialog */}
      <Modal isCentered isOpen={clearIsOpen} onClose={clearOnClose}>
        <ClearBoardModal onClick={onClearConfirm} onClose={clearOnClose} isOpen={clearIsOpen}></ClearBoardModal>
      </Modal>

      {/* Twilio connection component */}
      <Twilio roomName={props.boardId} connect={twilioConnect} />

      {/* Lasso Toolbar that is shown when apps are selected using the lasso tool */}
      {canLasso && <LassoToolbar downloadAssets={downloadBoardAssets} />}

      {/* Alfred modal dialog */}
      <Alfred boardId={props.boardId} roomId={props.roomId} isOpen={alfredIsOpen} onClose={alfredOnClose} />

      {/* Presence Follow Component: Does not render anything */}
      <PresenceFollow />

      {/* Display a list of all tags */}
      <Box position="absolute" bottom="50" left="2">
        <TagsDisplay />
      </Box>
    </>
  );
}
