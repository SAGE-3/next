/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useParams } from 'react-router';
import { throttle } from 'throttle-debounce';

import { Box, useToast, Text, Icon } from '@chakra-ui/react';
import { MdError } from 'react-icons/md';

import { AppError, Applications, AppWindow } from '@sage3/applications/apps';
import {
  useAppStore,
  useCursorBoardPosition,
  useHexColor,
  useHotkeys,
  useThrottleScale,
  useThrottleApps,
  useUIStore,
  useUserSettings,
} from '@sage3/frontend';

import { initialValues } from '@sage3/applications/initialValues';
import { App, AppName, AppSchema, AppState } from '@sage3/applications/schema';

// Renders all the apps
export function Apps() {
  // Params
  const { roomId, boardId } = useParams();

  // Apps Store
  const apps = useThrottleApps(250);
  const appsFetched = useAppStore((state) => state.fetched);
  const deleteApp = useAppStore((state) => state.delete);
  const createBatch = useAppStore((state) => state.createBatch);

  // Save the previous location and scale when zoming to an application
  const scale = useThrottleScale(250);
  const [previousLocation, setPreviousLocation] = useState({ x: 0, y: 0, s: 1, set: false, app: '' });

  // UI Store
  const fitAllApps = useUIStore((state) => state.fitAllApps);
  const fitApps = useUIStore((state) => state.fitApps);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const setSelectedApps = useUIStore((state) => state.setSelectedAppsIds);
  const lassoApps = useUIStore((state) => state.selectedAppsIds);
  const appDragging = useUIStore((state) => state.appDragging);
  const resetZIndex = useUIStore((state) => state.resetZIndex);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const setScale = useUIStore((state) => state.setScale);
  const boardSynced = useUIStore((state) => state.boardSynced);

  // Cursor Position
  const { getBoardCursor } = useCursorBoardPosition();

  // Display some notifications
  const toast = useToast();

  // Position board when entering board
  useEffect(() => {
    if (appsFetched) {
      fitAllApps();
    }
  }, [appsFetched]);

  // Reset the global zIndex when no apps
  useEffect(() => {
    if (apps.length === 0) resetZIndex();
  }, [apps]);

  // This still doesnt work properly
  // But a start
  useHotkeys(
    'ctrl+d,cmd+d',
    (evt) => {
      const boardCursor = getBoardCursor();
      if (lassoApps.length > 0) {
        // filter out the pinned apps
        const tobedeleted = apps
          .filter((el) => lassoApps.includes(el._id))
          .filter((el) => !el.data.pinned)
          .map((el) => el._id);
        // If there are selected apps, delete them
        deleteApp(tobedeleted);
        setSelectedApps([]);
      } else if (boardCursor && apps.length > 0) {
        // or find the one under the cursor
        const cx = boardCursor.x;
        const cy = boardCursor.y;
        let found = false;
        // Sort the apps by the last time they were updated to order them correctly
        apps
          .slice()
          .sort((a, b) => b._updatedAt - a._updatedAt)
          .filter((el) => !el.data.pinned)
          .forEach((el) => {
            if (found) return;
            const x1 = el.data.position.x;
            const y1 = el.data.position.y;
            const x2 = x1 + el.data.size.width;
            const y2 = y1 + el.data.size.height;
            // If the cursor is inside the app, delete it. Only delete the top one
            if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
              found = true;
              deleteApp(el._id);
            }
          });
      }
    },
    { dependencies: [JSON.stringify(apps)] }
  );

  // Select all apps
  useHotkeys(
    'ctrl+a,cmd+a',
    () => {
      if (apps.length > 0) {
        setSelectedApps(apps.map((el) => el._id));
      }
    },
    { dependencies: [JSON.stringify(apps)] }
  );

  const { settings, toggleShowUI } = useUserSettings();
  const showUI = settings.showUI;

  // Copy an application into the clipboard
  useHotkeys(
    'c',
    (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      const boardCursor = getBoardCursor();
      if (boardCursor && apps.length > 0) {
        const cx = boardCursor.x;
        const cy = boardCursor.y;

        const selectedappids = useUIStore.getState().savedSelectedAppsIds;
        if (selectedappids.length > 0) {
          // Use selected apps if any or all apps
          const selectedapps = useAppStore.getState().apps.filter((a) => selectedappids.includes(a._id));
          // Put the app data into the clipboard
          if (navigator.clipboard) {
            navigator.clipboard.writeText(JSON.stringify({ sage3: selectedapps }));
            // Notify the user
            toast({
              title: 'Success',
              description: `Applications Copied to Clipboard: ${selectedapps.length}`,
              duration: 2000,
              isClosable: true,
              status: 'success',
            });
          }
        } else {
          let found = false;
          // Sort the apps by the last time they were updated to order them correctly
          apps
            .slice()
            .sort((a, b) => b._updatedAt - a._updatedAt)
            .forEach((el) => {
              if (found) return;
              const x1 = el.data.position.x;
              const y1 = el.data.position.y;
              const x2 = x1 + el.data.size.width;
              const y2 = y1 + el.data.size.height;
              // If the cursor is inside the app, delete it. Only delete the top one
              if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
                found = true;
                // Put the app data into the clipboard
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(JSON.stringify({ sage3: [el] }));
                  // Notify the user
                  toast({
                    title: 'Success',
                    description: `Application Copied to Clipboard`,
                    duration: 2000,
                    isClosable: true,
                    status: 'success',
                  });
                }
              }
            });
          if (!found) {
            // No app under the cursor - clear the clipboard
            navigator.clipboard.writeText('');
          }
        }
      }
    },
    { dependencies: [JSON.stringify(apps)] }
  );

  // Throttle the paste function
  const pasteAppThrottle = throttle(500, (position: { x: number; y: number }) => {
    if (position) {
      const cx = position.x;
      const cy = position.y;

      if (navigator.clipboard) {
        navigator.clipboard.readText().then((data) => {
          try {
            const parsed = JSON.parse(data);
            // Test if sage3 JSON data
            if (parsed.sage3) {
              const batch: AppSchema[] = [];
              const app0 = parsed.sage3[0].data as AppSchema;
              const pos0 = app0.position;
              for (let i = 0; i < parsed.sage3.length; i++) {
                // Get the app data
                const data = parsed.sage3[i].data as AppSchema;
                const type = data.type as AppName;
                const size = data.size;
                const pos = data.position;
                const state = data.state;
                // Create a new duplicate app
                const app: AppSchema = {
                  title: type,
                  roomId: roomId!,
                  boardId: boardId!,
                  // offset the position of the app based on the first app
                  position: { x: cx + (pos.x - pos0.x), y: cy + (pos.y - pos0.y), z: 0 },
                  size: size,
                  rotation: { x: 0, y: 0, z: 0 },
                  type: type,
                  state: { ...(initialValues[type] as AppState), ...state },
                  raised: true,
                  dragging: false,
                  pinned: false,
                };
                batch.push(app);
              }
              createBatch(batch);
            } else {
              console.log('Paste> JSON is not a SAGE3 app');
            }
          } catch (error) {
            console.log('Paste> Error, Not valid json');
          }
        });
      }
    }
  });

  // Keep the throttlefunc reference
  const pasteApp = useCallback(pasteAppThrottle, []);

  // Create a new app from the clipboard
  useHotkeys(
    'v',
    (evt) => {
      const boardCursor = getBoardCursor();

      if (boardSynced) {
        evt.preventDefault();
        evt.stopPropagation();
        pasteApp(boardCursor);
      } else {
        toast({
          title: 'Pasting app while panning or zooming is not supported',
          status: 'warning',
          duration: 2000,
          isClosable: true,
        });
      }
    },
    { dependencies: [] }
  );

  // Zoom to app when pressing z over an app
  useHotkeys(
    'z',
    (evt) => {
      const boardCursor = getBoardCursor();

      if (boardCursor && apps.length > 0 && !appDragging) {
        const cx = boardCursor.x;
        const cy = boardCursor.y;
        let found = false;
        // Sort the apps by the last time they were updated to order them correctly
        apps
          .slice()
          .sort((a, b) => b._updatedAt - a._updatedAt)
          .forEach((el) => {
            if (found) return;
            if (el.data.dragging) return;
            const x1 = el.data.position.x;
            const y1 = el.data.position.y;
            const x2 = x1 + el.data.size.width;
            const y2 = y1 + el.data.size.height;
            // If the cursor is inside the app, delete it. Only delete the top one
            if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
              if (previousLocation.set && previousLocation.app === el._id) {
                // if action is pressed again on the same app, zoom out
                setBoardPosition({ x: previousLocation.x, y: previousLocation.y });
                setScale(previousLocation.s);
                setPreviousLocation((prev) => ({ ...prev, set: false, app: '' }));
              } else {
                found = true;
                fitApps([el]);
                setPreviousLocation((prev) => ({ x: boardPosition.x, y: boardPosition.y, s: scale, set: true, app: el._id }));
              }
            }
          });
        if (!found) {
          if (previousLocation.set) {
            setBoardPosition({ x: previousLocation.x, y: previousLocation.y });
            setScale(previousLocation.s);
            setPreviousLocation((prev) => ({ ...prev, set: false, app: '' }));
          } else {
            // zoom out to show all apps
            fitApps(apps);
          }
        }
      }
    },
    {
      dependencies: [previousLocation.set, appDragging, scale, boardPosition.x, boardPosition.y, JSON.stringify(apps)],
    }
  );

  // Focus to app when pressing f over an app
  useHotkeys(
    'f',
    (evt) => {
      const boardCursor = getBoardCursor();
      if (boardCursor && apps.length > 0 && !appDragging) {
        const cx = boardCursor.x;
        const cy = boardCursor.y;
        let found = false;
        // Sort the apps by the last time they were updated to order them correctly
        apps
          .slice()
          .sort((a, b) => b._updatedAt - a._updatedAt)
          .forEach((el) => {
            if (found) return;
            if (el.data.dragging) return;

            const x1 = el.data.position.x;
            const y1 = el.data.position.y;
            const x2 = x1 + el.data.size.width;
            const y2 = y1 + el.data.size.height;
            // If the cursor is inside the app, focus it.
            if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
              found = true;
              const notAllowedTypes = ['Map', 'VideoViewer', 'Stickie', 'Screenshare'];
              if (!notAllowedTypes.includes(el.data.type)) {
                useUIStore.getState().setFocusedAppId(el._id);
                useUIStore.getState().setSelectedApp('');
                if (showUI) {
                  toggleShowUI();
                }
              }
            }
          });
      }
    },
    {
      dependencies: [previousLocation.set, appDragging, scale, boardPosition.x, boardPosition.y, JSON.stringify(apps)],
    }
  );

  // only re-compute this when `apps` changes
  const appElements = useMemo(() => apps.map((app) => <AppRenderMemo key={app._id} app={app} />), [apps]);

  return <>{appElements}</>;
}

function AppRender(props: { app: App }) {
  const [hasType] = useState(props.app.data.type in Applications);
  const [AppComponent] = useState(() => (hasType ? Applications[props.app.data.type].AppComponent : null));
  const iconSize = Math.min(500, Math.max(40, props.app.data.size.height - 200));
  const fontSize = 15 + props.app.data.size.height / 100;
  const iconColorAppNotFound = useHexColor('red');

  return (
    <>
      {hasType ? (
        // Wrap the components in an errorboundary to protect the board from individual app errors
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <AppError error={error} resetErrorBoundary={resetErrorBoundary} app={props.app} />
          )}
        >
          {AppComponent && <AppComponent {...(props.app as any)}></AppComponent>}
        </ErrorBoundary>
      ) : (
        <AppWindow key={props.app._id} app={props.app}>
          <Box
            display="flex"
            flexDir={'column'}
            justifyContent={'center'}
            alignItems={'center'}
            style={{ width: props.app.data.size.width + 'px', height: props.app.data.size.height + 'px' }}
          >
            <Icon fontSize={`${iconSize}px`} color={iconColorAppNotFound}>
              <MdError size="24px" />
            </Icon>
            <Text fontWeight={'bold'} fontSize={fontSize} align={'center'}>
              Application '{props.app.data.type}' was not found.
            </Text>
          </Box>
        </AppWindow>
      )}
    </>
  );
}

// Memo AppRender Component
const AppRenderMemo = React.memo(AppRender);
