/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useState, useEffect, useRef, forwardRef, createRef } from 'react';
import { Text, Button, ButtonProps, useColorModeValue, Box, IconButton, Tooltip } from '@chakra-ui/react';
import { DraggableData, Rnd } from 'react-rnd';
import { MdExpandMore, MdExpandLess, MdClose } from 'react-icons/md';

import { PanelNames, StuckTypes, useHexColor, useUIStore } from '@sage3/frontend';

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
      {props.title ?
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
        : <Box my={1}> <hr /> </Box>}
    </Box>
  );
}

// Add a title to the chakra button props
export interface IconButtonPanelProps extends ButtonProps {
  icon: JSX.Element;
  description: string;
}

// Button with a title and using the font size from parent panel
export function IconButtonPanel(props: IconButtonPanelProps) {
  const iconColor = useColorModeValue('gray.600', 'gray.100');
  const iconHoverColor = useColorModeValue('teal.500', 'teal.500');

  return (
    <Box>
      <Tooltip label={props.description} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
        <IconButton
          borderRadius="md"
          h="auto"
          p={1}
          fontSize="4xl"
          justifyContent="flex-center"
          aria-label={props.description}
          icon={props.icon}
          background="transparent"
          color={props.isActive ? iconHoverColor : iconColor}
          transition={'all 0.2s'}
          variant="ghost"
          onClick={props.onClick}
          _hover={{ color: props.isActive ? iconHoverColor : iconColor, transform: 'scale(1.15)' }}
        />
      </Tooltip>
    </Box>
  );
}

// Props for the Panel
export type PanelProps = {
  title: string;
  name: PanelNames;
  opened: boolean;
  setOpened: (opened: boolean) => void;
  height?: number;
  width: number;
  zIndex: number;
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
  const [w, setW] = useState(props.width);

  // Window size tracking
  const [winWidth, setWidth] = useState(window.innerWidth);
  const [winHeight, setHeight] = useState(window.innerHeight);

  const showActions = props.opened;
  const setShowActions = props.setOpened;

  // Theme
  const panelBackground = useColorModeValue('gray.50', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'gray.50');
  const shadowColor = useColorModeValue('#00000050', '#00000080');
  const grip = useColorModeValue('gray.200', 'gray.900');
  const gripColor = useHexColor(grip);

  // UI store
  const showUI = useUIStore((state) => state.showUI);
  const ref = createRef<HTMLDivElement>();
  const bringPanelForward = useUIStore((state) => state.bringPanelForward);

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
  const borderColor = useHexColor('teal');
  const border = `solid ${borderColor} 3px`;
  const borderTop =
    props.stuck == StuckTypes.TopLeft || props.stuck == StuckTypes.Top || props.stuck == StuckTypes.TopRight ? border : '0px';
  const borderBottom =
    props.stuck == StuckTypes.BottomLeft || props.stuck == StuckTypes.Bottom || props.stuck == StuckTypes.BottomRight ? border : '0px';
  const borderLeft =
    props.stuck == StuckTypes.TopLeft || props.stuck == StuckTypes.Left || props.stuck == StuckTypes.BottomLeft ? border : '0px';
  const borderRight =
    props.stuck == StuckTypes.TopRight || props.stuck == StuckTypes.Right || props.stuck == StuckTypes.BottomRight ? border : '0px';

  function handleMinimizeClick(e: any) {
    e.stopPropagation();
    setShowActions(!showActions);
  }
  // Handle a drag start of the panel
  const handleDragStart = (event: any, data: DraggableData) => {
    bringPanelForward(props.name);
  };

  // Handle a drag stop of the panel
  const handleDragStop = (event: any, data: DraggableData) => {
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
        dragHandleClassName="dragHandle" // only allow dragging the header
        position={{ ...props.position }}
        bounds="window"
        onClick={() => bringPanelForward(props.name)}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        enableResizing={false}
        width="100%"
        style={{ maxWidth: w + 'px', zIndex: props.zIndex }}
      >
        <Box
          display="flex"
          transition="all .2s "
          bg={panelBackground}
          p="2"
          borderRadius={'md'}
          ref={ref}
          width="100%"
          borderTop={borderTop}
          borderLeft={borderLeft}
          borderBottom={borderBottom}
          borderRight={borderRight}
          boxShadow={`4px 4px 10px 0px ${shadowColor}`}
        >
          <Box
            width="25px"
            backgroundImage={`radial-gradient(${gripColor} 2px, transparent 0)`}
            backgroundPosition="0 0"
            backgroundSize="8px 8px"
            mr="3"
            cursor="move"
            className="dragHandle"
          />

          <Box bg={panelBackground} cursor="auto" maxWidth={w - 45 + 'px'}>
            <Box mb={2} display="flex" justifyContent="space-between" flexWrap={'nowrap'} width="100%">
              <Box flexGrow={1} maxWidth={w - 80 + 'px'} className="dragHandle">
                <Tooltip label={props.title} openDelay={500} placement="top" hasArrow={true}>
                  <Text
                    whiteSpace={'nowrap'}
                    overflow={'hidden'}
                    textOverflow={'ellipsis'}
                    textAlign="left"
                    mr="1"
                    color={textColor}
                    fontSize={bigFont}
                    fontWeight="bold"
                    cursor="move"
                    onDoubleClick={props.titleDblClick}
                  >
                    {props.title}
                  </Text>
                </Tooltip>
              </Box>

              <Box display="flex" flexWrap={'nowrap'}>
                {showActions ? (
                  <IconButton
                    size="xs"
                    icon={<MdExpandLess size="1.5rem" />}
                    aria-label="show less"
                    onClick={handleMinimizeClick}
                    mx="1"
                    cursor="pointer"
                  />
                ) : (
                  <IconButton
                    size="xs"
                    icon={<MdExpandMore size="1.5rem" />}
                    aria-label="show more"
                    onClick={handleMinimizeClick}
                    mx="1"
                    cursor="pointer"
                  />
                )}
                {props.showClose ? (
                  <IconButton
                    icon={<MdClose size="1.25rem" />}
                    aria-label="close panel"
                    size="xs"
                    mx="1"
                    cursor="pointer"
                    onClick={() => {
                      props.setShow(false);
                      props.setStuck(StuckTypes.Controller);
                    }}
                  />
                ) : null}
              </Box>
            </Box>

            {showActions ? <>{props.children}</> : null}
          </Box>
        </Box>
      </Rnd>
    );
  } else return null;
}
