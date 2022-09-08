/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useState } from 'react';
import { Button, useColorModeValue, VStack, Text, Checkbox, Divider, useColorMode, HStack } from '@chakra-ui/react';

import { initialValues } from '@sage3/applications/apps';
import { useAppStore, useUIStore, useUser } from '@sage3/frontend';
import { AppName } from '@sage3/applications/schema';

type ContextProps = {
  roomId: string;
  boardId: string;
  clearBoard: () => void;
  fitToBoard: () => void;
  showAllApps: () => void;
};

// State of the checkboxes in context menu: grid ui
const savedRadios = [false, true];

export function BoardContextMenu(props: ContextProps) {
  // User information
  const { user } = useUser();
  const createApp = useAppStore((state) => state.create);

  // UI Store
  const scale = useUIStore((state) => state.scale);
  const gridSize = useUIStore((state) => state.gridSize);
  const setGridSize = useUIStore((state) => state.setGridSize);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const flipUI = useUIStore((state) => state.flipUI);
  const contextMenuPosition = useUIStore((state) => state.contextMenuPosition);

  // UI Menu position setters
  const setMenuPanelPosition = useUIStore((state) => state.setMenuPanelPosition);
  const setAppPanelPosition = useUIStore((state) => state.setAppPanelPosition);
  const setAppToolbarPosition = useUIStore((state) => state.setAppToolbarPosition);
  const setminimapPanelPosition = useUIStore((state) => state.setminimapPanelPosition);
  const setInfoPanelPosition = useUIStore((state) => state.setInfoPanelPosition);

  // State of the checkboxes in context menu: grid ui
  const [radios, setRadios] = useState(savedRadios);

  // Theme
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const panelBackground = useColorModeValue('gray.50', '#4A5568');

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

  const newApplication = (appName: AppName) => {
    if (!user) return;

    const x = Math.floor(boardPosition.x + (contextMenuPosition.x * 1 / scale));
    const y = Math.floor(boardPosition.y + (contextMenuPosition.y * 1 / scale));
    createApp({
      name: appName,
      description: appName + '>',
      roomId: props.roomId,
      boardId: props.boardId,
      position: { x, y, z: 0 },
      size: { width: 400, height: 400, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: appName,
      state: { ...(initialValues[appName] as any) },
      ownerId: user._id || '',
      minimized: false,
      raised: true,
    });
  };

  return (
    <VStack boxShadow="lg" p="2" rounded="md" bg={panelBackground} cursor="auto" w={'100%'}>
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
            onClick={toggleColorMode}
          >
            {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
          </Button>
          <Button w="100%" borderRadius={2} h="auto" p={1} mt={0} fontSize={14} color={textColor} justifyContent="flex-start"
            onClick={props.fitToBoard}>
            Fit View to Board
          </Button>
          <Button w="100%" borderRadius={2} h="auto" p={1} mt={0} fontSize={14} color={textColor} justifyContent="flex-start"
            onClick={props.showAllApps}>
            Show all Apps
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
            onClick={() => {
              const width = 700;
              const height = 700;
              // Calculate X and Y of app based on the current board position and the width and height of the viewport
              let x = Math.floor(boardPosition.x + window.innerWidth / 2 - width / 2);
              let y = Math.floor(boardPosition.y + window.innerHeight / 2 - height / 2);
              x = Math.round(x / gridSize) * gridSize; // Snap to grid
              y = Math.round(y / gridSize) * gridSize;
              // Open a webview into the SAGE3 builtin Jupyter instance
              createApp({
                name: 'JupyterLab',
                description: 'JupyterLab',
                roomId: props.roomId,
                boardId: props.boardId,
                position: { x, y, z: 0 },
                size: { width, height, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'JupyterLab',
                ownerId: user?._id || '-',
                state: { ...initialValues['JupyterLab'], jupyterURL: '' },
                minimized: false,
                raised: true,
              });
            }}
          >
            Open Jupyter
          </Button>
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
            onClick={() => newApplication('Stickie')}
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
            onClick={() => newApplication('CodeCell')}
          >
            CodeCell
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
            onClick={() => newApplication('Webview')}
          >
            Webview
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
          >
            Screenshare
          </Button>
        </VStack>
        <VStack w={'100%'}>
          <Text className="header" color={textColor} fontSize={18} fontWeight="bold" h={'auto'} cursor="move" userSelect={'none'}>
            Move Panels
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
            onClick={() => setMenuPanelPosition({ x: contextMenuPosition.x, y: contextMenuPosition.y })}
          >
            Menu
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
            onClick={() => setAppPanelPosition({ x: contextMenuPosition.x, y: contextMenuPosition.y })}
          >
            Applications
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
            onClick={() => setminimapPanelPosition({ x: contextMenuPosition.x, y: contextMenuPosition.y })}
          >
            Minimap
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
            onClick={() => setAppToolbarPosition({ x: contextMenuPosition.x, y: contextMenuPosition.y })}
          >
            App Toolbar
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
            onClick={() => setInfoPanelPosition({ x: contextMenuPosition.x, y: contextMenuPosition.y })}
          >
            Info
          </Button>
        </VStack>


        <VStack w={'100%'}>
          <Text className="header" color={textColor} fontSize={18} fontWeight="bold" h={'auto'} cursor="move" userSelect={'none'}>
            Options
          </Text>
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
        </VStack>
      </HStack>
    </VStack>
  );
}
