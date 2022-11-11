/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, useColorModeValue, Text, Button, ButtonGroup, Tooltip } from '@chakra-ui/react';
import { useAppStore, useHexColor, useUIStore } from '@sage3/frontend';
import { Applications } from '@sage3/applications/apps';

import { ErrorBoundary } from 'react-error-boundary';
import { MdClose, MdOpenInFull, MdOutlineCloseFullscreen } from 'react-icons/md';

type AppToolbarProps = {};

/**
 * AppToolbar Component
 *
 * @export
 * @param {AppToolbarProps} props
 * @returns
 */
export function AppToolbar(props: AppToolbarProps) {
  // App Store
  const apps = useAppStore((state) => state.apps);
  const deleteApp = useAppStore((state) => state.delete);
  const updateApp = useAppStore((state) => state.update);

  // UI Store
  const selectedApp = useUIStore((state) => state.selectedAppId);

  // Theme
  const background = useColorModeValue('gray.50', 'gray.700');
  const panelBackground = useHexColor(background);

  const textColor = useColorModeValue('gray.800', 'gray.100');
  const commonButtonColors = useColorModeValue('gray.300', 'gray.300');
  const buttonTextColor = useColorModeValue('white', 'black');
  const selectColor = useHexColor('teal');

  // UI store
  const showUI = useUIStore((state) => state.showUI);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const setAppToolbarPosition = useUIStore((state) => state.setAppToolbarPosition);
  const scale = useUIStore((state) => state.scale);
  const boardDragging = useUIStore((state) => state.boardDragging);
  const appDragging = useUIStore((state) => state.appDragging);

  // Position state
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);

  // Apps
  const app = apps.find((app) => app._id === selectedApp);

  useLayoutEffect(() => {
    if (app && boxRef.current) {
      // App Pos and Size
      const ax = app.data.position.x * scale;
      const ay = app.data.position.y * scale;
      const ah = app.data.size.height * scale;
      const aw = app.data.size.width * scale;
      const spacing = 32 * scale; // spacing between app and toolbar
      let aby = ay + ah + spacing; // App Bottom Y

      // Board Pos and Size
      const bx = boardPosition.x * scale;
      const by = boardPosition.y * scale;

      // App Position on Window
      const appXWin = bx + ax;
      const appYWin = by + ay;
      const appBYWin = by + aby; // App Bottom Y on Window

      // Toolbar Width
      const tw = boxRef.current.clientWidth + 6; // Toolbar Width + 6px for borders
      const twhalf = tw / 2;
      const toolbarHeight = 82;

      // Window Size
      const wh = window.innerHeight;
      const ww = window.innerWidth;

      function screenLimit(pos: { x: number; y: number }) {
        // Check if toolbar is out of screen
        if (pos.x < 0) {
          pos.x = 0;
        } else if (pos.x + tw > ww) {
          pos.x = ww - tw;
        }
        if (pos.y < 0) {
          pos.y = 0;
        } else if (pos.y + toolbarHeight > wh) {
          pos.y = wh - toolbarHeight;
        }

        return pos;
      }

      // Default Toolbar Poistion. Middle of screen at bottom
      const defaultPosition = screenLimit({ x: ww / 2 - twhalf, y: wh - toolbarHeight });

      // App Bottom Position
      const appBottomPosition = screenLimit({ x: appXWin + aw / 2 - twhalf, y: appBYWin });

      // App Top Position
      const appTopPosition = screenLimit({ x: appXWin + aw / 2 - twhalf, y: appYWin - toolbarHeight });

      // App is taller than window
      if (ah * 1.2 > wh) {
        setPosition(defaultPosition);
        setAppToolbarPosition(defaultPosition); // Update the UI Store
      }
      // App is off screen
      else if (appXWin > ww || appXWin + aw < 0 || appYWin > wh || appYWin + ah < 0) {
        setPosition(defaultPosition);
        setAppToolbarPosition(defaultPosition);
      }
      // App is close to bottom of the screen
      else if (appBYWin + toolbarHeight > wh) {
        setPosition(appTopPosition);
        setAppToolbarPosition(appTopPosition);
      } else {
        setPosition(appBottomPosition);
        setAppToolbarPosition(appBottomPosition);
      }
    }
  }, [app?.data.position, app?.data.size, scale, boardPosition.x, boardPosition.y, window.innerHeight, window.innerWidth, boardDragging]);

  function getAppToolbar() {
    if (app) {
      const Component = Applications[app.data.type].ToolbarComponent;
      return (
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <>
              <Text whiteSpace="nowrap">An error has occured.</Text>
              <Tooltip placement="top" hasArrow={true} label={'Delete App'} openDelay={400} ml="1">
                <Button onClick={() => deleteApp(app._id)} backgroundColor={commonButtonColors} size="xs" mx="1">
                  <MdClose color={buttonTextColor} />
                </Button>
              </Tooltip>
            </>
          )}
        >
          <>
            <Component key={app._id} {...app}></Component>
            <Tooltip placement="top" hasArrow={true} label={'Delete App'} openDelay={400} ml="1">
              <Button onClick={() => deleteApp(app._id)} backgroundColor={commonButtonColors} size="xs" mx="1">
                <MdClose color={buttonTextColor} />
              </Button>
            </Tooltip>
          </>
        </ErrorBoundary>
      );
    } else {
      return null;
    }
  }

  if (showUI && app) {
    return (
      <Box
        transform={`translate(${position.x}px, ${position.y}px)`}
        position="absolute"
        ref={boxRef}
        border="solid 3px"
        borderColor={selectColor}
        bg={panelBackground}
        p="2"
        rounded="md"
        transition="opacity 0.7s"
        display="flex"
        opacity={`${boardDragging || appDragging ? '0' : '1'}`}
      >
        <Box display="flex" flexDirection="column">
          <Text
            w="100%"
            textAlign="left"
            mx={1}
            color={textColor}
            fontSize={14}
            fontWeight="bold"
            h={'auto'}
            userSelect={'none'}
            className="handle"
          >
            {app?.data.type}
          </Text>
          <Box alignItems="center" p="1" width="100%" display="flex" height="32px" userSelect={'none'}>
            {getAppToolbar()}
          </Box>
        </Box>
      </Box>
    );
  }
  else return null;

}
