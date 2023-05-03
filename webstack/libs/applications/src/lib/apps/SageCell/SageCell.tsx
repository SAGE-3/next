/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import {
  Box,
  useColorModeValue,
  Divider,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  ButtonGroup,
  Editable,
  EditableInput,
  EditablePreview,
  Flex,
  IconButton,
  Input,
  useEditableControls,
  PopoverTrigger,
  FocusLock,
  FormControl,
  FormLabel,
  Popover,
  PopoverArrow,
  PopoverCloseButton,
  PopoverContent,
  Stack,
  PopoverBody,
  PopoverHeader,
  PopoverFooter,
  Portal,
  CircularProgress,
  Tooltip,
} from '@chakra-ui/react';

// SAGE3 imports
import { useAppStore, useUser, useUIStore, truncateWithEllipsis } from '@sage3/frontend';

import { randomSAGEColor } from '@sage3/shared';

import { state as AppState, Kernels } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';
import { CodeEditor } from './components/editor';
import { Outputs } from './components/outputs';
import { ToolbarComponent } from './components/toolbar';
import { StatusBar } from './components/status';

import './styles.css';
import React from 'react';
import { MdCheck, MdClose, MdCode, MdEdit } from 'react-icons/md';
import { render } from '@react-three/fiber';

// const rootStyle = { display: 'flex', justifyContent: 'center' };
// const rowStyle = { margin: '200px 0', display: 'flex', justifyContent: 'space-between' };
// const boxStyle = { padding: '10px', border: '1px solid black' };
/**
 * SageCell - SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */
const AppComponent = (props: App): JSX.Element => {
  const { user } = useUser();
  const scale = useUIStore((state) => state.scale);
  const s = props.data.state as AppState;
  const [myKernels, setMyKernels] = useState<Kernels>(s.availableKernels);
  const [access, setAccess] = useState(true);
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
  const [cellOrder, setCellOrder] = useState<string[]>([]);
  const [showRightAddButton, setShowRightAddButton] = useState(false);

  const [kernelColor, setKernelColor] = useState<string>(randomSAGEColor());
  const apps = useAppStore((state) => state.apps);

  const svgAddButton = (
    <svg width="150" height="150" viewBox="0 0 200 200">
      <g>
        <circle cx="100" cy="100" r="50" stroke="white" strokeWidth="6" fill={useColorModeValue('white', 'black')}></circle>
        <text
          x="50%"
          y="55%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill={useColorModeValue('black', 'white')}
          fontSize={`96px`}
          fontFamily="Arial, Helvetica, sans-serif"
        >
          +
        </text>
      </g>
    </svg>
  );

  const cellOrderCircle = (cellNumber: number) => {
    return (
      <svg width="150" height="150" viewBox="0 0 200 200">
        <g>
          <circle cx="100" cy="100" r="50" stroke="white" strokeWidth="6" fill={useColorModeValue('white', 'black')}></circle>
          <text
            x="50%"
            y="55%"
            dominantBaseline="middle"
            textAnchor="middle"
            fill={useColorModeValue('black', 'white')}
            fontSize={`96px`}
            fontFamily="Arial, Helvetica, sans-serif"
          >
            {cellNumber}
          </text>
        </g>
      </svg>
    );
  };

  // get a list of all the cells on the current board that are assigned to the same kernel
  useEffect(() => {
    // get all the apps that are sagecells on the board and filter out the ones that are not the same kernel
    const cells = apps.filter((app) => {
      return app.data.type === 'SageCell' && app.data.state.kernel === s.kernel;
    });
    // find the last cell (bottom right)
    const lastCell = cells.reduce((prev, current) => {
      const prevPos = prev.data.position;
      const currPos = current.data.position;
      if (prevPos.x > currPos.x) {
        return prev;
      } else if (prevPos.x < currPos.x) {
        return current;
      } else {
        if (prevPos.y > currPos.y) {
          return prev;
        } else if (prevPos.y < currPos.y) {
          return current;
        } else {
          return prev;
        }
      }
    });
    if (lastCell) {
      cells.sort((a, b) => {
        const aPos = a.data.position;
        const bPos = b.data.position;
        if (aPos.x < bPos.x) {
          return -1;
        } else if (aPos.x > bPos.x) {
          return 1;
        } else {
          if (aPos.y < bPos.y) {
            return -1;
          } else if (aPos.y > bPos.y) {
            return 1;
          } else {
            return 0;
          }
        }
      });
      const order: string[] = [];
      cells.forEach((cell) => {
        const state = cell.data.state as AppState;
        order.push(cell._id);
      });
      setCellOrder(order);
    }
  }, [JSON.stringify(apps), s.kernel]);

  useEffect(() => {
    const cellNumber = cellOrder.indexOf(props._id) + 1;
    updateState(props._id, { cellNumber: cellNumber });
  }, [JSON.stringify(cellOrder)]);

  // Needed for Div resizing
  const [editorHeight, setEditorHeight] = useState(150);
  const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A');
  const accessDeniedColor = useColorModeValue('#EFDEDD', '#9C7979');

  function getKernels() {
    if (!user) return;
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'get_available_kernels',
        params: { _uuid: user._id },
      },
    });
  }

  // Set the title on start
  useEffect(() => {
    // update the title of the app
    if (props.data.title !== 'SageCell') {
      update(props._id, { title: 'SageCell' });
    }
    getKernels();
  }, []);

  useEffect(() => {
    // Get all kernels that I'm available to see
    const kernels: Kernels = [];
    s.availableKernels.forEach((kernel) => {
      if (kernel.value.is_private) {
        if (kernel.value.owner_uuid == user?._id) {
          kernels.push(kernel);
        }
      } else {
        kernels.push(kernel);
      }
    });
    setMyKernels(kernels);
  }, [JSON.stringify(s.availableKernels)]);

  useEffect(() => {
    if (s.kernel == '') {
      setAccess(false);
    } else {
      const access = myKernels.find((kernel) => kernel.key === s.kernel);
      setAccess(access ? true : false);
      if (access) {
        const name = truncateWithEllipsis(access ? access.value.kernel_alias : s.kernel, 8);
        // update the title of the app
        update(props._id, { title: 'Sage Cell: kernel [' + name + ']' });
      }
    }
  }, [s.kernel, myKernels]);

  // handle mouse move event
  const handleMouseMove = (e: MouseEvent) => {
    const deltaY = e.movementY;
    handleEditorResize(deltaY);
  };

  // handle mouse up event
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleEditorResize = (deltaY: number) => {
    setEditorHeight((prevHeight) => prevHeight + deltaY); // update the Monaco editor height
  };

  useEffect(() => {
    const editor = document.querySelector('.monaco-editor');
    if (editor) {
      const editorHeight = editor.clientHeight;
      setEditorHeight(editorHeight);
    }
  }, [s.kernel]);

  const scaledFontSize = Math.round(12 / (scale + Number.EPSILON));
  // const scaledEditorHeight = Math.round(editorHeight / (scale + Number.EPSILON));
  const ww = window.innerWidth;

  return (
    <>
      <AppWindow app={props}>
        <>
          <Box
            hidden={scale > 0.3}
            bg={'black'}
            fontSize={`${scaledFontSize}px`}
            fontWeight="bold"
            justifyContent={'center'}
            alignItems={'center'}
            display={'flex'}
            height={'100%'}
            width={'100%'}
            position={'absolute'}
          >
            <Box
              position="absolute"
              top="0"
              left="0"
              w="100%"
              h="100%"
              bgImage="url('/assets/icon.svg')"
              bgRepeat="no-repeat"
              bgSize="contain"
              bgPosition="center"
              opacity="0.2"
            />
            <Flex flexDirection="column" alignItems="center" justifyContent="center">
              <Box
                color={'white'}
                fontSize={`${scaledFontSize * 2}px`}
                bgGradient={'linear(to-r, #7928CA, #FF0080)'}
                fontWeight="bold"
                bgClip="text"
              >
                {props.data.state.cellNumber == 0 ? '[ ]' : 'SC: ' + props.data.state.cellNumber}
              </Box>
              {s.summary == '' ? 'No summary' : s.summary}
              <CodeModal
                cellNumber={s.cellNumber}
                app={props}
                access={access}
                editorHeight={editorHeight}
                outputs={s.output}
                fontSize={scaledFontSize}
              />
            </Flex>
          </Box>
          <Box className="sc" h={'calc(100% - 1px)'} w={'100%'} display="flex" flexDirection="column" hidden={scale < 0.3}>
            <StatusBar kernel={s.kernel} access={access} isTyping={s.isTyping} bgColor={bgColor} />
            <Box
              w={'100%'}
              h={'100%'}
              bg={access ? bgColor : accessDeniedColor}
              pointerEvents={access ? 'auto' : 'none'}
              display="flex"
              flexDirection="column"
              flex="1"
              whiteSpace={'pre-wrap'}
              overflowWrap="break-word"
              overflowY="auto"
            >
              <Box flex="1">
                <CodeEditor app={props} access={access} editorHeight={editorHeight} />
                <Box
                  h="20px"
                  background={'transparent'}
                  _active={{ bg: 'transparent' }}
                  _hover={{ bg: 'transparent' }}
                  cursor="row-resize"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                >
                  {/* The grab bar */}
                  <Box>
                    <Box className="arrow-top" />
                    <Divider borderColor={'teal.600'} _hover={{ bg: 'teal.200' }} />
                    <Box className="arrow-down" />
                  </Box>
                </Box>

                {/* The output */}
                <Box flex="1" overflow="auto" w={'100%'} h={'100%'}>
                  {!s.output ? null : <Outputs output={s.output} app={props} />}
                </Box>
              </Box>
            </Box>
          </Box>
        </>
      </AppWindow>
    </>
  );
};

export default { AppComponent, ToolbarComponent };

interface CodeModalProps {
  app: App;
  access: boolean;
  editorHeight: number;
  outputs: string;
  fontSize: number;
  cellNumber: number;
}

function CodeModal(props: CodeModalProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const windowHeight = window.innerHeight;

  return (
    <>
      <Button
        colorScheme="teal"
        size="lg"
        w="100%"
        h="100%"
        fontSize={props.fontSize}
        onClick={() => {
          onOpen();
        }}
      >
        Click to Edit
      </Button>
      <Modal isCentered isOpen={isOpen} onClose={onClose} scrollBehavior="inside" size={'90%'}>
        <ModalOverlay bg={useColorModeValue('whiteAlpha.300', 'blackAlpha.300')} backdropFilter="blur(5px) hue-rotate(90deg)" />
        <ModalContent bgColor={useColorModeValue('#ECECEC', '#333')} maxW="120rem">
          <ModalHeader
            bgGradient={'linear(to-r, #7928CA, #FF0080)'}
            borderRadius={'0.5rem'}
            borderBottomRadius={'0rem'}
            color={'white'}
            fontSize={'1.5rem'}
            fontWeight={'bold'}
          >
            SAGECell #{props.cellNumber}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box bgColor={useColorModeValue('#EEE', '#222')}>
              <CodeEditor app={props.app} access={props.access} editorHeight={windowHeight / 2} />
              <Outputs output={props.outputs} app={props.app} />
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
