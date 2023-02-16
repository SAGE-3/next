/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Button, useColorModeValue, VStack, Text, Checkbox, useColorMode, HStack } from '@chakra-ui/react';

import { initialValues } from '@sage3/applications/initialValues';
import {
  useAppStore,
  useUIStore,
  useUser,
  useRouteNav,
  useData,
  useCursorBoardPosition,
  usePanelStore,
  GetConfiguration,
} from '@sage3/frontend';
import { AppName } from '@sage3/applications/schema';
import { OpenConfiguration } from '@sage3/shared/types';
import { Applications } from '@sage3/applications/apps';

// Development or production
const development: boolean = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

type ContextProps = {
  roomId: string;
  boardId: string;
  clearBoard: () => void;
  showAllApps: () => void;
  downloadBoard: () => void;
};

// State of the checkboxes in context menu: grid ui
const savedRadios = [false, true];

export function BoardContextMenu(props: ContextProps) {
  const data = useData('/api/configuration') as OpenConfiguration;

  const [appsList, setAppsList] = useState<string[]>([]);

  // User information
  const { user } = useUser();

  const { toHome } = useRouteNav();
  // Redirect the user back to the homepage
  function handleHomeClick() {
    toHome(props.roomId);
  }
  // Get apps list
  useEffect(() => {
    const updateAppList = async () => {
      const data = await GetConfiguration();
      // If development show all apps
      if (development) {
        const apps = Object.keys(Applications).sort((a, b) => a.localeCompare(b));
        setAppsList(apps);
        // If Production show only the apps in the config file. config.features.apps
      } else if (!development && data) {
        const apps = data.features.apps.sort((a, b) => a.localeCompare(b));
        setAppsList(apps);
      } else {
        setAppsList([]);
      }
    };
    updateAppList();
  }, []);

  const createApp = useAppStore((state) => state.create);

  // UI Store
  const resetBoardPosition = useUIStore((state) => state.resetBoardPosition);
  const setGridSize = useUIStore((state) => state.setGridSize);
  const flipUI = useUIStore((state) => state.flipUI);
  const contextMenuPosition = useUIStore((state) => state.contextMenuPosition);
  const showAppTitle = useUIStore((state) => state.showAppTitle);
  const toggleTitle = useUIStore((state) => state.toggleTitle);
  const { uiToBoard } = useCursorBoardPosition();

  // UI Menu position setters
  const updatePanel = usePanelStore((state) => state.updatePanel);

  // State of the checkboxes in context menu: grid ui
  const [radios, setRadios] = useState(savedRadios);

  // Theme
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const panelBackground = useColorModeValue('gray.50', 'gray.700');
  const shadowColor = useColorModeValue('#00000050', '#00000080');

  // Enable/disable the grid
  const onGridChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    if (val) {
      setGridSize(50);
    } else {
      setGridSize(1);
    }
    setRadios((_prev) => [val, radios[1]]);
    savedRadios[0] = val;
  };

  // Show/hide the UI
  const onUIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    flipUI();
    const val = e.target.checked;
    setRadios((_prev) => [radios[0], val]);
    savedRadios[1] = val;
  };
  const { colorMode, toggleColorMode } = useColorMode();

  /**
   * Create a new application
   * @param appName
   */
  const newApplication = (appName: AppName, title?: string) => {
    if (!user) return;
    // features disabled
    if (appName === 'JupyterLab' && appsList.includes('jupyter')) return;
    if (appName === 'SageCell' && appsList.includes('cell')) return;
    if (appName === 'Screenshare' && appsList.includes('twilio')) return;
    let width = 400;
    let height = 400;
    if (appName === 'SageCell') {
      width = 650;
    }
    if (appName === 'Webview') {
      height = 650;
    }
    // Create the app
    const position = uiToBoard(contextMenuPosition.x, contextMenuPosition.y);
    createApp({
      title: title ? title : '',
      roomId: props.roomId,
      boardId: props.boardId,
      position: { ...position, z: 0 },
      size: { width, height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: appName,
      state: { ...(initialValues[appName] as any) },
      raised: true,
    });
  };

  const openJupyter = () => {
    // Not logged in
    if (!user) return;
    // jupyter disabled
    if (data.features && appsList.includes('jupyter')) return;

    const position = uiToBoard(contextMenuPosition.x, contextMenuPosition.y);
    const width = 700;
    const height = 700;
    // Open a webview into the SAGE3 builtin Jupyter instance
    createApp({
      title: '',
      roomId: props.roomId,
      boardId: props.boardId,
      position: { ...position, z: 0 },
      size: { width, height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'JupyterLab',
      state: { ...initialValues['JupyterLab'], jupyterURL: '' },
      raised: true,
    });
  };

  return (
    <VStack
      whiteSpace={'nowrap'}
      boxShadow={`4px 4px 10px 0px ${shadowColor}`}
      p="2"
      rounded="md"
      bg={panelBackground}
      cursor="auto"
      w={'100%'}
    >
      <HStack spacing={2} alignItems="start" justifyContent={'left'}>
        <VStack w={'100%'}>
          <Text className="header" color={textColor} fontSize={18} h={'auto'} cursor="move" userSelect={'none'} fontWeight="bold">
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

          {/* <Button
            w="100%"
            borderRadius={2}
            h="auto"
            p={1}
            mt={0}
            fontSize={14}
            color={textColor}
            justifyContent="flex-start"
            onClick={props.downloadBoard}
          >
            Download Opened Assets
          </Button> */}
        </VStack>

        <VStack w={'100%'}>
          <Text className="header" color={textColor} fontSize={18} fontWeight="bold" h={'auto'} cursor="move" userSelect={'none'}>
            Quick Apps
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
            onClick={() => openJupyter()}
            disabled={!appsList.includes('JupyterLab')}
          >
            Jupyter
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
            disabled={!appsList.includes('SageCell')}
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
            disabled={!appsList.includes('Screenshare')}
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
            disabled={!appsList.includes('Stickie')}
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
            disabled={!appsList.includes('Webview')}
            onClick={() => newApplication('Webview')}
          >
            Webview
          </Button>
        </VStack>

        <VStack w={'100%'}>
          <Text className="header" color={textColor} fontSize={18} fontWeight="bold" h={'auto'} cursor="move" userSelect={'none'}>
            Options
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
            onClick={() => {
              resetBoardPosition();
            }}
          >
            Reset View
          </Button>

          <Checkbox
            w={'100%'}
            size={'sm'}
            fontSize={14}
            color={textColor}
            justifyContent="flex-start"
            isChecked={radios[0]}
            onChange={onGridChange}
          >
            Snap to Grid
          </Checkbox>
          <Checkbox
            w={'100%'}
            size={'sm'}
            fontSize={14}
            color={textColor}
            justifyContent="flex-start"
            isChecked={radios[1]}
            onChange={onUIChange}
          >
            Show Interface
          </Checkbox>
          <Checkbox
            w={'100%'}
            size={'sm'}
            fontSize={14}
            color={textColor}
            justifyContent="flex-start"
            isChecked={showAppTitle}
            onChange={toggleTitle}
          >
            Show App Titles
          </Checkbox>
        </VStack>
      </HStack>
    </VStack>
  );
}
