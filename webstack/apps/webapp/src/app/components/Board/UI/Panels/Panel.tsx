/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Text, Button, ButtonProps, useColorModeValue, Box, IconButton, HStack } from '@chakra-ui/react';
import { DraggableData, Rnd } from 'react-rnd';
import { MdExpandMore, MdExpandLess, MdClose } from 'react-icons/md';

import { StuckTypes, useUIStore } from '@sage3/frontend';
import { sageColorByName } from '@sage3/shared';

// Font sizes
const bigFont = 18;
const smallFont = 14;

// Add a title to the chakra button props
export interface ButtonPanelProps extends ButtonProps {
  title: string;
  candrag?: string;
  textColor?: string;
}

// Button with a title and using the font size from parent panel
export function ButtonPanel(props: ButtonPanelProps) {
  const textColor = useColorModeValue('gray.800', 'gray.100');

  const onDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    // storing the app name in the dataTransfer object
    e.dataTransfer.setData('app', props.title);
  };

  return (
    <Box w="100%">
      <Button
        {...props}
        w="100%"
        borderRadius="md"
        h="auto"
        p={1}
        pl={2}
        fontSize={smallFont}
        color={props.textColor ? props.textColor : textColor}
        justifyContent="flex-start"
        // Drag and drop the button to create an app
        onDragStart={onDragStart}
        draggable={props.candrag === 'true' ? true : false}
      >
        {props.title}
      </Button>
    </Box>
  );
}

// Add a title to the chakra button props
export interface IconButtonPanelProps extends ButtonProps {
  icon: JSX.Element;
  disabled: boolean;
  isActive: boolean;
  description: string;
}

// Button with a title and using the font size from parent panel
export function IconButtonPanel(props: IconButtonPanelProps) {
  const textColor = useColorModeValue('gray.800', 'gray.100');
  return (
    <Box>
      <IconButton
        {...props}
        borderRadius="md"
        h="auto"
        p={1}
        fontSize="4xl"
        color={props.textColor ? props.textColor : textColor}
        justifyContent="flex-center"
        aria-label={props.description}
        icon={props.icon}
        isDisabled={props.disabled}
        isActive={props.isActive}
        _hover={{ color: 'teal' }}
      />
    </Box>
  );
}

// Props for the Panel
export type PanelProps = {
  title: string;
  opened: boolean;
  setOpened: (opened: boolean) => void;
  height?: number;
  width?: number;
  position: { x: number; y: number };
  setPosition: (pos: { x: number; y: number }) => void;
  stuck: StuckTypes;
  setStuck: (stuck: StuckTypes) => void;
  children?: JSX.Element;
  showClose: boolean;
  show: boolean;
  setShow: (show: boolean) => void;
  titleDblClick?: () => void;
};

/**
 * Panel component
 * @export
 * @param {HeaderProps} props
 * @returns
 */
export function Panel(props: PanelProps) {
  // Track the size of the panel
  const [w, setW] = props.width ? useState(props.width) : useState(200);
  const [hover, setHover] = useState(false);
  // Window size tracking
  const [winWidth, setWidth] = useState(window.innerWidth);
  const [winHeight, setHeight] = useState(window.innerHeight);

  const showActions = props.opened;
  const setShowActions = props.setOpened;

  // Theme
  const panelBackground = useColorModeValue('gray.50', '#4A5568');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');

  // UI store
  const showUI = useUIStore((state) => state.showUI);
  const ref = useRef<HTMLDivElement>(null);

  function handleDblClick(e: any) {
    e.stopPropagation();
    setShowActions(!showActions);
  }
  function handleClick(e: any) {
    e.stopPropagation();
    setShowActions(!showActions);
  }

  // Update the window size
  const updateDimensions = () => {
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);
  };
  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (ref.current) {
      const we = ref.current['clientWidth'];
      const he = ref.current['clientHeight'];
      if (props.stuck == StuckTypes.Top) {
        if (props.position.x > winWidth - we) {
          props.setPosition({ x: winWidth / 2 - we / 2, y: 5 });
        } else {
          props.setPosition({ x: props.position.x, y: 5 });
        }
      } else if (props.stuck == StuckTypes.TopLeft) {
        props.setPosition({ x: 5, y: 5 });
      } else if (props.stuck == StuckTypes.TopRight) {
        props.setPosition({ x: winWidth - we - 5, y: 5 });
      } else if (props.stuck == StuckTypes.BottomRight) {
        props.setPosition({ x: winWidth - we - 5, y: winHeight - he - 5 });
      } else if (props.stuck == StuckTypes.BottomLeft) {
        props.setPosition({ x: 5, y: winHeight - he - 5 });
      } else if (props.stuck == StuckTypes.Bottom) {
        if (props.position.x > winWidth - we) {
          props.setPosition({ x: winWidth / 2 - we / 2, y: winHeight - he - 5 });
        } else {
          props.setPosition({ x: props.position.x, y: winHeight - he - 5 });
        }
      } else if (props.stuck == StuckTypes.Left) {
        if (props.position.y + he > winHeight) {
          // move to make visible
          props.setPosition({ x: 5, y: winHeight / 2 - he / 2 });
        } else {
          // keep the same y position
          props.setPosition({ x: 5, y: props.position.y });
        }
      } else if (props.stuck == StuckTypes.Right) {
        if (props.position.y > winHeight - he) {
          // move to make visible
          props.setPosition({ x: winWidth - we - 5, y: winHeight / 2 - he / 2 });
        } else {
          // keep the same y position
          props.setPosition({ x: winWidth - we - 5, y: props.position.y });
        }
      }
    }
  }, [props.stuck, winWidth, winHeight]);

  // Border color to show if panel is anchored to corners or sides
  const borderColor = useColorModeValue('#92c2ed', '#477eb0 ');
  const border = `solid ${borderColor} 3px`;
  const borderTop =
    props.stuck == StuckTypes.TopLeft || props.stuck == StuckTypes.Top || props.stuck == StuckTypes.TopRight ? border : '0px';
  const borderBottom =
    props.stuck == StuckTypes.BottomLeft || props.stuck == StuckTypes.Bottom || props.stuck == StuckTypes.BottomRight ? border : '0px';
  const borderLeft =
    props.stuck == StuckTypes.TopLeft || props.stuck == StuckTypes.Left || props.stuck == StuckTypes.BottomLeft ? border : '0px';
  const borderRight =
    props.stuck == StuckTypes.TopRight || props.stuck == StuckTypes.Right || props.stuck == StuckTypes.BottomRight ? border : '0px';

  // Handle a drag stop of the panel
  const handleDragStop = (event: any, data: DraggableData) => {
    setHover(false);
    props.setPosition({ x: data.x, y: data.y });
    if (ref.current) {
      const we = ref.current['clientWidth'];
      const he = ref.current['clientHeight'];
      if (data.x < 5) {
        // left
        if (data.y < 5) {
          // top
          props.setStuck(StuckTypes.TopLeft);
          props.setPosition({ x: 5, y: 5 });
        } else if (data.y > winHeight - (he + 10)) {
          // bottom left
          props.setStuck(StuckTypes.BottomLeft);
          props.setPosition({ x: 5, y: winHeight - he - 5 });
        } else {
          // middle left
          props.setStuck(StuckTypes.Left);
          props.setPosition({ x: 5, y: data.y });
        }
      } else if (data.x > winWidth - (we + 5)) {
        // right
        if (data.y < 5) {
          // top right
          props.setStuck(StuckTypes.TopRight);
          props.setPosition({ x: winWidth - we - 5, y: 5 });
        } else if (data.y > winHeight - (he + 10)) {
          // bottom right
          props.setStuck(StuckTypes.BottomRight);
          props.setPosition({ x: winWidth - we - 5, y: winHeight - he - 5 });
        } else {
          // middle right
          props.setStuck(StuckTypes.Right);
          props.setPosition({ x: winWidth - we - 5, y: data.y });
        }
      } else if (data.y > winHeight - (he + 10)) {
        // bottom
        props.setStuck(StuckTypes.Bottom);
        props.setPosition({ x: data.x, y: winHeight - he - 5 });
      } else if (data.y < 5) {
        // top
        props.setStuck(StuckTypes.Top);
        props.setPosition({ x: data.x, y: 5 });
      } else {
        props.setStuck(StuckTypes.None);
      }
    }
  };

  if (showUI && props.show) {
    return (
      <Rnd
        position={{ ...props.position }}
        bounds="window"
        size={{ width: w, height: ref.current ? ref.current['clientHeight'] + 5 : '100px' }}
        // onDoubleClick={handleDblClick}
        onDragStart={() => setHover(true)}
        onDragStop={handleDragStop}
        enableResizing={false}
        dragHandleClassName="header" // only allow dragging the header
        style={{ transition: hover ? 'none' : 'all 0.2s' }}
      >
        <Box
          display="flex"
          boxShadow="base"
          transition="all .2s "
          bg={panelBackground}
          p="2"
          borderRadius={'md'}
          ref={ref}
          borderTop={borderTop}
          borderLeft={borderLeft}
          borderBottom={borderBottom}
          borderRight={borderRight}
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
            <Box bg={panelBackground} cursor="auto">
              <HStack w="100%" mb={2}>
                <Text
                  w="100%"
                  textAlign="left"
                  pl="1"
                  color={textColor}
                  fontSize={bigFont}
                  fontWeight="bold"
                  h={'auto'}
                  userSelect={'none'}
                  className="header"
                  cursor="move"
                  onDoubleClick={props.titleDblClick}
                >
                  {props.title}
                </Text>

                {showActions ? (
                  <IconButton size="xs" as={MdExpandLess} aria-label="show less" onClick={handleClick} />
                ) : (
                  <IconButton size="xs" as={MdExpandMore} aria-label="show more" onClick={handleClick} />
                )}
                {props.showClose ? (
                  <IconButton
                    as={MdClose}
                    aria-label="close panel"
                    size="xs"
                    onClick={() => {
                      props.setShow(false);
                      props.setStuck(StuckTypes.Controller);
                    }}
                  />
                ) : null}
              </HStack>

              {showActions ? <>{props.children}</> : null}
            </Box>
          </Box>
        </Box>
      </Rnd>
    );
  } else return null;
}
