/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState, useRef } from 'react';
import { Box, useColorModeValue, Text } from '@chakra-ui/react';
import { useAppStore, useUIStore } from '@sage3/frontend';
import { Rnd } from 'react-rnd';

type MinimapProps = {
  position: { x: number; y: number };
  setPosition: (pos: { x: number; y: number }) => void;
  stuck?: boolean;
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
  // Hover state
  const [hover, setHover] = useState(false);
  // Put in a corner
  const [stuck, setStuck] = useState(props.stuck || false);

  function handleDblClick(e: any) {
    e.stopPropagation();
  }

  useEffect(() => {
    const resizeObserver = (e: UIEvent) => {
      props.setPosition({ x: window.innerWidth - 262, y: window.innerHeight - 156 });
    };
    if (stuck) {
      props.setPosition({ x: window.innerWidth - 262, y: window.innerHeight - 156 });
      window.addEventListener('resize', resizeObserver);
    }
    return () => {
      if (stuck) window.removeEventListener('resize', resizeObserver);
    }
  }, [stuck]);

  if (showUI)
    return (
      <Rnd
        position={{ ...props.position }}
        bounds="parent"
        onDoubleClick={handleDblClick}
        onDragStart={() => setHover(true)}
        onDragStop={(e, data) => {
          setHover(false);
          props.setPosition({ x: data.x, y: data.y });
          // bottom right corner
          if (data.x > (window.innerWidth - 265) && data.y > (window.innerHeight - 155)) {
            setStuck(true);
          } else {
            setStuck(false);
          }
        }}
        enableResizing={false}
        dragHandleClassName="handle" // only allow dragging the header
        style={{ transition: hover ? 'none' : 'all 0.2s' }}
      >
        <Box
          display="flex"
          boxShadow={stuck ? "base" : "outline"}
          transition="all .2s "
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
            <Text w="100%" textAlign="center" color={textColor} fontSize={18} fontWeight="bold" h={'auto'}
              userSelect={'none'} className="handle" cursor="move">
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
      </Rnd >
    );
  else return null;
}
