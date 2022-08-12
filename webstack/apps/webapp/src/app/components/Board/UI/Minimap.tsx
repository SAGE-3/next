/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, useColorModeValue, Text } from '@chakra-ui/react';
import { useAppStore, useUIStore } from '@sage3/frontend';
import { useState } from 'react';
import { Rnd } from 'react-rnd';

type MinimapProps = {
  position: { x: number; y: number };
  setPosition: (pos: { x: number; y: number }) => void;
};

export function MiniMap(props: MinimapProps) {
  // App Store
  const apps = useAppStore((state) => state.apps);
  // UI store
  const showUI = useUIStore((state) => state.showUI);
  // Theme
  const panelBackground = useColorModeValue('gray.50', '#4A5568');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');

  const [hover, setHover] = useState(false);

  function handleDblClick(e: any) {
    e.stopPropagation();
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
        style={{ transition: hover ? 'none' : 'all 0.3s' }}
      >
        <Box
          display="flex"
          boxShadow="outline"
          transition="all .5s "
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
            <Text w="100%" textAlign="center" color={textColor} fontSize={18} fontWeight="bold" h={'auto'} userSelect={'none'}  className="handle">
              Minimap
            </Text>
            <Box alignItems="center" p="1" width="100%" display="flex">
              <Box height={2500 / 25 + 'px'} width={5000 / 25 + 'px'} backgroundColor="#586274" borderRadius="md" border="solid teal 2px">
                <Box position="absolute">
                  {apps.map((app) => {
                    return (
                      <Box
                        key={app._id}
                        backgroundColor="teal"
                        position="absolute"
                        left={app.data.position.x / 25 + 'px'}
                        top={app.data.position.y / 25 + 'px'}
                        width={app.data.size.width / 25 + 'px'}
                        height={app.data.size.height / 25 + 'px'}
                        transition={'all .2s'}
                      ></Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Rnd>
    );
  else return null;
}
