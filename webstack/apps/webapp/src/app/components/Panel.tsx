/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState, createContext } from 'react';
import { VStack, Text, Button, ButtonProps, Tooltip, useColorModeValue } from '@chakra-ui/react';
import { useUser } from '@sage3/frontend';
import { DraggableData, Rnd } from 'react-rnd';
import { useUIStore } from '@sage3/frontend';

// Pass the font size between the panel and the buttons
const bigFont = 18;
const smallFont = 14;
const { Provider, Consumer } = createContext(16);

// Add a title to the chakra button props
export interface ButtonPanelProps extends ButtonProps {
  title: string;
};

// Button with a title and using the font size from parent panel
export function ButtonPanel(props: ButtonPanelProps) {
  const textColor = useColorModeValue('gray.800', 'gray.100');
  return (
    <Consumer>
      {value =>
        <Button {...props} w="100%" borderRadius={2} h="auto" p={1} mt={0}
          fontSize={value} color={textColor} justifyContent="flex-start">
          {props.title}
        </Button>}
    </Consumer>
  );
}

// Props for the panel: a title and some children
export type PanelProps = {
  title: string;
  position: { x: number, y: number };
  opened: boolean;
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
  const { user } = useUser();
  const scale = useUIStore((state) => state.scale);

  // Track the position of the panel
  const [pos, setPos] = useState(props.position);
  // Track the size of the panel
  const [w, setW] = useState(200);
  // Track the font sizes of the panel
  const [fontsize, setFontsize] = useState(bigFont);
  const [fontsize2, setFontsize2] = useState(smallFont);
  const [showActions, setShowActions] = useState(props.opened);
  const panelBackground = useColorModeValue('gray.50', '#4A5568');
  const textColor = useColorModeValue('gray.800', 'gray.100');

  // Update the position of the panel when updated
  useEffect(() => {
    setPos(props.position);
  }, [props.position]);

  // When scale changes, update the dimensions
  useEffect(() => {
    setW(150 / scale);
    const newf = Math.min(Math.max(Math.ceil(bigFont / scale), 6), bigFont * 2);
    const newf2 = Math.min(Math.max(Math.ceil(smallFont / scale), 6), smallFont * 2);
    setFontsize(newf);
    setFontsize2(newf2);
  }, [scale]);

  function handleDblClick(e: any) {
    e.stopPropagation();
    setShowActions(!showActions);
  }

  function handleDragStop(_e: any, data: DraggableData) {
    const x = data.x;
    const y = data.y;
    setPos({ x, y });
  }

  return (
    <Rnd
      bounds="parent"
      size={{ width: w, height: "100px" }}
      position={pos}
      onDragStop={handleDragStop}
      onDoubleClick={handleDblClick}
      scale={scale}
      enableResizing={false}
      dragHandleClassName="header" // only allow dragging the header
    >
      <VStack boxShadow='lg' p='1' rounded='md' bg={panelBackground} maxH={350}
        overflow="auto" cursor="auto">
        <Tooltip placement="top" gutter={20} hasArrow={true} label={'Doubleclick to open/close'} openDelay={600}>
          <Text className="header" color={textColor} fontSize={fontsize} h={"auto"} cursor="move">{props.title}</Text>
        </Tooltip>
        {showActions &&
          <Provider value={fontsize2}>
            {props.children}
          </Provider>}
      </VStack>
    </Rnd >
  );
}
