/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Button, HStack, useColorModeValue, Tooltip,
  IconButton, VStack, Alert, AlertIcon, AlertTitle, Text, Image,
  Flex, ButtonGroup
} from '@chakra-ui/react';

import Ansi from 'ansi-to-react';
// Date manipulation (for filename)
import dateFormat from 'date-fns/format';
// UUID generation
import { v4 as getUUID } from 'uuid';

import { MdDelete, MdPlayArrow, MdFileDownload, MdAdd, MdRemove } from 'react-icons/md';

import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-tomorrow_night_bright';
import 'ace-builds/src-noconflict/theme-xcode';
import 'ace-builds/src-noconflict/keybinding-vscode';

// SAGE3 imports
import { GetConfiguration, useAppStore, useUser } from '@sage3/frontend';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';
import { Markdown } from './components/markdown'
// Utility functions from SAGE3
import { downloadFile } from '@sage3/frontend';
// import { JSONOutput } from './components/json';


/**
 * CodeCell - SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */
const AppComponent = (props: App): JSX.Element => {
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);

  const s = props.data.state as AppState;

  // Room and board location
  const location = useLocation();

  // Get information  about the current Jupyter kernel
  useEffect(() => {
    GetConfiguration().then((conf) => {
      if (conf.token) {
        updateState(props._id, { token: conf.token });
        // Get list of sessions
        let base: string;
        if (conf.production) {
          base = `https://${window.location.hostname}:4443`;
        } else {
          base = `http://${window.location.hostname}`;
        }
        const j_url = base + '/api/sessions';
        // Talk to the jupyter server API
        fetch(j_url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Token ' + conf.token,
          }
        }).then((response) => response.json())
          .then((res) => {
            // console.log('Jupyter> Got sessions', res);
            const { boardId } = location.state as { boardId: string; roomId: string };
            for (const ss of res) {
              if (ss.name === boardId) {
                console.log('Jupyter> Found python3 kernel', ss.kernel.id);
                updateState(props._id, { kernel: ss.kernel.id });
                // update(props._id, { description: `CodeCell> ${ss.kernel.id}` });
                update(props._id, { description: `CodeCell (running)` });
              }
            }
          })
          .catch((err) => {
            update(props._id, { description: `CodeCell (kernel down)` });
            console.log('Jupyter> error', err);
          });
      }
    });
  }, []);

  return (
    <AppWindow app={props}>
      <>
        <Box w={'100%'} h={'100%'} bg={useColorModeValue('#E8E8E8', '#1A1A1A')}>
          <Box>{InputBox(props)}</Box>
          {/* add a box with a vertical scroll */}
          <Box w={'100%'} h={'100%'} bg={useColorModeValue('#E8E8E8', '#1A1A1A')} overflowY={'scroll'}>
            <Box p={4} fontSize={s.fontSize + 'rem'} color={'GrayText'} overflowY={'auto'} overflowX={'hidden'}>
              {ProcessedOutput(s.output)}
            </Box>
            {/* <Box m={4} mb={'120px'} bg={useColorModeValue('#222', '#1A1A1A')} color={'#FFF'}>
              <Text>**JSON FOR TESTING OUTPUTS**</Text>
              {JSONOutput(s.output)}
            </Box> */}
          </Box>
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
  const [fontSize, setFontSize] = useState(s.fontSize);

  const handleExecute = () => {
    const code = ace.current?.editor?.getValue();
    // console.log(code);
    console.log('CodeCell> execute', s.kernel);
    if (code) {
      updateState(props._id, {
        code: code,
        output: '',
        token: s.token,
        kernel: s.kernel,
        executeInfo: { executeFunc: 'execute', params: { uuid: getUUID() } },
      });
    }
  }

  const handleClear = () => {
    updateState(props._id, {
      code: '',
      output: '',
      // token: s.token,
      // kernel: s.kernel,
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

  useEffect(() => {
    // update local state from global state
    setFontSize(s.fontSize);
  }, [s.fontSize]);

  return (
    <>
      <HStack>
        <AceEditor
          ref={ace}
          name="ace"
          value={code}
          onChange={updateCode}
          readOnly={user?._id !== props._createdBy}
          fontSize={s.fontSize + 'rem'}
          minLines={2}
          maxLines={20}
          placeholder="Enter code here"
          mode={s.language}
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
            boxShadow: '0 0 0 2px ' + useColorModeValue('rgba(0,0,0,0.4)', 'rgba(0, 128, 128, 0.5)'),
            borderRadius: '4px',
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
              size={'md'}
              rounded={'full'}
              onClick={handleExecute}
              aria-label={''}
              disabled={user?._id !== props._createdBy}
              bg={useColorModeValue('#FFFFFF', '#000000')}
              icon={<MdPlayArrow size={'2em'} color={useColorModeValue('#008080', '#008080')} />}
            />
          </Tooltip>
          <Tooltip hasArrow label="Clear All">
            <IconButton
              _hover={{ bg: 'invisible', transform: 'scale(1.5)', transition: 'transform 0.2s' }}
              boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.4)'}
              size={'md'}
              rounded={'full'}
              onClick={handleClear}
              aria-label={''}
              disabled={user?._id !== props._createdBy}
              bg={useColorModeValue('#FFFFFF', '#000000')}
              icon={<MdDelete size={'2em'} color={useColorModeValue('#008080', '#008080')} />}
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

/**
 * UI toolbar for the cell
 *
 * @param {App} props
 * @returns {JSX.Element}
 */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // Update functions from the store
  const updateState = useAppStore((state) => state.updateState);

  // Larger font size
  function handleIncreaseFont() {
    const fs = Math.min(s.fontSize * 1.2, 2);
    updateState(props._id, { fontSize: fs });
  }
  // Smaller font size
  function handleDecreaseFont() {
    const fs = Math.max(0.5, s.fontSize / 1.2);
    updateState(props._id, { fontSize: fs });
  }

  // Download the stickie as a text file
  const downloadPy = () => {
    // Current date
    const dt = dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    const content = `${s.code}`;
    // generate a URL containing the text of the note
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    // Make a filename with username and date
    const filename = 'codecell-' + dt + '.py';
    // Go for download
    downloadFile(txturl, filename);
  };

  return (
    <>
      <HStack>
        <ButtonGroup isAttached size="xs" colorScheme="teal">
          <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
            <Button isDisabled={s.fontSize < 0.5} onClick={() => handleDecreaseFont()} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
              <MdRemove />
            </Button>
          </Tooltip>
          <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
            <Button isDisabled={s.fontSize >= 2} onClick={() => handleIncreaseFont()} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
              <MdAdd />
            </Button>
          </Tooltip>
        </ButtonGroup>
        <ButtonGroup isAttached size="xs" colorScheme="teal">
          <Tooltip placement="top-start" hasArrow={true} label={'Download Code'} openDelay={400}>
            <Button onClick={downloadPy} _hover={{ opacity: 0.7 }}>
              <MdFileDownload />
            </Button>
          </Tooltip>
        </ButtonGroup>
      </HStack>
    </>
  );
}

export default { AppComponent, ToolbarComponent };


const ProcessedOutput = (output: string) => {
  try {
    const parsed = JSON.parse(output);
    return (
      <Box
        p={4}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          overflow: 'hidden',
          backgroundColor: useColorModeValue('#F0F2F6', '#111111'),
          boxShadow: '0 0 0 2px ' + useColorModeValue('rgba(0,0,0,0.4)', 'rgba(0, 128, 128, 0.5)'),
          borderRadius: '4px',
        }}
      >
        {parsed.stream && parsed.stream.name === 'stdout' && RenderStdOut(parsed.stream.text)}
        {parsed.stream && parsed.stream.name === 'stderr' && RenderStdErr(parsed.stream.text)}
        {parsed.execute_result && RenderExecutionCount(parsed.execute_result.execution_count)}
        {parsed.execute_result && parsed.execute_result.data['text/plain'] && RenderPlainText(parsed.execute_result.data['text/plain'])}
        {parsed.execute_result && parsed.execute_result.data['text/html'] && RenderHTML(parsed.execute_result.data['text/html'])}
        {parsed.display_data && parsed.display_data.data['image/png'] && RenderPNG(parsed.display_data.data['image/png'])}
        {parsed.display_data && parsed.display_data.data['image/jpeg'] && RenderJPEG(parsed.display_data.data['image/jpeg'])}
        {parsed.display_data && parsed.display_data.data['image/svg+xml'] && RenderSVG(parsed.display_data.data['image/svg+xml'])}
        {parsed.display_data && parsed.display_data.data['text/plain'] && RenderPlainText(parsed.display_data.data['text/plain'])}
        {parsed.display_data && parsed.display_data.data['text/html'] && RenderHTML(parsed.display_data.data['text/html'])}
        {parsed.error && Array.isArray(parsed.error) && parsed.error.map((line: string) => RenderTraceBack(line))}
        {parsed.error && parsed.error.evalue && RenderError(parsed.error.evalue)}
      </Box>
    );
  } catch (e) {
    return ('')
  }
};

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

const RenderTraceBack = (line: string): JSX.Element => {
  return (
    <>
      <Alert status="error" variant="left-accent">
        {/* <AlertIcon /> */}
        <Ansi>{line}</Ansi>
      </Alert>
    </>
  );
};

const RenderError = (message: string): JSX.Element => {
  return (
    <>
      <Alert status="error" variant="left-accent">
        <AlertIcon />
        <AlertTitle mr={2}>{message}</AlertTitle>
      </Alert>
    </>
  );
};


// const RenderError = (message: any): JSX.Element => {
//   // get the last item in the traceback array
//   // const last = message.traceback[message.traceback.length - 1];

//   const messageString = JSON.stringify(message, null, '\t');
//   if (messageString.includes(': ')) {
//     const [ename, evalue] = messageString.split(': ');
//     return (
//       <>
//         <Alert status="error" variant="left-accent">
//           <AlertIcon />
//           <AlertTitle mr={2}>{evalue}</AlertTitle>
//           {/* <AlertTitle mr={2}>{last}</AlertTitle> */}
//         </Alert>
//       </>
//     );
//   }
//   return <>('not parsed')</>;
// };


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
