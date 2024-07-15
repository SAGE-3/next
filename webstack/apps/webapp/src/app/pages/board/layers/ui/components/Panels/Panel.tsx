/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useEffect, createRef, useRef, useCallback } from 'react';
import { Text, Button, ButtonProps, useColorModeValue, Box, IconButton, Tooltip } from '@chakra-ui/react';
import { DraggableData, Rnd } from 'react-rnd';
import { MdExpandMore, MdExpandLess, MdClose } from 'react-icons/md';

import { PanelNames, PanelUI, StuckTypes, useHexColor, usePanelStore, useUIStore, useUserSettings } from '@sage3/frontend';

// Font sizes
const bigFont = 18;
const smallFont = 14;

// Add a title to the chakra button props
export interface ButtonPanelProps extends ButtonProps {
  title: string;
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
        title={props.title}
        textColor={props.textColor}
        draggable={props.draggable}
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
      >
        {props.title}
      </Button>
    </Box>
  );
}

// Add a title to the chakra button props
export interface IconButtonPanelProps extends ButtonProps {
  icon: JSX.Element;
  description: string;
  isDisabled?: boolean;
  onLongPress?: () => void;
}

// Button with a title and using the font size from parent panel
export function IconButtonPanel(props: IconButtonPanelProps) {
  const iconColor = useColorModeValue('gray.600', 'gray.100');
  const iconHoverColor = useColorModeValue('teal.500', 'teal.500');
  const longPressEvent = useLongPress(props.onLongPress || (() => {}));

  return (
    <Box>
      <Tooltip label={props.description} maxWidth={'400px'} placement="top-start" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
        <IconButton
          borderRadius="md"
          h="auto"
          p={0}
          m={0}
          fontSize="4xl"
          justifyContent="flex-center"
          aria-label={props.description}
          icon={props.icon}
          background={'transparent'}
          color={props.isActive ? iconHoverColor : iconColor}
          transition={'all 0.2s'}
          variant="ghost"
          onClick={props.onClick}
          isDisabled={props.isDisabled}
          _hover={{ color: props.isActive ? iconHoverColor : iconColor, transform: 'scale(1.15)' }}
          {...longPressEvent}
        />
      </Tooltip>
    </Box>
  );
}

// Props for the Panel
export type PanelProps = {
  title: string;
  name: PanelNames;
  height?: number;
  width: number;
  children?: JSX.Element;
  showClose: boolean;
  titleDblClick?: () => void;
};

/**
 * Panel component
 * @export
 * @param {PanelProps} props
 * @returns
 */
export function Panel(props: PanelProps) {
  // Panel Store
  const getPanel = usePanelStore((state) => state.getPanel);
  const panel = getPanel(props.name);
  if (!panel) return null;
  const panels = usePanelStore((state) => state.panels);
  const updatePanel = usePanelStore((state) => state.updatePanel);
  const zIndex = panels.findIndex((el) => el.name == panel.name);
  const update = (updates: Partial<PanelUI>) => updatePanel(panel.name, updates);

  // Track the size of the panel
  const [w] = useState(props.width);

  // Window size tracking
  const [winWidth, setWidth] = useState(window.innerWidth);
  const [winHeight, setHeight] = useState(window.innerHeight);

  // Theme
  const panelBackground = useColorModeValue('gray.50', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'gray.50');
  const shadowColor = useColorModeValue('#00000050', '#00000080');
  const grip = useColorModeValue('gray.200', 'gray.900');
  const gripColor = useHexColor(grip);

  // UI store
  const { settings } = useUserSettings();
  const showUI = settings.showUI;
  const ref = createRef<HTMLDivElement>();

  // Panel Store
  const bringPanelForward = usePanelStore((state) => state.bringPanelForward);

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
      if (panel.stuck == StuckTypes.Top) {
        if (panel.position.x > winWidth - we) {
          update({ position: { x: winWidth / 2 - we / 2, y: 5 } });
        } else {
          update({ position: { x: panel.position.x, y: 5 } });
        }
      } else if (panel.stuck == StuckTypes.TopLeft) {
        update({ position: { x: 5, y: 5 } });
      } else if (panel.stuck == StuckTypes.TopRight) {
        update({ position: { x: winWidth - we - 5, y: 5 } });
      } else if (panel.stuck == StuckTypes.BottomRight) {
        update({ position: { x: winWidth - we - 5, y: winHeight - he - 5 } });
      } else if (panel.stuck == StuckTypes.BottomLeft) {
        update({ position: { x: 5, y: winHeight - he - 5 } });
      } else if (panel.stuck == StuckTypes.Bottom) {
        if (panel.position.x > winWidth - we) {
          update({ position: { x: winWidth / 2 - we / 2, y: winHeight - he - 5 } });
        } else {
          update({ position: { x: panel.position.x, y: winHeight - he - 5 } });
        }
      } else if (panel.stuck == StuckTypes.Left) {
        if (panel.position.y + he > winHeight) {
          // move to make visible
          update({ position: { x: 5, y: winHeight / 2 - he / 2 } });
        } else {
          // keep the same y position
          update({ position: { x: 5, y: panel.position.y } });
        }
      } else if (panel.stuck == StuckTypes.Right) {
        if (panel.position.y > winHeight - he) {
          // move to make visible
          update({ position: { x: winWidth - we - 5, y: winHeight / 2 - he / 2 } });
        } else {
          // keep the same y position
          update({ position: { x: winWidth - we - 5, y: panel.position.y } });
        }
      }
    }
  }, [panel.stuck, winWidth, winHeight]);

  // Border color to show if panel is anchored to corners or sides
  const borderColor = useHexColor('teal');
  const border = `solid ${borderColor} 3px`;
  const borderTop =
    panel.stuck == StuckTypes.TopLeft || panel.stuck == StuckTypes.Top || panel.stuck == StuckTypes.TopRight ? border : '0px';
  const borderBottom =
    panel.stuck == StuckTypes.BottomLeft || panel.stuck == StuckTypes.Bottom || panel.stuck == StuckTypes.BottomRight ? border : '0px';
  const borderLeft =
    panel.stuck == StuckTypes.TopLeft || panel.stuck == StuckTypes.Left || panel.stuck == StuckTypes.BottomLeft ? border : '0px';
  const borderRight =
    panel.stuck == StuckTypes.TopRight || panel.stuck == StuckTypes.Right || panel.stuck == StuckTypes.BottomRight ? border : '0px';

  const handleCloseClick = (e: any) => {
    e.stopPropagation();
    update({ show: false });
  };

  const handleMinimizeClick = (e: any) => {
    e.stopPropagation();
    update({ minimized: !panel.minimized });
  };

  // Handle a drag start of the panel
  const handleDragStart = () => {
    bringPanelForward(props.name);
  };

  // Handle a drag stop of the panel
  const handleDragStop = (event: any, data: DraggableData) => {
    updatePanel(panel.name, { position: { x: data.x, y: data.y } });
    if (ref.current) {
      const we = ref.current['clientWidth'];
      const he = ref.current['clientHeight'];
      if (data.x < 5) {
        // left
        if (data.y < 5) {
          // top
          update({ stuck: StuckTypes.TopLeft, position: { x: 5, y: 5 } });
        } else if (data.y > winHeight - (he + 10)) {
          // bottom left
          update({ stuck: StuckTypes.BottomLeft, position: { x: 5, y: winHeight - he - 5 } });
        } else {
          // middle left
          update({ stuck: StuckTypes.Left, position: { x: 5, y: data.y } });
        }
      } else if (data.x > winWidth - (we + 5)) {
        // right
        if (data.y < 5) {
          // top right
          update({ stuck: StuckTypes.TopRight, position: { x: winWidth - we - 5, y: 5 } });
        } else if (data.y > winHeight - (he + 10)) {
          // bottom right
          update({ stuck: StuckTypes.BottomRight, position: { x: winWidth - we - 5, y: winHeight - he - 5 } });
        } else {
          // middle right
          update({ stuck: StuckTypes.Right, position: { x: winWidth - we - 5, y: data.y } });
        }
      } else if (data.y > winHeight - (he + 10)) {
        // bottom
        update({ stuck: StuckTypes.Bottom, position: { x: data.x, y: winHeight - he - 5 } });
      } else if (data.y < 5) {
        // top
        update({ stuck: StuckTypes.Top, position: { x: data.x, y: 5 } });
      } else {
        update({ stuck: StuckTypes.None });
      }
    }
  };

  if (showUI && panel.show) {
    return (
      <Rnd
        dragHandleClassName="dragHandle" // only allow dragging the header
        position={{ ...panel.position }}
        bounds="parent"
        onClick={() => bringPanelForward(props.name)}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        enableResizing={false}
        width="100%"
        style={{ maxWidth: w + 'px', zIndex: 100 + zIndex }}
      >
        <Box
          display="flex"
          transition="all .2s "
          bg={panelBackground}
          pt={1}
          pr={2}
          pb={2}
          pl={1}
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
            mr="2"
            cursor="move"
            className="dragHandle"
          />

          <Box bg={panelBackground} cursor="auto" maxWidth={w - 45 + 'px'}>
            <Box mb={1} display="flex" justifyContent="space-between" flexWrap={'nowrap'} width="100%">
              <Box flexGrow={1} maxWidth={w - 80 + 'px'} className="dragHandle">
                <Tooltip label={props.title} openDelay={500} placement="top" hasArrow={true}>
                  <Text
                    whiteSpace={'nowrap'}
                    overflow={'hidden'}
                    textOverflow={'ellipsis'}
                    textAlign="left"
                    color={textColor}
                    fontSize={bigFont}
                    fontWeight="bold"
                    cursor="move"
                    onDoubleClick={props.titleDblClick}
                    userSelect={'none'}
                  >
                    {props.title}
                  </Text>
                </Tooltip>
              </Box>

              <Box display="flex" flexWrap={'nowrap'}>
                {!panel.minimized ? (
                  <IconButton
                    size="xs"
                    icon={<MdExpandLess size="24px" />}
                    aria-label="show less"
                    onClick={handleMinimizeClick}
                    mx="1"
                    cursor="pointer"
                  />
                ) : (
                  <IconButton
                    size="xs"
                    icon={<MdExpandMore size="24px" />}
                    aria-label="show more"
                    onClick={handleMinimizeClick}
                    mx="1"
                    cursor="pointer"
                  />
                )}
                {panel.name !== 'controller' ? (
                  <IconButton
                    icon={<MdClose size="20px" />}
                    aria-label="close panel"
                    size="xs"
                    mx="1"
                    cursor="pointer"
                    onClick={handleCloseClick}
                  />
                ) : null}
              </Box>
            </Box>
            <div style={{ display: !panel.minimized ? 'initial' : 'none' }}>{props.children}</div>
          </Box>
        </Box>
      </Rnd>
    );
  } else return null;
}

//
// useLongPress hook adapted from react-use
//
const isTouchEvent = (ev: Event): ev is TouchEvent => {
  return 'touches' in ev;
};

const preventDefault = (ev: Event) => {
  if (!isTouchEvent(ev)) return;

  if (ev.touches.length < 2 && ev.preventDefault) {
    ev.preventDefault();
  }
};

const useLongPress = (callback: (e: TouchEvent | MouseEvent) => void) => {
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const target = useRef<EventTarget>();
  const isPreventDefault = true;
  const delay = 300;

  const start = useCallback(
    (event: TouchEvent | MouseEvent) => {
      // prevent ghost click on mobile devices
      if (isPreventDefault && event.target) {
        event.target.addEventListener('touchend', preventDefault, { passive: false });
        target.current = event.target;
      }
      timeout.current = setTimeout(() => callback(event), delay);
    },
    [callback, delay, isPreventDefault]
  );

  const clear = useCallback(() => {
    // clearTimeout and removeEventListener
    timeout.current && clearTimeout(timeout.current);

    if (isPreventDefault && target.current) {
      target.current.removeEventListener('touchend', preventDefault);
    }
  }, [isPreventDefault]);

  return {
    onMouseDown: (e: any) => start(e),
    onTouchStart: (e: any) => start(e),
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchEnd: clear,
  } as const;
};
