/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, useColorModeValue, Text } from '@chakra-ui/react';
import { useAppStore, useUIStore } from '@sage3/frontend';
import { Applications } from '@sage3/applications/apps';

import { Rnd } from 'react-rnd';
import { useState } from 'react';

type AppToolbarProps = {
  position: { x: number; y: number };
  setPosition: (pos: { x: number; y: number }) => void;
};

/**
 * AppToolbar Component
 *
 * @export
 * @param {AppToolbarProps} props
 * @returns
 */
export function AppToolbar(props: AppToolbarProps) {
  // App Store
  const createApp = useAppStore((state) => state.create);
  const apps = useAppStore((state) => state.apps);

  // UI Store
  const selectedApp = useUIStore((state) => state.selectedAppId);

  // Theme
  const panelBackground = useColorModeValue('gray.50', '#4A5568');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');

  // UI store
  const showUI = useUIStore((state) => state.showUI);

  function handleDblClick(e: any) {
    e.stopPropagation();
  }

  const [hover, setHover] = useState(false);

  const app = apps.find((app) => app._id === selectedApp);

  function getAppToolbar() {
    if (app) {
      const Component = Applications[app.data.type].ToolbarComponent;
      return <Component key={app._id} {...app}></Component>;
    } else {
      return <Text>No App Selected</Text>;
    }
  }
  if (showUI)
    return (
      <Rnd
        // default={{ x: props.position.x, y: props.position.y, width: '100%', height: '100px' }}
        position={{ ...props.position }}
        bounds="window"
        onDoubleClick={handleDblClick}
        onDragStart={() => setHover(true)}
        onDragStop={(e, data) => {
          setHover(false);
          props.setPosition({ x: data.x, y: data.y });
        }}
        enableResizing={false}
        dragHandleClassName="handle" // only allow dragging the header
        style={{ transition: hover ? 'none' : 'all 1s' }}
      >
        <Box
          display="flex"
          boxShadow="outline"
          transition="all .5s "
          _hover={{ transform: 'translate(-3px, -5px)', boxShadow: '2xl' }}
          bg={panelBackground}
          p="2"
          rounded="md"
        >
          <Box
            width="25px"
            backgroundImage={`radial-gradient(${gripColor} 2px, transparent 0)`}
            backgroundPosition="0 0"
            backgroundSize="8px 8px"
            mr="2"
            cursor="move"
            className="handle"
          />

          <Box display="flex" flexDirection="column">
            <Text w="100%" textAlign="left" mx={1} color={textColor} fontSize={14} fontWeight="bold" h={'auto'} userSelect={'none'}>
              {app?.data.name}
            </Text>
            <Box alignItems="center" p="1" width="100%" display="flex" height="32px">
              {getAppToolbar()}
            </Box>
          </Box>
        </Box>
      </Rnd>
    );
  else return null;
}
