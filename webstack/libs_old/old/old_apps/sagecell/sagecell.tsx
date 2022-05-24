/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: Sagecell
 * created by: Luc Renambot
 */

// Import the React library
import React, { useEffect, useRef, useState } from 'react';

import {
  Box, Image, Alert, AlertIcon,
  HStack, useColorModeValue, Button, ButtonGroup,
  Tooltip, Spacer, Center,
} from '@chakra-ui/react';

// Styling for the ace editor
import './styling.css';

// State management functions from SAGE3
import { useSageStateAtom, useSageStateReducer, useSageSmartData } from '@sage3/frontend/smart-data/hooks';

// Import the props definition for this application
import { sagecellProps } from './metadata';

// Import state type definition
import { sagecellReducer } from './state-reducer';

// Throttling a function
import { throttle } from 'throttle-debounce';

import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-tomorrow_night_bright';
import 'ace-builds/src-noconflict/theme-xcode';
import 'ace-builds/src-noconflict/keybinding-vscode';

import { MdPlayArrow } from 'react-icons/md';
import { useUser } from '@sage3/frontend/services';
import { useStore } from '.';

type PythonOutput = {
  msg_type: 'text' | 'html' | 'image/png' | 'json' | 'error';
  data: string;
};

function RenderOutput(output: string | undefined): JSX.Element {
  const theme = useColorModeValue('xcode', 'monokai');
  const bgColor = useColorModeValue('whiteAlpha.900', 'blackAlpha.900');
  const bg = useColorModeValue('white', 'black');
  const color = useColorModeValue('black', 'white');

  const AppId = (props: sagecellProps) => {
    return props.id;
  };

  if (output === '' || output === undefined) {
    return <div></div>;
  } else {
    let parsedOutput = {} as PythonOutput;
    let str = '';
    try {
      parsedOutput = JSON.parse(output) as PythonOutput;
    } catch (e) {
      return (
        <Alert status="error">
          <AlertIcon />
          {e}
        </Alert>
      );
    }
    switch (parsedOutput.msg_type) {
      case 'error':
        return (
          <Alert status="error">
            <AlertIcon />
            {parsedOutput.data}
          </Alert>
        );
      case 'image/png':
        return <Image objectFit="cover" src={'data:image/png;base64,' + parsedOutput.data} alt="python cell image" />;
      case 'html':
        // str = JSON.stringify(parsedOutput.data);
        str = parsedOutput.data.replace(/\\n/g, '').replace(/\'/g, '');
        // return <iframe title="frame" src={"data:text/html, <html><head><title>" + AppId + "</title></head><body>" + parsedOutput.data + "</body></html>"}></iframe>
        return (
          <iframe
            width={'100%'}
            height={'200vh'}
            title={`${AppId}`}
            src={`data:text/html,
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset='UTF-8'>
            <title>${AppId}</title>
            <link rel="stylesheet" type="text/css" href="./styling.css">
            <style>
            body {
              color: ${bgColor};
              background-color: ${bg};
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen",
                "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
                sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            table {
              font-family: Arial, Helvetica, sans-serif;
              /* border-collapse: collapse; */
              height: 100%;
              width: 100%;
              /* text-align: left; */
              color: ${color};
            }
            tr:hover {background-color: teal;}
            table.dataframe {
              height: auto;
              max-height: 100%;
              overflow: auto;
            }
            </style>
        </head>
        <body>
        <div height="100%">
        ${str}
        </div>
        </body>
        
        </html>`}
          ></iframe>
        );
      case 'text':
        return (
          <pre style={{ whiteSpace: 'pre-wrap' }} aria-readonly="true">
            {parsedOutput.data}
          </pre>
        );
      case 'json':
        return (
          <AceEditor
            width={'100%'}
            minLines={2}
            maxLines={100}
            mode={'json'}
            theme={theme}
            fontSize="16px"
            highlightActiveLine={false}
            placeholder={JSON.stringify(parsedOutput, null, '\t')}
            value={JSON.stringify(parsedOutput, null, '\t')}
            editorProps={{ $blockScrolling: true }}
            setOptions={{
              showPrintMargin: true,
              showGutter: false,
              readOnly: true,
            }}
          />
        );
      default:
        return <div>Error. Not parsable.</div>;
    }
  }
}

export const Appssagecell = (props: sagecellProps): JSX.Element => {
  // data from the file
  const { data: codeFromFile } = useSageSmartData(props.data.file);

  const { data: sagecell, dispatch } = useSageStateReducer(props.state.sagecell, sagecellReducer);
  const position = props.position;
  const fontSize = 24;

  const ace = useRef<AceEditor>(null);
  // const { isOpen, onOpen, onClose } = useDisclosure();
  const theme = useColorModeValue('xcode', 'tomorrow_night_bright');
  const bgColor = useColorModeValue('whiteAlpha.700', 'blackAlpha.900');
  const bg = useColorModeValue('white', 'black');
  const color = useColorModeValue('black', 'white');
  // const { act } = useAction();
  const isLocked = useSageStateAtom<{ value: boolean }>(props.state.isLocked);
  const user = useUser();

  // The text of the sticky for React
  const [aceText, setAceText] = useState(sagecell.code);
  // Code in the store  (for communuication with  UI)
  const setCode = useStore((state: any) => state.setCode)

  // Take the file content and put it in the cell, if cell empty (new  cell)
  useEffect(() => {
    if (!sagecell.code && codeFromFile && codeFromFile.source) {
      dispatch({ type: 'update', code: codeFromFile.source });
    }
  }, []);

  // Saving the board at most once every 1sec.
  const throttleSave = throttle(1 * 1000, false, (newValue) => {
    dispatch({ type: 'update', code: newValue });
  });
  // Keep a copy of the function
  const throttleFunc = useRef(throttleSave);

  // Configure ACE editor when created/updated
  // Add key binding for evaluating code
  useEffect(() => {
    ace.current?.editor.commands.addCommand({
      name: 'runCell',
      bindKey: 'Shift-Enter',
      exec: (editor) => {
        // Get the code
        const current = editor.getSession().getValue();
        // Send to be evaluated
        dispatch({ type: 'run', code: current });
      }
    });
  }, [ace, dispatch]);

  // Update local value from the server
  useEffect(() => {
    setAceText(sagecell.code);
    setCode(sagecell.code);
  }, [sagecell.code]);

  // handler from the editor
  const handleChange = (value: string) => {
    setAceText(value);
    setCode(value);
    // Call to update the SAGE3 state in throttled way
    throttleFunc.current(value);
  }

  return (
    <Box p={2} w={'100%'} h={'100%'}>
      <Box
        w="100%"
        h="100%"
        overflowY="auto"
        fontSize={`${fontSize}px`}
        css={{
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'teal',
            borderRadius: '24px',
          },
        }}
      >
        <Box w="100%" bgColor={useColorModeValue('#EEE', '#222')} roundedTop="lg" borderBottom="1px" position="relative">
          <HStack>
            <Box as="span" p={2} pl={5} h={'36px'} fontSize={'16px'} color={color}>
              {props.info.createdBy.name !== user.name
                ? isLocked.data.value
                  ? 'Locked by ' + props.info.createdBy.name
                  : 'Unlocked'
                : null}
            </Box>
            <Spacer />
          </HStack>
        </Box>
        <Box w="100%" bgColor={bgColor} wordBreak="break-word" position="relative">
          <HStack>
            <AceEditor
              name="ace"
              className="editor"
              ref={ace}
              minLines={4}
              maxLines={100}
              placeholder="# Enter code here"
              width={'100%'}
              height={'100%'}
              mode={'python'}
              theme={theme}
              fontSize={fontSize + 'px'}

              // onChange={(newValue: string) => { dispatch({ type: 'update', code: newValue }); }}
              // value={sagecell.code}
              onChange={handleChange}
              value={aceText}

              readOnly={props.info.createdBy.name === user.name ? false : isLocked.data.value}
              editorProps={{ $blockScrolling: true }}
              setOptions={{
                hasCssTransforms: true,
                showGutter: true,
                showPrintMargin: false,
                highlightActiveLine: true,
                enableBasicAutocompletion: true,
                showLineNumbers: true,
              }}
            />
            <Box bgColor={bgColor} pr={8}></Box>
          </HStack>
        </Box>
        <Box w="100%" bgColor={useColorModeValue('#EEE', '#222')} borderTop="1px" roundedBottom="lg" position="relative">
          <HStack>
            <Box as="span" pl={10} fontSize={'16px'} color={color}>
              <ButtonGroup isAttached size="xs" colorScheme="teal">
                <Tooltip placement="bottom" hasArrow={true} label={'Run Code'} openDelay={400}>
                  <Button
                    variant={'solid'}
                    aria-label="Run Code"
                    _focus={{ color: bg }}
                    isDisabled={props.info.createdBy.name === user.name ? false : isLocked.data.value}
                    onClick={() => dispatch({ code: aceText, type: 'run' })}
                  >
                    Run
                    <Center _hover={{ transform: 'scale(1.2)' }} >
                      <MdPlayArrow size="1rem" />
                    </Center>
                  </Button>
                </Tooltip>
              </ButtonGroup>
            </Box>
            <Spacer />
            <Box pt={1.5} pr={10} h={'36px'} fontSize={'16px'} color={'GrayText'}>
              Ln: {ace.current?.editor.getCursorPosition() ? ace.current?.editor.getCursorPosition().row + 1 : 1}, Col:{' '}
              {ace.current?.editor.getCursorPosition() ? ace.current?.editor.getCursorPosition().column + 1 : 1}
            </Box>
          </HStack>
        </Box>

        {/* Output */}
        <Box w="100%" bgColor={bgColor} rounded="lg" wordBreak="break-word" position="relative">
          <Box p={2} m={2} ml={10} mr={10} minHeight={position.height - 238} h="100%" bg={bg} color={color} wordBreak="break-all">
            {RenderOutput(sagecell.output)}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Appssagecell;
