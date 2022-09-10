/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useState, createContext, useEffect, useRef } from 'react';
import {
  VStack,
  Text,
  Button,
  ButtonProps,
  Tooltip,
  useColorModeValue,
  Box,
  Icon,
  IconButton,
  CloseButton,
  HStack,
  propNames,
  ComponentWithAs,
  IconProps,
  background,
} from '@chakra-ui/react';
import { Rnd } from 'react-rnd';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';
import { StuckTypes, useUIStore } from '@sage3/frontend';

// Pass the font size between the panel and the buttons
const bigFont = 18;
const smallFont = 14;
const { Provider, Consumer } = createContext(16);

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
  used: boolean;
  description: string;
  //textColor?: string;
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
        isActive={props.used}
      />
    </Box>
  );
}

// Props for the panel: a title and some children
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
  const [w, setW] = props.width ? useState(props.width) : useState(200);
  const [hover, setHover] = useState(false);
  // Track the font sizes of the panel
  const [fontsize, setFontsize] = useState(bigFont);

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

  useEffect(() => {
    //console.log("resize event");
    if (ref.current && props.stuck != StuckTypes.None) {
      const we = ref.current['clientWidth'];
      const he = ref.current['clientHeight'];
      if (props.stuck == StuckTypes.Top) {
        props.setPosition({ x: window.innerWidth / 2 - we / 2, y: 5 });
      } else if (props.stuck == StuckTypes.TopLeft) {
        props.setPosition({ x: 5, y: 5 });
      } else if (props.stuck == StuckTypes.TopRight) {
        props.setPosition({ x: window.innerWidth - we - 5, y: 5 });
      } else if (props.stuck == StuckTypes.BottomRight) {
        props.setPosition({ x: window.innerWidth - we - 5, y: window.innerHeight - he - 5 });
      } else if (props.stuck == StuckTypes.BottomLeft) {
        props.setPosition({ x: 5, y: window.innerHeight - he - 5 });
      } else if (props.stuck == StuckTypes.Bottom) {
        props.setPosition({ x: window.innerWidth / 2 - we / 2, y: window.innerHeight - he - 5 });
      } else if (props.stuck == StuckTypes.Left) {
        props.setPosition({ x: 5, y: window.innerHeight / 2 - he / 2 });
      } else if (props.stuck == StuckTypes.Right) {
        props.setPosition({ x: window.innerWidth - we - 5, y: window.innerHeight / 2 - he / 2 });
      } else {
        console.log('non of the above');
      }
    }
  }, [window.innerWidth, window.innerHeight]);

  const borderTop =
    props.stuck == StuckTypes.TopLeft || props.stuck == StuckTypes.Top || props.stuck == StuckTypes.TopRight ? '2px' : '0px';
  const borderBottom =
    props.stuck == StuckTypes.BottomLeft || props.stuck == StuckTypes.Bottom || props.stuck == StuckTypes.BottomRight ? '2px' : '0px';
  const borderLeft =
    props.stuck == StuckTypes.TopLeft || props.stuck == StuckTypes.Left || props.stuck == StuckTypes.BottomLeft ? '2px' : '0px';
  const borderRight =
    props.stuck == StuckTypes.TopRight || props.stuck == StuckTypes.Right || props.stuck == StuckTypes.BottomRight ? '2px' : '0px';

  if (showUI)
    if (props.show)
      return (
        <Rnd
          position={{ ...props.position }}
          bounds="window"
          size={{ width: w, height: ref.current ? ref.current['clientHeight'] + 5 : '100px' }}
          //onDoubleClick={handleDblClick}

          onDragStart={() => setHover(true)}
          onDragStop={(e, data) => {
            setHover(false);
            props.setPosition({ x: data.x, y: data.y });
            //props.setStuck(StuckTypes.None);
            if (ref.current) {
              const we = ref.current['clientWidth'];
              const he = ref.current['clientHeight'];
              if (data.x < 5) {
                // left
                if (data.y < 5) {
                  // top
                  props.setStuck(StuckTypes.TopLeft);
                  console.log('top left');
                  //ref.current["style"] = {...ref.current["style"],background:'red'};
                } else if (data.y > window.innerHeight - (he + 10)) {
                  //bottom
                  props.setStuck(StuckTypes.BottomLeft);
                  console.log('bottom left');
                } else {
                  // middle
                  props.setStuck(StuckTypes.Left);
                  console.log(' left');
                }
              } else if (data.x > window.innerWidth - (we + 5)) {
                // right
                if (data.y < 5) {
                  // top
                  props.setStuck(StuckTypes.TopRight);
                  console.log('top right');
                } else if (data.y > window.innerHeight - (he + 10)) {
                  //bottom
                  props.setStuck(StuckTypes.BottomRight);
                  console.log('bottom right');
                } else {
                  // middle
                  props.setStuck(StuckTypes.Right);
                  console.log('right');
                }
              } else if (data.y > window.innerHeight - (he + 10)) {
                //bottom
                props.setStuck(StuckTypes.Bottom);
                console.log('bottom');
              } else if (data.y < 5) {
                // top
                props.setStuck(StuckTypes.Top);
                console.log('top');
              } else {
                props.setStuck(StuckTypes.None);
                console.log('none');
              }
              //console.log(props.stuck);
            }
            // bottom right corner
            /*if (data.x < 5 && data.y > (window.innerHeight - (props.height + 5))) {
            setStuck(true);
          } else {
            setStuck(false);
          }*/
          }}
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
                    textAlign="center"
                    color={textColor}
                    fontSize={fontsize}
                    fontWeight="bold"
                    h={'auto'}
                    userSelect={'none'}
                    className="header"
                    cursor="move"
                  >
                    {props.title}
                  </Text>
                  {props.showClose ? (
                    <CloseButton
                      size="xs"
                      onClick={() => {
                        props.setShow(false);
                        props.setStuck(StuckTypes.Controller);
                      }}
                    />
                  ) : null}
                  {showActions ? (
                    <IconButton as={MdExpandLess} aria-label="show less" onClick={handleClick} size="xs" />
                  ) : (
                    <IconButton as={MdExpandMore} aria-label="show more" onClick={handleClick} size="xs" />
                  )}
                </HStack>

                {showActions ? <>{props.children}</> : null}
              </Box>
            </Box>
          </Box>
        </Rnd>
      );
    else return null;
  else return null;
}
