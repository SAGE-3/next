/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Box, Button, useColorModeValue, VStack, Text, useColorMode, HStack } from '@chakra-ui/react';

import { useAppStore, useUIStore, useUser, useRouteNav, useCursorBoardPosition, usePanelStore, useConfigStore } from '@sage3/frontend';
import { AppName, AppState } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';
import { Applications } from '@sage3/applications/apps';

// Development or production
const development: boolean = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

type ContextProps = {
  roomId: string;
  boardId: string;
  clearBoard: () => void;
  showAllApps: () => void;
};

export function BoardContextMenu(props: ContextProps) {
  // Configuration information
  const config = useConfigStore((state) => state.config);

  const [appsList, setAppsList] = useState<string[]>([]);

  // User information
  const { user, accessId } = useUser();

  const { toHome } = useRouteNav();
  // Redirect the user back to the homepage
  function handleHomeClick() {
    toHome(props.roomId);
  }
  // Get apps list
  useEffect(() => {
    const updateAppList = async () => {
      // If development show all apps
      if (development) {
        const apps = Object.keys(Applications).sort((a, b) => a.localeCompare(b));
        setAppsList(apps);
        // If Production show only the apps in the config file. config.features.apps
      } else if (!development && config) {
        const apps = config.features.apps.sort((a, b) => a.localeCompare(b));
        setAppsList(apps);
      } else {
        setAppsList([]);
      }
    };
    updateAppList();
  }, []);

  const createApp = useAppStore((state) => state.create);

  // UI Store
  const contextMenuPosition = useUIStore((state) => state.contextMenuPosition);

  const { uiToBoard } = useCursorBoardPosition();

  // UI Menu position setters
  const updatePanel = usePanelStore((state) => state.updatePanel);

  // Theme
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const panelBackground = useColorModeValue('gray.50', 'gray.700');
  const shadowColor = useColorModeValue('#00000050', '#00000080');
  const { colorMode, toggleColorMode } = useColorMode();

  /**
   * Create a new application
   * @param appName
   */
  const newApplication = (appName: AppName, title?: string) => {
    if (!user) return;
    // features disabled
    let state = {} as AppState;
    if (appName === 'SageCell' && !appsList.includes('SageCell')) return;
    if (appName === 'Screenshare' && !appsList.includes('Screenshare')) return;
    let width = 400;
    let height = 420;
    if (appName === 'SageCell') {
      width = 900;
      height = 800;
    }
    if (appName === 'Screenshare') {
      width = 1280;
      height = 720;
      state.accessId = accessId;
    }
    if (appName === 'Webview') {
      height = 650;
    }
    // Create the app
    const position = uiToBoard(contextMenuPosition.x, contextMenuPosition.y);
    createApp({
      title: title ? title : appName,
      roomId: props.roomId,
      boardId: props.boardId,
      position: { ...position, z: 0 },
      size: { width, height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: appName,
      state: { ...(initialValues[appName] as any), ...state },
      raised: true,
      dragging: false,
      pinned: false,
    });
  };

  const openChat = () => {
    // Not logged in
    if (!user) return;

    const position = uiToBoard(contextMenuPosition.x, contextMenuPosition.y);
    const width = 600;
    const height = 400;
    // Open a webview into the SAGE3 builtin Jupyter instance
    createApp({
      title: 'Chat',
      roomId: props.roomId,
      boardId: props.boardId,
      position: { ...position, z: 0 },
      size: { width, height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'Chat',
      state: { ...initialValues['Chat'] },
      raised: true,
      dragging: false,
      pinned: false,
    });
  };

  return (
    <Box
      whiteSpace={'nowrap'}
      boxShadow={`4px 4px 10px 0px ${shadowColor}`}
      p="2"
      rounded="md"
      bg={panelBackground}
      cursor="auto"
      w={'100%'}
    >
      <HStack spacing={2} alignItems="start" justifyContent={'left'}>
        <VStack w={'125px'}>
          <Text className="header" color={textColor} fontSize={18} h={'auto'} userSelect={'none'} fontWeight="bold" justifyContent={'left'}>
            Actions
          </Text>

          <Button
            w="100%"
            borderRadius={2}
            h="auto"
            p={1}
            mt={0}
            fontSize={14}
            color={textColor}
            justifyContent="flex-start"
            onClick={() => handleHomeClick()}
          >
            Back to Room
          </Button>

          <Button
            w="100%"
            borderRadius={2}
            h="auto"
            p={1}
            mt={0}
            fontSize={14}
            color={textColor}
            justifyContent="flex-start"
            onClick={() => updatePanel('controller', { position: { x: contextMenuPosition.x, y: contextMenuPosition.y } })}
          >
            Bring Controller
          </Button>
          <Button
            w="100%"
            borderRadius={2}
            h="auto"
            p={1}
            mt={0}
            fontSize={14}
            color={textColor}
            justifyContent="flex-start"
            onClick={props.clearBoard}
          >
            Clear Board
          </Button>
          <Button
            w="100%"
            borderRadius={2}
            h="auto"
            p={1}
            mt={0}
            fontSize={14}
            color={textColor}
            justifyContent="flex-start"
            onClick={toggleColorMode}
          >
            {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
          </Button>
          <Button
            w="100%"
            borderRadius={2}
            h="auto"
            p={1}
            mt={0}
            fontSize={14}
            color={textColor}
            justifyContent="flex-start"
            onClick={props.showAllApps}
          >
            Show all Apps
          </Button>
        </VStack>

        <VStack w={'125px'}>
          <Text className="header" color={textColor} fontSize={18} fontWeight="bold" h={'auto'} userSelect={'none'}>
            Apps
          </Text>

          <Button
            w="100%"
            borderRadius={2}
            h="auto"
            p={1}
            mt={0}
            fontSize={14}
            color={textColor}
            justifyContent="flex-start"
            onClick={() => openChat()}
            isDisabled={!appsList.includes('Chat')}
          >
            Chat
          </Button>

          <Button
            w="100%"
            borderRadius={2}
            h="auto"
            p={1}
            mt={0}
            fontSize={14}
            color={textColor}
            justifyContent="flex-start"
            onClick={() => newApplication('SageCell')}
            isDisabled={!appsList.includes('SageCell')}
          >
            SageCell
          </Button>

          <Button
            w="100%"
            borderRadius={2}
            h="auto"
            p={1}
            mt={0}
            fontSize={14}
            color={textColor}
            justifyContent="flex-start"
            onClick={() => newApplication('Screenshare')}
            isDisabled={!appsList.includes('Screenshare')}
          >
            Screenshare
          </Button>

          <Button
            w="100%"
            borderRadius={2}
            h="auto"
            p={1}
            mt={0}
            fontSize={14}
            color={textColor}
            justifyContent="flex-start"
            isDisabled={!appsList.includes('Stickie')}
            onClick={() => newApplication('Stickie', user?.data.name)}
          >
            Stickie
          </Button>
          <Button
            w="100%"
            borderRadius={2}
            h="auto"
            p={1}
            mt={0}
            fontSize={14}
            color={textColor}
            justifyContent="flex-start"
            isDisabled={!appsList.includes('Webview')}
            onClick={() => newApplication('Webview')}
          >
            Webview
          </Button>
        </VStack>
      </HStack>
    </Box>
  );
}
