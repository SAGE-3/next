/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, useDragControls } from 'framer-motion';
import {
  Box,
  Button,
  HStack,
  Menu,
  MenuGroup,
  MenuItem,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { useToast } from '@chakra-ui/react';

import * as mime from 'mime';

import axios from 'axios';

import * as AppMetadata from '@sage3/app-metadata';
import { SAGE3State, AppState, StateUpdate, PanZoomState, AppMetadata as AppMetadataType, AppExport, AppAction } from '@sage3/shared/types';
import { getDataTypes, getDataTypeList } from '@sage3/shared/data-matcher';
import {
  UserCursors,
  UploadAppSelectorProps,
  UploadAppSelector,
  UploadConfiguration,
  AssetDescription,
  PasteHandler,
  UserAvatar,
} from '@sage3/frontend/components';
import { invalidateCacheEntry } from '@sage3/frontend/smart-data/hooks';
import { useCursor, usePanZoom, useAction, GetConfiguration, PanZoomAction } from '@sage3/frontend/services';
import { LoadingProgressContext } from '@sage3/frontend/components';

import { PermissionProvider } from './AppProviders';
import { Window } from '../../components/Window/Window';
import { MenuBar } from '../../components/MenuBar';
import { Minimap } from '../../components/Minimap';
import { DragOverlay } from '../../components/DragOverlay';

import './app.scss';
import { UserIcons } from '../../components/UserIcons';

import { useSocket } from '@sage3/frontend/utils/misc/socket';
import { processContentURL, humanFileSize } from '@sage3/frontend/utils/misc';

import { HotkeysEvent } from 'hotkeys-js';
import { AlfredComponent, useHotkeys } from '../../hooks/useHotkeys';
import { AppControls } from '../../components/Window/AppControls';

import * as Apps from '@sage3/applications';
import { AppPositionMotion } from '../../components/Window/useAppPosition';
import { boardBgColor, boardColor, boardGridColor, localMenuColor, boardBgSize } from '@sage3/frontend/ui';
import { InfoMenuBar } from '../../components/InfoMenuBar';
import HideMenu from 'libs/frontend/components/src/lib/hide-menu/hide-menu';
import { useHideMenu } from 'libs/frontend/components/src/lib/hide-menu/useHideMenu';
import ContextMenu from 'libs/frontend/components/src/lib/context-menu/context-menu';
const APPS = Apps as Record<keyof typeof Apps, AppExport>;

// Define extra MIME type for python notebooks
mime.define({
  'application/x-ipynb+json': ['ipynb'],
});

/**
 * The Board component
 * @returns JSX.Element
 */
export const Board = (): JSX.Element => {
  const socket = useSocket();
  const wallRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const boardId = params.boardId as string;
  const { state, connectionStatus } = useSAGE3State(boardId);
  const [boardName, setBoardName] = useState('');
  const [canvasSize, setCanvasSize] = useState({ width: 8192, height: 4608 });
  const [panZoomState, dispatchPanZoom] = usePanZoom(canvasSize);
  const cursorTargetRef = useRef<HTMLDivElement>(null);
  const [scaleBy, setScaleBy] = useState<number>(2);
  const [serverName, setServerName] = useState<string>('');
  const [token, setToken] = useState<string>('');

  const cursorUpdate = useCursor(panZoomState, cursorTargetRef);

  const dragControls = useDragControls();
  const dragTarget = useRef<HTMLDivElement>(null);

  // Colors for the board
  const bgColor = boardBgColor();
  const bColor = boardColor();
  const gColor = boardGridColor();
  const gridSize = boardBgSize();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const menuState = useHideMenu();

  const [dragInfo, setDragging] = useState<string[]>([]);
  const [filesToConfigure, setFilesToConfigure] = useState<UploadAppSelectorProps['files']>([]);

  //Used to get cursor position onDrop event in the dragOverlay component
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const FilesToConfigureCallback = useCallback(() => {
    setFilesToConfigure([]);
  }, [filesToConfigure]);

  const UploadCallback = useCallback(
    (configs: UploadConfiguration[]) => {
      const cascadeOffset = 60;
      // Get cursor position
      const cursorx = mousePosition.x / panZoomState.motionScale.get() - panZoomState.motionX.get();
      const cursory = mousePosition.y / panZoomState.motionScale.get() - panZoomState.motionY.get();
      // Horizontal offset for each successive file
      let xdrop = cursorx;
      // Vertical offset for the title bar
      let ydrop = cursory + scaleBy * 1 * 16; // 16 -> 1 rem
      for (let index = 0; index < configs.length; index++) {
        const config = configs[index];
        const isFileUpload = config.files.every((file) => file instanceof File);
        const isAssetOpen = config.files.every((file) => !(file instanceof File));

        if (config.files.length) {
          if (isFileUpload) {
            const fd = new FormData();
            // if no app name, is upload-only
            if (config.appName) {
              // Default width of the application
              const wOffset = AppMetadata[config.appName as keyof typeof AppMetadata].initialSize.width;
              const hOffset = AppMetadata[config.appName as keyof typeof AppMetadata].initialSize.height;
              // Start to offset the applications after the first one
              if (index > 0) xdrop += wOffset + 15;
              // check if it gets out of the board
              if ((xdrop + wOffset) > canvasSize.width) {
                // reset the drop position below
                xdrop = cursorx;
                ydrop += hOffset + 15;
              }
              fd.append('targetX', xdrop.toString());
              fd.append('targetY', ydrop.toString());
              fd.append('appName', config.appName);
            }

            fd.append('boardId', boardId);

            for (const file of config.files) {
              if (file instanceof File) {
                fd.append('files', file);
              }
            }

            axios
              .post('/api/boards/upload', fd, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: function (evt) {
                  if (evt.lengthComputable) {
                    const percentCompleted = Math.round((evt.loaded * 100) / evt.total);
                    setProgressValue(percentCompleted);
                  }
                },
              })
              .then((response) => {
                console.log('Upload> done ', response.status, response.statusText);
                setProgressValue(0);
              })
              .catch((error) => {
                if (!error.response.data.authentication) document.location.href = '/';
              });
          } else if (isAssetOpen) {
            const payload: {
              targetX?: number;
              targetY?: number;
              appName?: string;
              boardId: string;
              files: { originalname: string; filename: string; mimetype: string; id: string }[];
            } = {
              files: (config.files as AssetDescription[]).map((file) => ({
                originalname: file.name,
                filename: file.name,
                mimetype: file.type,
                id: file.id,
              })),
              boardId,
            };

            if (config.appName) {
              let wOffset = 200;
              let hOffset = 200;
              try {
                wOffset = AppMetadata[config.appName as keyof typeof AppMetadata].initialSize.width / 2;
                hOffset = AppMetadata[config.appName as keyof typeof AppMetadata].initialSize.height / 2 + 30;
              } catch (e) {
                console.trace(e);
              }
              const screenCenter = {
                x: panZoomState.motionX.get() - window.innerWidth / panZoomState.motionScale.get() / 2 + wOffset,
                y: panZoomState.motionY.get() - window.innerHeight / panZoomState.motionScale.get() / 2 + hOffset,
              };
              screenCenter.x = Math.max(0, Math.min(canvasSize.width - wOffset * 2, -screenCenter.x));
              screenCenter.y = Math.max(24, Math.min(canvasSize.height - hOffset * 2, -screenCenter.y)); // 24 is space for the Window title bar

              const position = {
                x: screenCenter.x + cascadeOffset * (index - configs.length / 2),
                y: screenCenter.y + cascadeOffset * (index - configs.length / 2),
              };

              payload.targetX = position.x;
              payload.targetY = position.y;
              payload.appName = config.appName;
            }

            axios.post('/api/boards/open-files', payload).catch((error) => {
              if (!error.response.data.authentication) document.location.href = '/';
            });
          }
        }
      }
    },
    [panZoomState, panZoomState, canvasSize, mousePosition]
  );

  const [panzoomToggle, setPanzoomToggle] = useState(false);

  // Handle to create applications
  const { act } = useAction();

  const toast = useToast();

  const GetPanZoomState = useCallback(() => {
    return { x: panZoomState.motionX.get(), y: panZoomState.motionY.get(), scale: panZoomState.motionScale.get() };
  }, [panZoomState]);

  // Retrieve the name of the server to display in the page
  useEffect(() => {
    GetConfiguration().then((conf) => {
      if (conf.serverName) setServerName(conf.serverName);
      if (conf.token) setToken(conf.token);
    });

    // If using Electron client
    if (isElectron()) {
      // Load electron and the IPCRender
      const electron = window.require('electron');
      const ipcRenderer = electron.ipcRenderer;
      // on 'download' message from the main process, show a notification
      ipcRenderer.on('download', (event: any, arg: any) => {
        // build a toast showing file name and file size
        toast({
          id: 'download',
          title: 'File downloaded: ' + arg.filename + ' (' + humanFileSize(arg.bytes) + ')',
          status: 'success',
          duration: 2500,
          isClosable: true,
        });
      });
    }
  }, []);

  // Sets the board info
  useEffect(() => {
    // Get board infos
    axios
      .get('/api/boards')
      .then((res) => {
        for (let i = 0; i < res.data.boards.length; i++) {
          if (res.data.boards[i].id === boardId) {
            const bb = res.data.boards[i];
            setBoardName(bb.name);
            // Update the size of the board
            setCanvasSize({ width: bb.width, height: bb.height });
            // change the page title
            document.title = `SAGE3 - ${res.data.boards[i].name}`;
            // Scale title bars
            if (bb.scaleBy) {
              setScaleBy(bb.scaleBy);
            }
          }
        }
      })
      .catch((error) => {
        if (!error.response.data.authentication) document.location.href = '/';
      });
  }, [boardId]);

  // Listens to updates on boards
  useEffect(() => {
    function boardsUpdate(update: any) {
      for (let i = 0; i < update.boards.length; i++) {
        if (update.boards[i].id === boardId) {
          const bb = update.boards[i];
          setBoardName(bb.name);
          // Update the size of the board
          setCanvasSize({ width: bb.width, height: bb.height });
          // change the page title
          document.title = `SAGE3 - ${update.boards[i].name}`;
          // Scale title bars
          if (bb.scaleBy) {
            setScaleBy(bb.scaleBy);
          }
        }
      }
    }
    socket.on('boards-update', boardsUpdate);

    return () => {
      socket.off('boards-update', boardsUpdate);
    };
  }, [socket, boardId]);

  // Reset initila zoom when the canvas size changes
  useEffect(() => {
    // Center view on entire board when first entering the board
    dispatchPanZoom({ type: 'fit-apps', appPositions: [{ x: 0, y: 0, width: canvasSize.width, height: canvasSize.height }] });
  }, [dispatchPanZoom, canvasSize.width, canvasSize.height]);

  const { toggleAllMenus } = useHideMenu();

  // Remote Wall Control Messages
  useEffect(() => {
    const newRemoteWallMessage = (newData: any) => {
      const type = newData.type;
      const data = newData.data;
      switch (type) {
        case 'zoom-in':
          dispatchPanZoom({ type: 'zoom-in', delta: data.delta });
          break;
        case 'zoom-out':
          dispatchPanZoom({ type: 'zoom-out', delta: data.delta });
          break;
        case 'fit-apps':
          if (Object.keys(state.apps).length > 0) {
            dispatchPanZoom({ type: 'fit-apps', appPositions: Object.values(state.apps).map((el) => el.position) });
          }
          break;
        case 'fit-board':
          dispatchPanZoom({ type: 'fit-board' });
          break;
        case 'new-view': {
          const x = -data.x;
          const y = -data.y;
          const zoomValue = data.zoom;
          dispatchPanZoom({ type: 'zoom-set', zoomValue });
          dispatchPanZoom({ type: 'translate-to', position: { x, y } });
          break;
        }
        case 'shift-up': {
          dispatchPanZoom({ type: 'translate', delta: { x: 0, y: 10 } });
          break;
        }
        case 'shift-down': {
          dispatchPanZoom({ type: 'translate', delta: { x: 0, y: -10 } });
          break;
        }
        case 'shift-left': {
          dispatchPanZoom({ type: 'translate', delta: { x: 10, y: 0 } });
          break;
        }
        case 'shift-right': {
          dispatchPanZoom({ type: 'translate', delta: { x: -10, y: 0 } });
          break;
        }
        case 'hide-menus': {
          toggleAllMenus(false);
          break;
        }
        case 'show-menus': {
          toggleAllMenus(true);
          break;
        }
      }
      cursorUpdate.update();
    };

    socket.on('remotewall-newview', newRemoteWallMessage);
    return () => {
      socket.off('remotewall-newview', newRemoteWallMessage);
    };
  }, [dispatchPanZoom, cursorUpdate, socket]);

  //
  // App Shortcuts
  //

  // Stickies Shortcut
  useHotkeys(
    'shift+s',
    (ke: KeyboardEvent, he: HotkeysEvent): void | boolean => {
      const x = -cursorUpdate.cursor.x;
      const y = -cursorUpdate.cursor.y;
      act({
        type: 'create',
        appName: 'stickies',
        id: '',
        position: { x, y },
      });
      // Returning false stops the event and prevents default browser events
      return false;
      // Depends on the cursor to get the correct position
    },
    { dependencies: [cursorUpdate] }
  );

  // Cell Shortcut
  useHotkeys(
    'shift+c',
    (ke: KeyboardEvent, he: HotkeysEvent): void | boolean => {
      const x = -cursorUpdate.cursor.x;
      const y = -cursorUpdate.cursor.y;
      act({
        type: 'create',
        appName: 'sagecell',
        id: '',
        position: { x, y },
      });
      return false;
    },
    { dependencies: [cursorUpdate] }
  );
  // Alfred quick bar
  const alfredAction = useCallback(
    (term: string) => {
      // Calculate location to create
      const x = panZoomState.motionX.get() - window.innerWidth / panZoomState.motionScale.get() / 2;
      const y = panZoomState.motionY.get() - window.innerHeight / panZoomState.motionScale.get() / 2;
      // Decompose the search
      const terms = term.split(' ');
      if (terms[0] === 'w' || terms[0] === 'web' || terms[0] === 'webview') {
        let loc = terms[1];
        if (!loc.startsWith('http://') && !loc.startsWith('https://')) {
          loc = 'https://' + loc;
        }
        act({
          type: 'create',
          appName: 'webview',
          id: '',
          position: { x: -x, y: -y },
          optionalData: {
            address: {
              history: [processContentURL(loc)],
              historyIdx: 0,
            },
            visual: {
              zoom: 1.0,
              scrollX: 0,
              scrollY: 0,
            },
          },
        });
      } else if (terms[0] === 'g' || terms[0] === 'goo' || terms[0] === 'google') {
        const rest = terms.slice(1).join('+');
        const searchURL = 'https://www.google.com/search?q=' + rest;
        act({
          type: 'create',
          appName: 'webview',
          id: '',
          position: { x: -x, y: -y },
          optionalData: {
            address: {
              history: [processContentURL(searchURL)],
              historyIdx: 0,
            },
            visual: {
              zoom: 1.0,
              scrollX: 0,
              scrollY: 0,
            },
          },
        });
      } else if (terms[0] === 's' || terms[0] === 'n' || terms[0] === 'stick' || terms[0] === 'stickie' || terms[0] === 'note') {
        const content = terms.slice(1).join(' ');
        act({
          type: 'create',
          appName: 'stickies',
          id: '',
          position: { x: -x, y: -y },
          optionalData: { value: { text: content, color: '#ffff97' } },
        });
      } else if (terms[0] === 'c' || terms[0] === 'cell') {
        act({
          type: 'create',
          appName: 'sagecell',
          id: '',
          position: { x: -x, y: -y },
        });
      } else if (terms[0] === 'showui') {
        // Show all the UI elements
        toggleAllMenus(true);
      } else if (terms[0] === 'hideui') {
        // Hide all the UI elements
        toggleAllMenus(false);
      } else if (terms[0] === 'clear' || terms[0] === 'closeall') {
        if (state && state.apps) {
          const actions = [] as AppAction[keyof AppAction][];
          Object.values(state.apps).forEach((app: AppState) => {
            actions.push({ type: 'close', id: app.id });
          });
          act(actions);
        }
      }
    },
    [state.apps]
  );

  // PanZoom with spacebar down to cover all apps now
  useHotkeys(
    'space',
    (ke: KeyboardEvent, he: HotkeysEvent) => {
      if (ke.type === 'keydown') {
        setPanzoomToggle(true);
      } else if (ke.type === 'keyup') {
        setPanzoomToggle(false);
      }
    },
    { keyup: true }
  );

  // Selected App
  const [selectedApp, setselectedApp] = useState<{ id: string; appPosition: AppPositionMotion } | null>(null);
  const [deselectAppClick, setDeselectAppClick] = useState(false);
  // Check to see if the app still exists. If it doesnt exist remove the control bar
  useEffect(() => {
    if (selectedApp == null) return;
    if (Object.keys(state.apps).indexOf(selectedApp.id) === -1) {
      setselectedApp(null);
    }
  }, [state]);

  // Callback for when an app is clicked
  const appClicked = useCallback((id: string, appPosition: any) => {
    setselectedApp({ id, appPosition });
  }, []);

  // Upload progress value
  const [progressValue, setProgressValue] = useState(0);
  useEffect(() => {
    if (progressValue === 100) {
      // to close the modal window
      setFilesToConfigure([]);
    }
  }, [progressValue]);

  // handle dispatchPanZoom to check if board is locked
  const dispatchPanZoomHandler = (action: PanZoomAction) => {
    if (panZoomState.isLocked) {
      // if locked, display toast
      toast({
        title: `The board view is currently locked.`,
        status: 'error',
        position: 'top',
        duration: 2 * 1000,
        isClosable: true,
      });
    } else {
      dispatchPanZoom(action);
    }
  };

  return (
    <PermissionProvider>
      {/* This marks the start of the whole "board", inclusive of menus*/}
      {/* But, not inclusive of the popups and modal-like visuals */}
      <Box
        bg={bgColor}
        position="absolute"
        w="full"
        h="full"
        id="board"
        left="0"
        top="0"
        right="0"
        bottom="0"
        ref={wallRef}
        userSelect="none"
        onMouseDown={() => setDeselectAppClick(true)}
        onMouseUp={() => {
          if (deselectAppClick) setselectedApp(null);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const dataTypeList = getDataTypeList();
          // Drag/Drop files
          if (event.dataTransfer.types.includes('Files')) {
            const extensions = Array.from(event.dataTransfer.items)
              .filter(({ kind, type }) => kind === 'file')
              .map(({ type }) => {
                return mime.getExtension(type);
              });

            if (extensions.length) {
              setDragging(getDataTypes(extensions.map((ext) => ({ filename: `file.${ext}` }))));
            }
          } else if (event.dataTransfer.types.every((type) => dataTypeList[type as keyof typeof dataTypeList])) {
            setDragging(event.dataTransfer.types as string[]);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();

          // Drag/Drop a URL
          if (event.dataTransfer.types.includes('text/uri-list')) {
            const pastedText = event.dataTransfer.getData('Url');
            // Calculate center location to create
            // const x = panZoomState.motionX.get() - window.innerWidth / panZoomState.motionScale.get() / 2;
            // const y = panZoomState.motionY.get() - window.innerHeight / panZoomState.motionScale.get() / 2;

            // Calculate cursor position
            const cursorx = event.clientX / panZoomState.motionScale.get() - panZoomState.motionX.get();
            const cursory = event.clientY / panZoomState.motionScale.get() - panZoomState.motionY.get();

            act({
              type: 'create',
              appName: 'webview',
              id: '',
              position: { x: cursorx, y: cursory },
              optionalData: {
                address: {
                  history: [processContentURL(pastedText)],
                  historyIdx: 0,
                },
                visual: {
                  zoom: 1.0,
                  scrollX: 0,
                  scrollY: 0,
                },
              },
            });
          }
        }}
        /*
        onPaste events only work with input nodes, by nature they also propagate up.
        Stop the paste even propagation here. This should apply to any in app text paste.
        Then let the paste-handler component evaluate if should make an app.
        That occurs at the page body level.
        */
        onPaste={(event) => {
          event.stopPropagation();
        }}
      >
        <motion.div
          ref={cursorTargetRef}
          initial={false}
          drag={!panZoomState.isLocked}
          dragMomentum={false}
          dragElastic={0}
          dragControls={dragControls}
          dragListener={false}
          transformTemplate={({ scale, x, y }) => `scale(${scale}) translateX(${x}) translateY(${y})`}
          style={{
            originX: 0,
            originY: 0,
            scale: panZoomState.motionScale,
            x: panZoomState.motionX,
            y: panZoomState.motionY,
          }}
          onDragStart={() => {
            setDeselectAppClick(false);
            dispatchPanZoom({ type: 'pan-start' });
          }}
          onDragEnd={() => dispatchPanZoom({ type: 'pan-end' })}
          onDrag={(evt, info) => {
            const dX = info.offset.x / panZoomState.motionScale.get();
            const dY = info.offset.y / panZoomState.motionScale.get();
            dispatchPanZoom({ type: 'pan', delta: { x: dX, y: dY } });

            // if (info.velocity.x !== 0 || info.velocity.y !== 0) {
            //   // if moving, set the panZoomState to the new position
            //   const dX = info.offset.x / panZoomState.motionScale.get();
            //   const dY = info.offset.y / panZoomState.motionScale.get();
            //   dispatchPanZoom({ type: 'pan', delta: { x: dX, y: dY } });
            // }
          }}
          onWheel={(evt) => {
            if (evt.target === dragTarget.current) {
              // Alt + wheel : Zoom
              if ((evt.altKey || evt.ctrlKey || evt.metaKey) && evt.buttons === 0) {
                const cursor = {
                  x: evt.clientX,
                  y: evt.clientY,
                };
                if (evt.deltaY < 0) {
                  dispatchPanZoom({ type: 'zoom-in', cursor, delta: evt.deltaY });
                } else if (evt.deltaY > 0) {
                  dispatchPanZoom({ type: 'zoom-out', cursor, delta: evt.deltaY });
                }
              } else {
                // Pan up and down, with shift left/right
                // and 2-finger drag
                let dX = evt.deltaX;
                let dY = evt.deltaY;
                if (evt.shiftKey && dX === 0) {
                  // horizontal scroll on Windows: test the shift key
                  dX = dY;
                  dY = 0;
                }
                dispatchPanZoom({ type: 'pan-start' });
                dispatchPanZoom({ type: 'pan', delta: { x: -dX, y: -dY } });
                dispatchPanZoom({ type: 'pan-end' });
              }
            }
          }}
        >
          <motion.div
            ref={dragTarget}
            className="board"
            id="board"
            onTapStart={(event) => {
              setDeselectAppClick(true);
              if (panZoomState.isLocked) return;
              dragControls.start(event);
            }}
            // change the cursor during dragging
            whileTap={{
              cursor: 'grabbing',
            }}
            whileHover={{
              cursor: 'grab',
            }}
            style={{
              backgroundColor: bColor,
              ...canvasSize,
              left: 0,
              top: 0,
              position: 'absolute',
              border: '2px solid #888',
              backgroundImage: gColor,
              backgroundRepeat: 'repeat',
              backgroundSize: gridSize,
            }}
          />

          {state?.apps &&
            Object.values(state.apps).map((app: AppState) => (
              <Window
                key={app.id}
                app={app}
                scaleBy={scaleBy}
                zoomState={GetPanZoomState}
                canvasSize={canvasSize}
                onClick={appClicked}
                selected={selectedApp && app.id === selectedApp.id ? true : false}
                panzoomEnabled={panzoomToggle}
              />
            ))}

          <UserCursors width={canvasSize.width} scaleBy={scaleBy} height={canvasSize.height} boardId={boardId} />
        </motion.div>
      </Box>

      {/* App Controls 
        Check to see if selectedApp is set and then check to see if app still exists
      */}
      {selectedApp && state.apps[selectedApp.id] ? (
        <ControlBar
          app={state.apps[selectedApp.id]}
          canvasSize={canvasSize}
          scaleBy={scaleBy}
          appPosition={selectedApp.appPosition}
        ></ControlBar>
      ) : null}

      {/* Visuals to show when something is dragged over the board
         Note: visibility triggered by above ondrag for files */}
      <DragOverlay
        isOpen={dragInfo.length > 0}
        dragInfo={dragInfo}
        close={() => setDragging([])}
        onConfigureDrop={setFilesToConfigure}
        zoomState={panZoomState}
        apps={state.apps}
        setMousePos={setMousePosition}
      />

      <ContextMenu divId="board">
        <Menu>
          <MenuGroup>
            <MenuItem className="contextMenuItem" onClick={() => dispatchPanZoomHandler({ type: 'fit-board' })}>
              Fit View to Board
            </MenuItem>
            <MenuItem
              className="contextMenuItem"
              onClick={(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                // Check if there are no apps
                if (Object.values(state.apps).length > 0 && event.button === 0) {
                  dispatchPanZoomHandler({ type: 'fit-apps', appPositions: Object.values(state.apps).map((el) => el.position) });
                }
              }}
            >
              Show all Apps{' '}
            </MenuItem>
            <MenuItem className="contextMenuItem" onClick={() => menuState.toggleAllMenus(true)}>
              Show UI
            </MenuItem>
            <MenuItem className="contextMenuItem" onClick={() => menuState.toggleAllMenus(false)}>
              Hide UI
            </MenuItem>

            <MenuItem className="contextMenuItem" onClick={onOpen}>
              Clear Board
            </MenuItem>

            <MenuItem
              className="contextMenuItem"
              onClick={() => {
                // Open a webview into the SAGE3 builtin Jupyter instance
                act({
                  type: 'create',
                  appName: 'webview',
                  id: '',
                  position: { x: -cursorUpdate.cursor.x, y: -cursorUpdate.cursor.y, width: 900, height: 800 },
                  optionalData: {
                    address: {
                      history: ['http://' + window.location.hostname + ':8888/tree/?token=' + token],
                      historyIdx: 0,
                    },
                    visual: { zoom: 1.0, scrollX: 0, scrollY: 0 },
                  },
                });
              }}
            >
              Open Jupyter
            </MenuItem>
          </MenuGroup>
        </Menu>
      </ContextMenu>

      {/* Menu Bar */}
      <MenuBar appList={state.appList} apps={state.apps} boardId={boardId} boardName={boardName} canvasSize={canvasSize} />

      {/* Info Menu Bar */}
      <InfoMenuBar boardName={boardName} serverName={serverName} />

      {/* The overview minimap */}
      <Minimap apps={state.apps} canvasSize={canvasSize} boardId={boardId} />

      <Modal isCentered isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Clear the Board</ModalHeader>
          {/* <ModalCloseButton /> */}
          <ModalBody>Are you sure you want to DELETE all apps?</ModalBody>

          <ModalFooter>
            <Button colorScheme="teal" size="md" variant="outline" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              size="md"
              onClick={() => {
                if (state.apps) {
                  const actions = [] as AppAction[keyof AppAction][];
                  Object.values(state.apps).forEach((app: AppState) => {
                    actions.push({ type: 'close', id: app.id });
                  });
                  act(actions);
                }
                onClose();
              }}
            >
              Yes, Clear the Board
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Board connection status */}
      <Box
        bg="blackAlpha.700"
        position="absolute"
        w="full"
        h="full"
        left="0"
        top="0"
        right="0"
        bottom="0"
        opacity={state && connectionStatus === 'connected' ? 0 : 1}
        pointerEvents={state && connectionStatus === 'connected' ? 'none' : 'all'}
      >
        <Box
          position="absolute"
          left="50%"
          top="30%"
          transform="translate(-50%, -50%)"
          rounded="lg"
          shadow="2xl"
          bg="white"
          p={8}
          fontSize="3xl"
          textAlign="center"
          borderWidth="8px"
          textColor="gray.800"
          borderColor={`${connectionStatus === 'connecting' ? 'blue' : 'red'}.300`}
        >
          Communication Status
          <Text fontWeight="semibold">{(!state && 'Board Not Found') || '"' + connectionStatus + '"'}</Text>
          <Text>Will reconnect automatically</Text>
        </Box>
      </Box>

      {/* Component to show options after a file upload */}
      <LoadingProgressContext.Provider value={{ value: progressValue, setProgressValue: setProgressValue }}>
        <UploadAppSelector files={filesToConfigure} onUpload={UploadCallback} onCancelUpload={FilesToConfigureCallback} />
      </LoadingProgressContext.Provider>
      <HideMenu menuName="Avatar Menu" menuPosition="topRight" buttonSize="xs">
        <Box
          fontSize="large"
          background={localMenuColor()}
          zIndex="sticky"
          shadow="md"
          border="gray 2px solid"
          borderRadius="md"
          px={1}
          py={1}
          pl={'0.5rem'}
        >
          <HStack>
            {/* User Presence */}
            <UserIcons boardId={boardId} canvasSize={canvasSize} apps={state.apps} />

            {/* Your own avatar */}
            <UserAvatar></UserAvatar>
          </HStack>
        </Box>
      </HideMenu>
      {/* Add handling for paste events while providing board information */}
      <PasteHandler />

      {/* Alfred modal dialog */}
      <AlfredComponent onAction={alfredAction} />
    </PermissionProvider>
  );
};

function useSAGE3State(boardId: string | null = null): { state: SAGE3State; connectionStatus: string } {
  const [state, setState] = useState<SAGE3State>({ apps: {}, appList: [], zIndex: 0 });
  const socket = useSocket();
  const [connected, setStatus] = useState(socket.connected);

  useEffect(() => {
    console.log('SAGE3STATE> Subcribing to board updates');

    socket.emit('board-connect', { boardId });

    socket.on('connect', () => {
      console.log('useSAGE3State> connect');
      setStatus(socket.connected);
    });

    socket.on('disconnect', () => {
      console.log('useSAGE3State> disconnect');
      setStatus(socket.connected);
    });

    socket.on('connect_error', () => {
      console.log('useSAGE3State> connect_error');
    });
    socket.on('connect_timeout', () => {
      console.log('useSAGE3State> connect_timeout');
    });
    socket.on('reconnect', (e: number) => {
      console.log('useSAGE3State> reconnected after', e, 'count(s)');
    });
    socket.on('reconnect_attempt', (e: number) => {
      console.log('useSAGE3State> reconnect_attempt', e, 'count(s)');
    });
    socket.on('reconnecting', (e: number) => {
      console.log('useSAGE3State> reconnecting', e, 'attempt(s)');
    });
    socket.on('reconnect_error', () => {
      console.log('useSAGE3State> reconnect_error');
    });
    socket.on('reconnect_failed', () => {
      console.log('useSAGE3State> reconnect_failed');
    });

    function newData({ state: stateUpdate, updates }: StateUpdate) {
      if (updates.data) {
        for (const reference in updates.data) {
          invalidateCacheEntry(reference);
        }
      }
      const newState = { ...stateUpdate };

      // Just set the new state
      setState(newState);
    }

    socket.on('data', newData);

    return () => {
      console.log('SAGE3BoardState> Unsubcribing from board updates');
      socket.off('data', newData);
      socket.emit('board-disconnect', { boardId });
    };
  }, [boardId, socket, connected]);

  return {
    state,
    connectionStatus: connected ? 'connected' : 'disconnected',
  };
}

function ControlBar(props: { app: AppState; canvasSize: { width: number; height: number }; scaleBy: number; appPosition: any }) {
  const { Controls, __meta__ } = APPS[props.app.appName as keyof typeof APPS];
  return (
    <AppControls canvasSize={props.canvasSize} scaleBy={props.scaleBy} appPosition={props.appPosition} {...props.app}>
      {Controls ? <Controls {...props.app} __meta__={__meta__} /> : null}
    </AppControls>
  );
}

/**
 * Check if browser is Electron based on the userAgent.
 * NOTE: this does a require check, UNLIKE web view app.
 *
 * @returns true or false.
 */
function isElectron() {
  const w = window as any; // eslint-disable-line
  return typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.includes('Electron') && w.require;
}
