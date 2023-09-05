/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import { Box, useColorModeValue, Text, Button, Tooltip } from '@chakra-ui/react';

import { ErrorBoundary } from 'react-error-boundary';
import { MdClose, MdCopyAll, MdZoomOutMap } from 'react-icons/md';

import { useAppStore, useHexColor, useUIStore } from '@sage3/frontend';
import { Applications } from '@sage3/applications/apps';
import { duplicate } from 'vega-lite';
import { BsTrash } from 'react-icons/bs';
import { HiOutlineTrash } from 'react-icons/hi';

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
  const duplicate = useAppStore((state) => state.duplicateApps);

  // UI Store
  const selectedApp = useUIStore((state) => state.selectedAppId);

  // Theme
  const background = useColorModeValue('gray.50', 'gray.700');
  const panelBackground = useHexColor(background);

  const textColor = useColorModeValue('gray.800', 'gray.100');
  const commonButtonColors = useColorModeValue('gray.300', 'gray.200');
  const buttonTextColor = useColorModeValue('white', 'black');
  const selectColor = useHexColor('teal');

  // UI store
  const showUI = useUIStore((state) => state.showUI);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const setAppToolbarPosition = useUIStore((state) => state.setAppToolbarPosition);
  const scale = useUIStore((state) => state.scale);
  const appDragging = useUIStore((state) => state.appDragging);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const setScale = useUIStore((state) => state.setScale);

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
  }, [app?.data.position, app?.data.size, scale, boardPosition.x, boardPosition.y, window.innerHeight, window.innerWidth]);

  function moveToApp() {
    if (app) {
      // Scale
      const aW = app.data.size.width + 60; // Border Buffer
      const aH = app.data.size.height + 100; // Border Buffer
      const wW = window.innerWidth;
      const wH = window.innerHeight;
      const sX = wW / aW;
      const sY = wH / aH;
      const zoom = Math.min(sX, sY);

      // Position
      let aX = -app.data.position.x + 20;
      let aY = -app.data.position.y + 20;
      const w = app.data.size.width;
      const h = app.data.size.height;
      if (sX >= sY) {
        aX = aX - w / 2 + wW / 2 / zoom;
      } else {
        aY = aY - h / 2 + wH / 2 / zoom;
      }
      const x = aX;
      const y = aY;

      setBoardPosition({ x, y });
      setScale(zoom);
    }
  }

  function getAppToolbar() {
    if (app && Applications[app.data.type]) {
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
            <Tooltip placement="top" hasArrow={true} label={'Zoom to App'} openDelay={400} ml="1">
              <Button onClick={() => moveToApp()} backgroundColor={commonButtonColors} size="xs" ml="2" mr="0" p={0}>
                <MdZoomOutMap size="14px" color={buttonTextColor} />
              </Button>
            </Tooltip>
            <Tooltip placement="top" hasArrow={true} label={'Duplicate App'} openDelay={400} ml="1">
              <Button onClick={() => duplicate([app._id])} backgroundColor={commonButtonColors} size="xs" mx="1" p={0}>
                <MdCopyAll size="14px" color={buttonTextColor} />
              </Button>
            </Tooltip>
            <Tooltip placement="top" hasArrow={true} label={'Close App'} openDelay={400} ml="1">
              <Button onClick={() => deleteApp(app._id)} backgroundColor={commonButtonColors} size="xs" mr="1" p={0}>
                <HiOutlineTrash size="18px" color={buttonTextColor} />
              </Button>
            </Tooltip>
          </>
        </ErrorBoundary>
      );
    } else {
      // just the delete button
      return <Tooltip placement="top" hasArrow={true} label={'Close App'} openDelay={400} ml="1">
        <Button onClick={() => app?._id && deleteApp(app._id)} backgroundColor={commonButtonColors} size="xs" mr="1" p={0}>
          <HiOutlineTrash size="18px" color={buttonTextColor} />
        </Button>
      </Tooltip>;
    }
  }

  if (showUI && app)
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
        opacity={`${appDragging ? '0' : '1'}`}
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
  else return null;
}
