/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useRef, useEffect, useState } from 'react';
import {
  Box, Button, HStack, useColorModeValue, Tooltip,
  IconButton, VStack, Alert, AlertIcon, AlertTitle, Text, Image,
  useColorMode, Flex
} from '@chakra-ui/react';
import { v4 as getUUID } from 'uuid';

import { BsMoonStarsFill, BsSun } from 'react-icons/bs';
import { MdDelete, MdPlayArrow } from 'react-icons/md';


import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-tomorrow_night_bright';
import 'ace-builds/src-noconflict/theme-xcode';
import 'ace-builds/src-noconflict/keybinding-vscode';

import { useAppStore, useUser } from '@sage3/frontend';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';
import { Markdown } from './components/markdown'


const AppComponent = (props: App): JSX.Element => {
  const updateState = useAppStore((state) => state.updateState);
  const s = props.data.state as AppState;

  return (
    <AppWindow app={props}>
      <>
        <Box w={'100%'} h={'100%'} bg={useColorModeValue('#E8E8E8', '#1A1A1A')}>
          {InputBox(props)}
          {ProcessedOutput(s.output)}
        </Box>
      </>
    </AppWindow>
  );
}

const InputBox = (props: App): JSX.Element => {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const ace = useRef<AceEditor>(null);
  const [code, setCode] = useState<string>(s.code);
  const { user } = useUser();

  const handleExecute = () => {
    const code = ace.current?.editor?.getValue();
    // console.log(code);
    if (code) {
      updateState(props._id, {
        code: code,
        output: '',
        executeInfo: { executeFunc: 'execute', params: { uuid: getUUID() } },
      });
    }
  }

  const handleClear = () => {
    updateState(props._id, {
      code: '',
      output: '',
      executeInfo: { executeFunc: '', params: {} },
    });
    ace.current?.editor?.setValue('');
  };

  // To update from server
  useEffect(() => {
    setCode(s.code);
  }, [s.code]);

  //  Update from Ace Editor
  const updateCode = (c: string) => {
    setCode(c);
  };

  return (
    <>
      <HStack>
        <AceEditor
          ref={ace}
          name="ace"
          value={code}
          onChange={updateCode}
          readOnly={user?._id !== props._createdBy}
          fontSize={'1em'}
          minLines={6}
          maxLines={6}
          // maxLines={Math.floor(props.data.size.height / 28)}
          placeholder="Enter code here"
          mode={'python'}
          theme={useColorModeValue('xcode', 'tomorrow_night_bright')}
          editorProps={{ $blockScrolling: true }}
          setOptions={{
            hasCssTransforms: true,
            showGutter: true,
            showPrintMargin: false,
            highlightActiveLine: true,
            showLineNumbers: true,
          }}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            marginTop: 15,
            marginLeft: 15,
            marginRight: 0,
            marginBottom: 10,
            padding: 0,
            overflow: 'hidden',
            backgroundColor: useColorModeValue('#F0F2F6', '#111111'),
            boxShadow: '0 0 0 4px ' + useColorModeValue('rgba(0,0,0,0.1)', 'rgba(0, 128, 128, 0.5)'),
            borderRadius: '12px',
          }}
          commands={[
            { name: 'Execute', bindKey: { win: 'Shift-Enter', mac: 'Shift-Enter' }, exec: handleExecute },
            { name: 'Clear', bindKey: { win: 'Ctrl-Alt-Backspace', mac: 'Ctrl-Alt-Backspace' }, exec: handleClear },
          ]}
        />
        <VStack pr={2}>
          <Tooltip hasArrow label="Execute" placement="top-start">
            <IconButton
              _hover={{ bg: 'invisible', transform: 'scale(1.5)', transition: 'transform 0.2s' }}
              boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.4)'}
              size={'xs'}
              rounded={'full'}
              onClick={handleExecute}
              aria-label={''}
              disabled={user?._id !== props._createdBy}
              bg={useColorModeValue('#FFFFFF', '#000000')}
              icon={<MdPlayArrow size={'2em'} color={useColorModeValue('#008080', '#008080')} />}
            />
          </Tooltip>
          <Tooltip hasArrow label="Clear All" placement="top-start" bgColor={'red'}>
            <IconButton
              _hover={{ bg: 'invisible', transform: 'scale(1.5)', transition: 'transform 0.2s' }}
              boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.4)'}
              size={'xs'}
              rounded={'full'}
              onClick={handleClear}
              aria-label={''}
              disabled={user?._id !== props._createdBy}
              bg={useColorModeValue('#FFFFFF', '#000000')}
              icon={<MdDelete size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />}
            />
          </Tooltip>
        </VStack>
      </HStack>
      <Flex pr={10} h={'24px'} fontSize={'16px'} color={'GrayText'} justifyContent={'right'}>
        Ln: {ace.current?.editor.getCursorPosition() ? ace.current?.editor.getCursorPosition().row + 1 : 1}, Col:{' '}
        {ace.current?.editor.getCursorPosition() ? ace.current?.editor.getCursorPosition().column + 1 : 1}
      </Flex>
    </>
  );
}


const ColorModeToggle = (): JSX.Element => {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    /**
     * Adds a random light/dark mode toggle to the app title bar.
     */
    <Flex h="0vh" justifyContent="right" alignItems="center">
      <Button
        mx={4}
        mb={0}
        size={'sm'}
        variant={'ghost'}
        _hover={{ bg: 'invisible' }}
        _active={{ bg: 'invisible' }}
        _focus={{ boxShadow: 'none' }}
        onClick={toggleColorMode}
      >
        {colorMode === 'light' ? <BsMoonStarsFill color="#FFF" /> : <BsSun color="#FFF" />}
      </Button>
    </Flex>
  );
};


function ToolbarComponent(props: App): JSX.Element {

  const s = props.data.state as AppState;

  return (
    <>
      <ColorModeToggle />
    </>
  )
}

export default { AppComponent, ToolbarComponent };


const ProcessedOutput = (output: string) => {
  try {
    const parsed = JSON.parse(output);
    return (
      <Box p={4} fontSize={'16px'} color={'GrayText'} overflowY={'auto'} overflowX={'hidden'}>
        <Box
          p={4}
          // m={4}
          // mr={0}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            overflow: 'hidden',
            backgroundColor: useColorModeValue('#F0F2F6', '#111111'),
            boxShadow: '0 0 0 4px ' + useColorModeValue('rgba(0,0,0,0.1)', 'rgba(0, 128, 128, 0.5)'),
            borderRadius: '12px',
          }}
        >
          {/* <pre>Real Output: </pre> */}
          {parsed.stream && parsed.stream.name === 'stdout' && RenderStdOut(parsed.stream.text)}
          {parsed.stream && parsed.stream.name === 'stderr' && RenderStdErr(parsed.stream.text)}
          {parsed.error && RenderTraceBack(parsed.error.evalue)}
          {parsed.execute_result && RenderExecutionCount(parsed.execute_result.execution_count)}
          {parsed.execute_result &&
            parsed.execute_result.data['text/plain'] &&
            RenderPlainText(parsed.execute_result.data['text/plain'])}
          {parsed.execute_result && parsed.execute_result.data['text/html'] && RenderHTML(parsed.execute_result.data['text/html'])}
          {parsed.display_data && parsed.display_data.data['image/png'] && RenderPNG(parsed.display_data.data['image/png'])}
        </Box>
        {/* {JSONOutput(output)} */}
      </Box>
    );
  } catch (e) {
    return ('');
    // return (<Box p={4}>Processing...</Box>);
    // return JSONOutput(output)
  }
};

const JSONOutput = (output: string) => {

  return (
    <Box p={4}>
      <pre>JSON Output: </pre>
      <AceEditor
        mode="json"
        theme={useColorModeValue('xcode', 'tomorrow_night_bright')}
        readOnly={true}
        fontSize={'1em'}
        minLines={6}
        maxLines={6}
        value={output ? JSON.stringify(JSON.parse(output), null, '\t') : ''}
        wrapEnabled={true}
        setOptions={{
          hasCssTransforms: true,
          showGutter: false,
          showPrintMargin: false,
          highlightActiveLine: false,
          showLineNumbers: false,
        }}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          overflow: 'hidden',
          backgroundColor: useColorModeValue('#F0F2F6', '#111111'),
          boxShadow: '0 0 0 4px ' + useColorModeValue('rgba(0,0,0,0.1)', 'rgba(0, 128, 128, 0.5)'),
          borderRadius: '12px',
        }}
      />
    </Box>
  );
}


/*****************************************************************
 * 
 * This section reserved for rendering the outputs of the notebook
 * 
 * 
 */

const RenderMarkdown = (markdown: string | string[]): JSX.Element => {
  /**
   * 
   * 
   */
  return (
    <>
      {/* <Alert
        mb={2}
        variant={'left-accent'}
        backgroundColor={useColorModeValue('#F0F2F6', '#111111')}
      > */}
      <Markdown data={markdown} />
      {/* </Alert> */}
    </>
  );
};

const RenderSource = (execution_count: number, source: string | string[]): JSX.Element => {
  return (
    <>
      <HStack w={'100%'}>
        <Text fontSize={'sm'} color={'gray'}>
          <pre>In [{execution_count}]:</pre>
        </Text>
        <Text fontSize={'sm'}>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>{source}</pre>
        </Text>
      </HStack>
    </>
  );
};

const RenderHTML = (html: string): JSX.Element => {
  return (
    <Box
      dangerouslySetInnerHTML={{ __html: html }}
      className={'rendered_html'}
    />
  );
};

const RenderTraceBack = (message: any): JSX.Element => {
  return (
    <>
      <Alert status="error" variant="left-accent">
        <AlertIcon />
        <AlertTitle mr={2}>{message}</AlertTitle>
      </Alert>
    </>
  );
};


const RenderPNG = (encoding: string, ww?: number | string, hh?: number | string): JSX.Element => {
  const url = 'data:image/png;base64,' + encoding; // base64 encoded image
  return <Image src={url} maxWidth="100%" display={'block'} width={ww ? ww : 'auto'} height={hh ? hh : 'auto'} alt="" />;
};

const RenderJPG = (encoding: string, ww?: number | string, hh?: number | string): JSX.Element => {
  const url = 'data:image/jpg;base64,' + encoding; // base64 encoded image
  return <Image src={url} maxWidth="100%" display={'block'} width={ww ? ww : 'auto'} height={hh ? hh : 'auto'} alt="" />;
};

const RenderJPEG = (encoding: string, ww?: number | string, hh?: number | string): JSX.Element => {
  const url = 'data:image/jpeg;base64,' + encoding; // base64 encoded image
  return <Image src={url} maxWidth="100%" display={'block'} width={ww ? ww : 'auto'} height={hh ? hh : 'auto'} alt="" />;
};

const RenderGIF = (encoding: string, ww?: number | string, hh?: number | string): JSX.Element => {
  const url = 'data:image/gif;base64,' + encoding; // base64 encoded image
  return <Image src={url} maxWidth="100%" display={'block'} width={ww ? ww : 'auto'} height={hh ? hh : 'auto'} alt="" />;
};

const RenderSVG = (svg: string): JSX.Element => {
  return <Box dangerouslySetInnerHTML={{ __html: svg }} />;
};

const RenderStdErr = (stderr: string): JSX.Element => {
  return <pre>{<Text color={'red'}>{stderr}</Text>}</pre>;
};

const RenderStdOut = (stdout: string): JSX.Element => {
  return <pre>{<Text color={'gray'}>{stdout}</Text>}</pre>;
};

const RenderExecutionCount = (executionCount: number, color?: string): JSX.Element => {
  return (
    <Text fontSize={'sm'} color={color ? color : 'gray'}>
      <pre>Out [{executionCount}]:</pre>
    </Text>
  );
};

const RenderPDF = (encoding: any): JSX.Element => {
  const base64Decoded = atob(encoding);
  const base64DecodedArray = new Uint8Array(base64Decoded.length);
  for (let i = 0; i < base64Decoded.length; i++) {
    base64DecodedArray[i] = base64Decoded.charCodeAt(i);
  }
  const url = URL.createObjectURL(new Blob([base64DecodedArray], { type: 'application/pdf' }));

  return (
    /**
     * This method works with the PDF.js library
     */
    <>
      <Alert status="error" variant="left-accent">
        PDF preview unavailable at this time.
      </Alert>
      {/*  Have to switch off the PDF view now without the react-pdf-viewer package */}
      {/* <div
        style={{
          border: '1px solid rgba(0, 0, 0, 0.3)',
          height: '750px',
        }}
      >
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@2.14.305/build/pdf.worker.min.js">
          <Viewer fileUrl={url} />
        </Worker>
      </div> */}
    </>
  );
};

const RenderPlainText = (plaintext: string | string[]): JSX.Element => {
  return (
    /**
     * Displays a plaintext message.
     */
    <>
      <Text fontFamily={'mono'} fontSize="xs" fontWeight={'normal'} wordBreak={'break-word'}>
        <pre>{plaintext}</pre>
      </Text>
    </>
  );
};
