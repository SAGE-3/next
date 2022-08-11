/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useState, createContext } from 'react';
import { VStack, Text, Button, ButtonProps, Tooltip, useColorModeValue, Box } from '@chakra-ui/react';
import { Rnd } from 'react-rnd';

import { useUIStore } from '@sage3/frontend';
import { X } from 'vega-lite/build/src/channel';

// Pass the font size between the panel and the buttons
const bigFont = 18;
const smallFont = 14;
const { Provider, Consumer } = createContext(16);

// Add a title to the chakra button props
export interface ButtonPanelProps extends ButtonProps {
  title: string;
  textColor?: string;
}

// Button with a title and using the font size from parent panel
export function ButtonPanel(props: ButtonPanelProps) {
  const textColor = useColorModeValue('gray.800', 'gray.100');
  return (
    <Consumer>
      {(value) => (
        <Button
          {...props}
          w="100%"
          borderRadius={10}
          h="auto"
          p={1}
          pl={2}

          fontSize={value}
          color={(props.textColor) ? props.textColor : textColor}
          justifyContent="flex-start"
        >
          {props.title}
        </Button>
      )}
    </Consumer>
  );
}

// Props for the panel: a title and some children
export type PanelProps = {
  title: string;
  opened: boolean;
  position: {x: number, y: number};
  setPosition: (pos: { x: number; y: number }) => void;
  children?: JSX.Element[];
};

/**
 * Header component
 *
 * @export
 * @param {HeaderProps} props
 * @returns
 */
export function Panel(props: PanelProps) {
  // Track the size of the panel
  const [w, setW] = useState(200);
  const [hover, setHover] = useState(false)
  // Track the font sizes of the panel
  const [fontsize, setFontsize] = useState(bigFont);
  const [fontsize2, setFontsize2] = useState(smallFont);
  const [showActions, setShowActions] = useState(props.opened);
  // Theme
  const panelBackground = useColorModeValue('gray.50', '#4A5568');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');

  // UI store
  const showUI = useUIStore((state) => state.showUI);

  function handleDblClick(e: any) {
    e.stopPropagation();
    setShowActions(!showActions);
  }

  if (showUI)
    return (
      <Rnd
        position={{...props.position}}
        bounds="window"
        size={{ width: w, height: '100px' }}
        onDoubleClick={handleDblClick}
        onDragStart={() => setHover(true)}
        onDragStop={(e, data) => { setHover(false); props.setPosition({x: data.x, y: data.y}); }}
        enableResizing={false}
        dragHandleClassName="header" // only allow dragging the header
        style={{transition: hover ? 'none' : 'all 1s'}}
      >
        <Box
          display="flex"
          boxShadow="outline"
          transition="all .5s "
          _hover={{ transform: 'translate(-3px, -5px)', boxShadow: '2xl' }}
          bg={panelBackground}
          p="2"
          pl="1"
          rounded="md"
        >
          <Box
            width="30px"
            backgroundImage={`radial-gradient(${gripColor} 2px, transparent 0)`}
            backgroundPosition="0 0"
            backgroundSize="8px 8px"
            mr="2"
            cursor="move"
            className="header"
          />

          <Box width="100%">
            <VStack bg={panelBackground} cursor="auto">
              <Tooltip placement="top" gutter={20} hasArrow={true} label={'Doubleclick to open/close'} openDelay={600}>
                <Text w="100%" textAlign="center" color={textColor} fontSize={fontsize} fontWeight="bold" h={'auto'} userSelect={'none'}>
                  {props.title}
                </Text>
              </Tooltip>
              {showActions && (
                <Provider value={fontsize2}>
                  <VStack
                    maxH={300}
                    w={'100%'}
                    overflow="auto"
                    p={1}
                    css={{
                      '&::-webkit-scrollbar': {
                        width: '6px',
                    
                      },
                      '&::-webkit-scrollbar-track': {
                        width: '6px',
             
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: gripColor,
                        borderRadius: '24px',
                      },
                    }}
                  >
                    {props.children}
                  </VStack>
                </Provider>
              )}
            </VStack>
          </Box>
        </Box>
      </Rnd>
    );
  else return null;
}
