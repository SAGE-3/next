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
} from '@chakra-ui/react';

// SAGE3 imports
import { useAppStore, useUser, useUIStore, truncateWithEllipsis } from '@sage3/frontend';

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

  /**
   *
   */

  return (
    <AppWindow app={props}>
      {/* Wrap the code cell and output in a container */}
      <>
        <Box
          hidden={scale > 0.5}
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
          {/* put a massive Jupyter icon as a faded background image */}
          <Box
            position="absolute"
            top="0"
            left="0"
            w="100%"
            h="100%"
            // bgImage="url('https://jupyter.org/assets/homepage/main-logo.svg')"
            bgImage="url('/assets/icon.svg')"
            bgRepeat="no-repeat"
            bgSize="contain"
            bgPosition="center"
            opacity="0.2"
            // bgGradient={'linear(to-r, #7928CA, #FF0080)'}
          />
          <Flex flexDirection="column" alignItems="center" justifyContent="center">
            <Box
              color={'white'}
              fontSize={`${scaledFontSize * 2}px`}
              bgGradient={'linear(to-r, #7928CA, #FF0080)'}
              fontWeight="bold"
              bgClip="text"
            >
              SageCell
            </Box>
            {s.summary == '' ? 'No summary' : s.summary}
            {/* </Box> */}
            {/* <CodeSummary appId={props._id} cellNumber={s.cellNumber} summary={s.summary} fontSize={scaledFontSize} /> */}
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
        <Box className="sc" h={'calc(100% - 1px)'} w={'100%'} display="flex" flexDirection="column" hidden={scale < 0.5}>
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
            {/* The code cell */}
            {/* <Box flex="1" onClick={handleOnCellClick}> */}
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
        // bgGradient={'linear(to-r, #7928CA, #FF0080)'}
        fontSize={props.fontSize}
        onClick={() => {
          onOpen();
        }}
      >
        Click to Edit
      </Button>
      <Modal isCentered isOpen={isOpen} onClose={onClose} scrollBehavior="inside" size={'5xl'}>
        <ModalOverlay bg={useColorModeValue('whiteAlpha.300', 'blackAlpha.300')} backdropFilter="blur(10px) hue-rotate(90deg)" />
        <ModalContent bgColor={useColorModeValue('#ECECEC', '#333')}>
          <ModalHeader>SAGECell #{props.cellNumber}</ModalHeader>
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

// interface CodeSummaryProps {
//   appId: string;
//   summary: string;
//   cellNumber: number;
//   fontSize: number;
// }

// function CodeSummary(props: CodeSummaryProps) {
//   /* Here's a custom control */
//   function EditableControls() {
//     const { isEditing, getSubmitButtonProps, getCancelButtonProps, getEditButtonProps } = useEditableControls();
//     const updateState = useAppStore((s) => s.updateState);

//     return isEditing ? (
//       <ButtonGroup
//         // justifyContent="center"
//         size="2xl"
//       >
//         <IconButton size={`${props.fontSize}px`} aria-label={''} icon={<MdCheck />} {...getSubmitButtonProps()} />
//         <IconButton aria-label={''} icon={<MdClose />} {...getCancelButtonProps()} />
//       </ButtonGroup>
//     ) : (
//       // <Flex justifyContent="center">
//       <IconButton size={`${props.fontSize}px`} aria-label={''} icon={<MdEdit />} {...getEditButtonProps()} />
//       // </Flex>
//     );
//   }

//   return (
//     <Editable textAlign="center" defaultValue={props.summary} fontSize={`${props.fontSize}px`} isPreviewFocusable={false}>
//       <Flex justifyContent="center">
//         <EditablePreview />
//         <Input as={EditableInput} />
//         <EditableControls />
//       </Flex>
//     </Editable>
//   );
// }
