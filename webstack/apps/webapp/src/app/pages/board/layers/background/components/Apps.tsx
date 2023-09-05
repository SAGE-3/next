/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useParams } from 'react-router';

import { Box, useToast, Text, Icon } from '@chakra-ui/react';

import { AppError, Applications, AppWindow } from '@sage3/applications/apps';
import { useAppStore, useCursorBoardPosition, useHexColor, useHotkeys, useUIStore } from '@sage3/frontend';

import { initialValues } from '@sage3/applications/initialValues';
import { AppName, AppState } from '@sage3/applications/schema';
import { throttle } from 'throttle-debounce';
import { MdError } from 'react-icons/md';

// Renders all the apps
export function Apps() {
  // Apps Store
  const apps = useAppStore((state) => state.apps);
  const deleteApp = useAppStore((state) => state.delete);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const resetZIndex = useUIStore((state) => state.resetZIndex);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const setScale = useUIStore((state) => state.setScale);
  // Save the previous location and scale when zoming to an application
  const scale = useUIStore((state) => state.scale);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const [previousLocation, setPreviousLocation] = useState({ x: 0, y: 0, s: 1, set: false, app: '' });
  const setSelectedApps = useUIStore((state) => state.setSelectedAppsIds);
  const lassoApps = useUIStore((state) => state.selectedAppsIds);

  const { roomId, boardId } = useParams();
  // Display some notifications
  const toast = useToast();

  const { position } = useCursorBoardPosition();
  const createApp = useAppStore((state) => state.create);

  // Fitapps
  const fitApps = useUIStore((state) => state.fitApps);

  const iconColorAppNotFound = useHexColor('red');

  // Reset the global zIndex when no apps
  useEffect(() => {
    if (apps.length === 0) resetZIndex();
  }, [apps]);

  // Deselect all apps
  useHotkeys('esc', () => {
    setSelectedApp('');
  });

  // This still doesnt work properly
  // But a start
  useHotkeys(
    'ctrl+d,cmd+d',
    () => {
      if (lassoApps.length > 0) {
        // If there are selected apps, delete them
        deleteApp(lassoApps);
        setSelectedApps([]);
      } else if (position && apps.length > 0) {
        // or find the one under the cursor
        const cx = position.x;
        const cy = position.y;
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
              deleteApp(el._id);
            }
          });
      }
    },
    { dependencies: [position.x, position.y, JSON.stringify(apps)] }
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

  // Copy an application into the clipboard
  useHotkeys(
    'c',
    (evt) => {
      evt.preventDefault();
      evt.stopPropagation();

      if (position && apps.length > 0) {
        const cx = position.x;
        const cy = position.y;
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
              navigator.clipboard.writeText(JSON.stringify({ sage3: el }));
              // Notify the user
              toast({
                title: 'Success',
                description: `Application Copied to Clipboard`,
                duration: 2000,
                isClosable: true,
                status: 'success',
              });
            }
          });
      }
    },
    { dependencies: [position.x, position.y, JSON.stringify(apps)] }
  );

  // Throttle the paste function
  const pasteAppThrottle = throttle(500, (position: { x: number; y: number }) => {
    if (position) {
      const cx = position.x;
      const cy = position.y;

      navigator.clipboard.readText().then((data) => {
        try {
          const parsed = JSON.parse(data);
          // Test if sage3 JSON data
          if (parsed.sage3) {
            // Create a new duplicate app
            const type = parsed.sage3.data.type as AppName;
            const size = parsed.sage3.data.size;
            const state = parsed.sage3.data.state;
            // Create the app
            createApp({
              title: type,
              roomId: roomId!,
              boardId: boardId!,
              position: { x: cx, y: cy, z: 0 },
              size: size,
              rotation: { x: 0, y: 0, z: 0 },
              type: type,
              state: { ...(initialValues[type] as AppState), ...state },
              raised: true,
              dragging: false,
            });
          } else {
            console.log('Paste> JSON is not a SAGE3 app');
          }
        } catch (error) {
          console.log('Paste> Error, Not valid json');
        }
      });
    }
  });

  // Keep the throttlefunc reference
  const pasteApp = useCallback(pasteAppThrottle, []);

  // Create a new app from the clipboard
  useHotkeys(
    'v',
    (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      pasteApp(position);
    },
    { dependencies: [position.x, position.y] }
  );

  // Zoom to app when pressing z over an app
  useHotkeys(
    'z',
    (evt) => {
      if (position && apps.length > 0) {
        const cx = position.x;
        const cy = position.y;
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
    { dependencies: [previousLocation.set, position.x, position.y, scale, boardPosition.x, boardPosition.y, JSON.stringify(apps)] }
  );

  return (
    <>
      {/* Apps array */}
      {apps.map((app) => {
        if (app.data.type in Applications) {
          const Component = Applications[app.data.type].AppComponent;
          return (
            // Wrap the components in an errorboundary to protect the board from individual app errors
            <ErrorBoundary
              key={app._id}
              fallbackRender={({ error, resetErrorBoundary }) => (
                <AppError error={error} resetErrorBoundary={resetErrorBoundary} app={app} />
              )}
            >
              <Component key={app._id} {...app}></Component>
            </ErrorBoundary>
          );
        } else {
          // App not found: happens if unkonw app in Database
          const iconSize = Math.min(500, Math.max(40, app.data.size.height - 200));
          const fontSize = 15 + app.data.size.height / 100;
          return (
            <AppWindow key={app._id} app={app}>
              <Box
                display="flex"
                flexDir={'column'}
                justifyContent={'center'}
                alignItems={'center'}
                style={{ width: app.data.size.width + 'px', height: app.data.size.height + 'px' }}
              >
                <Icon fontSize={`${iconSize}px`} color={iconColorAppNotFound}>
                  <MdError size={'xl'}></MdError>
                </Icon>
                <Text fontWeight={'bold'} fontSize={fontSize} align={'center'}>
                  Application '{app.data.type}' was not found.
                </Text>
              </Box>
            </AppWindow>
          );
        }
      })}
    </>
  );
}
