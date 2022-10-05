/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, useColorModeValue, VStack, Text, Checkbox, useColorMode, HStack } from '@chakra-ui/react';

import { initialValues } from '@sage3/applications/initialValues';
import { useAppStore, useUIStore, useUser, usePresenceStore } from '@sage3/frontend';
import { AppName } from '@sage3/applications/schema';

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
  // User information
  const { user } = useUser();
  const navigate = useNavigate();

  const presences = usePresenceStore((state) => state.presences);
  const createApp = useAppStore((state) => state.create);

  // UI Store
  const scale = useUIStore((state) => state.scale);
  const gridSize = useUIStore((state) => state.gridSize);
  const setGridSize = useUIStore((state) => state.setGridSize);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const flipUI = useUIStore((state) => state.flipUI);
  const contextMenuPosition = useUIStore((state) => state.contextMenuPosition);

  // UI Menu position setters
  const setControllerPosition = useUIStore((state) => state.controller.setPosition);
  const setAppToolbarPosition = useUIStore((state) => state.setAppToolbarPosition);

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

  /**
   * Create a new application
   * @param appName 
   */
  const newApplication = (appName: AppName) => {
    if (!user) return;
    // Get the position of the cursor
    const me = presences.find((el) => el.data.userId === user._id && el.data.boardId === props.boardId);
    if (me) {
      const pos = me.data.cursor;
      const x = Math.round(pos.x / gridSize) * gridSize; // Snap to grid
      const y = Math.round(pos.y / gridSize) * gridSize;
      // Create the app
      createApp({
        name: appName,
        description: appName,
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
    }
  };

  const openJupyter = () => {
    if (!user) return;
    // Get the position of the cursor
    const me = presences.find((el) => el.data.userId === user._id && el.data.boardId === props.boardId);
    if (me) {
      const pos = me.data.cursor;
      const width = 700;
      const height = 700;
      const x = Math.round(pos.x / gridSize) * gridSize; // Snap to grid
      const y = Math.round(pos.y / gridSize) * gridSize;
      // Open a webview into the SAGE3 builtin Jupyter instance
      createApp({
        name: 'JupyterLab',
        description: 'JupyterLab',
        roomId: props.roomId,
        boardId: props.boardId,
        position: { x, y, z: 0 },
        size: { width, height, depth: 0 },
        rotation: { x, y, z: 0 },
        type: 'JupyterLab',
        ownerId: user?._id || '-',
        state: { ...initialValues['JupyterLab'], jupyterURL: '' },
        minimized: false,
        raised: true,
      });
    }
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
            onClick={() => navigate('/home', { replace: true, state: { roomId: props.roomId } })}
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
            onClick={() => setControllerPosition({ x: contextMenuPosition.x, y: contextMenuPosition.y })}
          >
            Bring Menu
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
            onClick={() => openJupyter()}
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
            onClick={() => newApplication('Screenshare')}
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
            onClick={() => newApplication('Webview')}
          >
            Webview
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
      </HStack >
    </VStack >
  );
}
