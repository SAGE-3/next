/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useAppStore, useUser } from '@sage3/frontend';
import { state as AppState, cellType, outputType, executeInfoType } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';
import { useState, useRef, useEffect, HtmlHTMLAttributes } from 'react';
import { v4 as getUUID } from 'uuid';
// Import the main component
// import { Viewer, Worker } from '@react-pdf-viewer/core';
// Import the styles
// import '@react-pdf-viewer/core/lib/styles/index.css';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-typescript';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-tomorrow_night_bright';
import 'ace-builds/src-noconflict/theme-xcode';
import 'ace-builds/src-noconflict/keybinding-vscode';
import 'ace-builds/src-noconflict/ext-language_tools';

import {
  Box,
  Button,
  Heading,
  HStack,
  Spacer,
  Text,
  useColorModeValue,
  Image,
  Accordion,
  Tooltip,
  AccordionButton,
  AccordionItem,
  IconButton,
  AccordionIcon,
  AccordionPanel,
  ButtonGroup,
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  VStack,
  Wrap,
  Avatar,
  WrapItem,
  Divider,
} from '@chakra-ui/react';
import { IoIosTrash } from 'react-icons/io';

import { useColorMode, Flex } from '@chakra-ui/react';
import { BsMoonStarsFill, BsSun } from 'react-icons/bs';
import { Markdown } from './components/markdown';
// import Ansi from 'ansi-to-react';
import { MdDelete, MdPlayArrow, MdReplay } from 'react-icons/md';


const AppComponent = (props: App): JSX.Element => {
  const update = useAppStore(state => state.update);
  const updateState = useAppStore(state => state.updateState);
  const s = props.data.state as AppState;

  type historyItem = {
    id: string;
    cell: cellType;
  };

  // Local States
  // const [code, setCode] = useState(s.code);
  const [history, setHistory] = useState<{ [key: string]: historyItem }>({});
  // const [uuid, setUUID] = useState(getUUID());
  const [executionCount, setExecutionCount] = useState(0);
  // const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const cells = s.cells ? s.cells : [];

  // colors
  const outerBoxColor = useColorModeValue('#ECF0F4', '#111111');
  const containerColor = useColorModeValue('#FFFFFF', '#202020');
  const inputTextColor = useColorModeValue('gray.800', '#DCDCEF');
  const inputBoxColor = useColorModeValue('#F0F2F6', '#111111');
  const iconColor = useColorModeValue('#008080', '#008080');
  // const iconColor = useColorModeValue('#13A350', '#1AE36E');
  const historyIconColor = useColorModeValue('#173269', '#DFE5EF');
  const historyTextColor = useColorModeValue('#3952C3', '#90CDF4');
  // const historyBoxBorderColor = useColorModeValue('#3952C3', 'gray.800');
  // const historyNavBarColor = useColorModeValue('#EBEFFA', 'gray.800');
  const historyNavBarColorTop = useColorModeValue('#EBEFFA', '#202020'); // accordion item background
  const historyNavBarColorTopAlt = useColorModeValue('#F6F7F9', '#171717'); // every other item
  const historyNavBarColorTopOpen = useColorModeValue('#EBEFFA', '#212536');
  const historyNavBarColorTopAltOpen = useColorModeValue('#FFFFFF', '#000000');
  const historyNavBarColorBottomOpen = useColorModeValue('#FFFFFF', '#000000');
  // const placeholderColor = useColorModeValue('#AAAAAA', '#666666');

  // refs
  // const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ace = useRef<AceEditor>(null);

  function handleExecute() {
    {!ace.current?.editor?.getValue() && alert('Please enter code first');}
    if (!ace) { return }
    if (ace.current) {
      ace.current.editor.focus();
    }
    setExecutionCount(executionCount + 1);
    const code = ace.current?.editor?.getValue();
    console.log(code)
    if (code) {
      updateState(props._id, { code: code, executeInfo: { executeFunc: 'test', params: {uuid: getUUID()}} });
    }
  }

  // const handleRerun = (uuid: string) => {
  //   updateState(props._id, { ...s, code: history[uuid].code, executeInfo: { executeFunc: 'rerun', params: { uuid: uuid } } });
  // };

  const handleClear = () => {
    updateState(props._id, {
      code: '',
      output: '',
      // history: {},
      cells: [],
      executeInfo: { executeFunc: '', params: {} },
    });
    // setCode('');
    setExecutionCount(0);
    setHistory({});
    // textAreaRef.current ? textAreaRef.current.value = '' : null;
  };

  // const handleExecuteWithShiftEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  //   if (e.key === 'Enter' && e.shiftKey) {
  //     e.preventDefault();
  //     handleExecute();
  //   }
  // }


  const handleExecuteWithShiftEnter = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.shiftKey && e.key === 'Enter') {
      handleExecute();
    }
  };

  // const handleAceEditorShiftEnter = (e: React.KeyboardEvent<AceEditor>) => {
  //   if (e.shiftKey && e.key === 'Enter') {
  //     handleExecute();
  //   }
  // }


  const handleAddToHistory = () => {
    const newHistory = { ...history };
    // newHistory[s.output.split('uuid: ')[1]] = {
    //   code: s.code,
    //   output: s.output,
    //   executionCount: executionCount,
    //   createdAt: Date.now(),
    // };
    setHistory(newHistory);
  };

  // const deleteItem = (uuid: string) => {
  //   const newHistory = { ...history };
  //   delete newHistory[uuid];
  //   setHistory(newHistory);
  // };

  // const handleCodeChange = (value: string) => {
  //   updateState(props._id, { code: value });
  // };


  /**
   * Change size of window to maximize the output view
   */
  const handleResizeEvent = () => {
    const newSize = { ...props.data.size, height: props.data.size.height + 100 };
    update(props._id, { size: newSize });
  }

  /**
   * Change size of window to hide the output view
   * @param e
   * @param id the id of the cell
   * @param size the size of the cell
   */
  const handleResizeOnShiftDoubleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (e.shiftKey) {
        const newSize = { ...props.data.size, height: 176 };
        update(props._id, { size: newSize });
    }
    else {
      handleResizeEvent();
    }
  }


  const inputBox = useRef(null);

  return (
    <AppWindow app={props}>
      <>
        {/* <ColorModeToggle />
        <ShowAuthors /> */}
        {/* <Settings /> */}
        <Box w={'100%'} h={'100%'} bg={useColorModeValue('#E8E8E8', '#1A1A1A')}>
          <div ref={inputBox}>
            <HStack>
              {/* <Input
                _focus={{ boxShadow: 'none', borderLeft: '4px', borderColor: iconColor }}
                bg={inputBoxColor}
                color={inputTextColor}
                borderRadius={0}
                h={'60px'}
                fontSize={'xl'}
                fontWeight={'bold'}
                value={code}
                onKeyDown={handleExecuteWithShiftEnter}
                onChange={(e) => setCode(e.target.value)}
                // onChange={(e) => updateState(props._id, { ...s, code: e.target.value })}
                placeholder={'Enter code here...'}
                _placeholder={{ color: placeholderColor, opacity: 0.7 }}
              /> */}
              {/* <Textarea
                ref={textareaRef}
                _focus={{ boxShadow: 'none', borderLeft: '4px', borderColor: iconColor }}
                bg={inputBoxColor}
                color={inputTextColor}
                borderRadius={0}
                h={'60px'}
                fontSize={'md'}
                fontWeight={'bold'}
                // value={code}
                // onKeyDown={handleExecuteWithShiftEnter}
                // onKeyDown={(e) => handleExecuteWithShiftEnter(e as unknown as React.KeyboardEvent<HTMLDivElement>)}
                onChange={(e) => setCode(e.target.value)}
                // onChange={(e) => updateState(props._id, { ...s, code: e.target.value })}
                placeholder={'Enter code here...'}
                _placeholder={{ color: placeholderColor, opacity: 0.7 }}
              /> */}
              {/* <Box h={50 * 10} w={"100%"} py={4}> */}
              <AceEditor
                ref={ace}
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
                  backgroundColor: inputBoxColor,
                  boxShadow: '0 0 0 4px ' + useColorModeValue('rgba(0,0,0,0.1)', 'rgba(0, 128, 128, 0.5)'),
                  borderRadius: '12px',
                }}
                name="ace"
                fontSize={'1em'}
                minLines={6}
                maxLines={Math.floor(props.data.size.height / 28)}
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
              />
              {/* </Box>
              <Box> */}
              <VStack pr={2}>
                <Tooltip hasArrow label="Execute" placement="right">
                  <IconButton
                    _hover={{ bg: 'invisible', transform: 'scale(1.5)', transition: 'transform 0.2s' }}
                    boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.4)'}
                    size={'xs'}
                    rounded={'full'}
                    onClick={handleExecute}
                    aria-label={''}
                    bg={historyNavBarColorTopAltOpen}
                    icon={<MdPlayArrow size={'2em'} color={iconColor} />}
                  />
                </Tooltip>

                {/* <Divider bgColor={'#FFF'}/> */}
                <Tooltip hasArrow label="Clear All" placement="right" bgColor={'red'}>
                  <IconButton
                    _hover={{ bg: 'invisible', transform: 'scale(1.5)', transition: 'transform 0.2s' }}
                    boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.4)'}
                    size={'xs'}
                    rounded={'full'}
                    onClick={handleClear}
                    aria-label={''}
                    bg={historyNavBarColorTopAltOpen}
                    icon={<MdDelete size={'1.5em'} color={iconColor} />}
                  />
                </Tooltip>
              </VStack>
              {/* </Box> */}
            </HStack>
            <Flex
              pr={10}
              h={'24px'}
              fontSize={'16px'}
              color={'GrayText'}
              justifyContent={'right'}
              onDoubleClick={handleResizeOnShiftDoubleClick}
            >
              Ln: {ace.current?.editor.getCursorPosition() ? ace.current?.editor.getCursorPosition().row + 1 : 1}, Col:{' '}
              {ace.current?.editor.getCursorPosition() ? ace.current?.editor.getCursorPosition().column + 1 : 1}
            </Flex>
          </div>

          <Box w={'100%'} h={props.data.size.height - 75} bg={outerBoxColor} overflowY={'auto'}>
            <Box boxShadow={'none !important'} w={'100%'} bg={containerColor}>
              <Accordion allowMultiple display={executionCount < 1 ? 'none' : 'inherit'}>
                <AccordionItem key={props._id}>
                  <AccordionButton
                    as="div"
                    _expanded={{
                      bgColor: historyNavBarColorTopOpen,
                      borderTop: '1px solid #3952C3',
                      borderRight: '1px solid #3952C3',
                      borderLeft: '1px solid #3952C3',
                    }}
                  >
                    <Flex flex={1} alignItems="center" textAlign={'left'}>
                      <Heading size="xs" color={historyTextColor}>
                        {/* <HStack w={'-moz-fit-content'}> */}
                        <pre>{RenderSource(executionCount, s.code)}</pre>
                        {/* </HStack>{' '} */}
                      </Heading>
                      <Spacer />
                      <ButtonGroup mr={2}>
                        <Tooltip hasArrow label="Run again" placement="bottom">
                          <IconButton
                            icon={<MdReplay color={historyIconColor} size="2em" />}
                            size="xs"
                            variant="ghost"
                            aria-label={''}
                            _hover={{ transform: 'scale(1.2)' }}
                            _focus={{ boxShadow: 'none' }}
                            // onClick={() => handleRerun(key)}
                          />
                        </Tooltip>
                        <Tooltip hasArrow label="Delete result" placement="bottom">
                          <IconButton
                            icon={<IoIosTrash color={historyIconColor} size="2em" />}
                            size="xs"
                            variant="ghost"
                            aria-label={''}
                            _hover={{ transform: 'scale(1.2)' }}
                            _focus={{ boxShadow: 'none' }}
                            // onClick={() => deleteItem(key)}
                          />
                        </Tooltip>
                      </ButtonGroup>
                    </Flex>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel
                    // as="div"
                    bg={historyNavBarColorBottomOpen}
                    borderRight="1px solid #3952C3"
                    borderBottom="1px solid #3952C3"
                    borderLeft="1px solid #3952C3"
                  >
                    {RenderOutputs([{ output_type: 'stream', name: 'stdout', text: s.output }])}
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>

              <Accordion allowMultiple>
                {cells.map((cell: cellType): JSX.Element => {
                  const index = cells.indexOf(cell);
                  const type = cell.cell_type;
                  const source = !cell.source ? '' : Array.isArray(cell.source) ? cell.source.join('') : (cell.source as string);
                  const execution_count = cell.execution_count as number;
                  const outputs = cell.outputs;
                  if (type === 'code') {
                    return (
                      <>
                        <AccordionItem
                          key={index}
                          bgColor={index % 2 === 0 ? historyNavBarColorTop : historyNavBarColorTopAlt}
                          _expanded={{
                            borderTop: index % 2 === 0 ? historyNavBarColorTopOpen : historyNavBarColorTopAltOpen,
                          }}
                        >
                          <AccordionButton
                            as="div"
                            _expanded={{
                              bgColor: historyNavBarColorTopOpen,
                              borderTop: '1px solid #3952C3',
                              borderRight: '1px solid #3952C3',
                              borderLeft: '1px solid #3952C3',
                            }}
                          >
                            <Flex flex={1} alignItems="center" textAlign={'left'}>
                              {/* <Heading size="xs" color={historyTextColor}> */}
                              {/* <HStack w={'-moz-fit-content'}> */}
                              <pre>{RenderSource(execution_count, source)}</pre>
                              {/* </HStack>{' '} */}
                              {/* </Heading> */}
                              <Spacer />
                              <ButtonGroup mr={2}>
                                <Tooltip hasArrow label="Run again" placement="bottom">
                                  <IconButton
                                    icon={<MdReplay color={historyIconColor} size="2em" />}
                                    size="xs"
                                    variant="ghost"
                                    aria-label={''}
                                    _hover={{ transform: 'scale(1.2)' }}
                                    _focus={{ boxShadow: 'none' }}
                                    // onClick={() => handleRerun(key)}
                                  />
                                </Tooltip>
                                <Tooltip hasArrow label="Delete result" placement="bottom">
                                  <IconButton
                                    icon={<IoIosTrash color={historyIconColor} size="2em" />}
                                    size="xs"
                                    variant="ghost"
                                    aria-label={''}
                                    _hover={{ transform: 'scale(1.2)' }}
                                    _focus={{ boxShadow: 'none' }}
                                    // onClick={() => deleteItem(key)}
                                  />
                                </Tooltip>
                              </ButtonGroup>
                            </Flex>
                            <AccordionIcon />
                          </AccordionButton>
                          <AccordionPanel
                            as="div"
                            bg={historyNavBarColorBottomOpen}
                            borderRight="1px solid #3952C3"
                            borderBottom="1px solid #3952C3"
                            borderLeft="1px solid #3952C3"
                          >
                            {RenderOutputs(outputs)}
                          </AccordionPanel>
                        </AccordionItem>
                      </>
                    );
                  } else if (type === 'markdown') {
                    return <>{RenderMarkdown(source)}</>;
                  } else {
                    return (
                      <>
                        <Alert status="info" mb={2}>
                          <AlertIcon />
                          <AlertTitle mr={2}>{JSON.stringify(type)}</AlertTitle>
                          <AlertDescription>{source}</AlertDescription>
                        </Alert>
                      </>
                    );
                  }
                })}
              </Accordion>
            </Box>
          </Box>
        </Box>
      </>
    </AppWindow>
  );
}

const RenderMarkdown = (markdown: string | string[]): JSX.Element => {
  return (
    <>
      <Alert
        mb={2}
        // variant={'left-accent'}
        backgroundColor={useColorModeValue('#F0F2F6', '#111111')}>
        <Markdown data={markdown} />
      </Alert>
    </>
  );
}

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
}

const RenderHTML = (html: any): JSX.Element => {
  const content = Array.isArray(html) ? html.join('') : html;
  return (
    <Box dangerouslySetInnerHTML={{ __html: content }} />
  );
}


const RenderTraceBack = (message: any): JSX.Element => {
  return (
    <>
      <Alert status="error" variant="left-accent">
        <AlertIcon />
        <AlertTitle mr={2}>{message.ename}</AlertTitle>
        {message.evalue}
      </Alert>
      {/* can use package ansi-to-react to view */}
      {/* <Ansi className="white-space: pre-wrap;">{message['traceback'].join('')}</Ansi> */}
    </>
  );
}


const RenderImage = ( type: string, encoding: string, ww?: number | string, hh?: number | string ): JSX.Element => {
  const url = 'data:' + type + ';base64,' + encoding; // base64 encoded image
  return (
    <>
      <Image
        src={`data:${type};base64,${encoding}`}
        maxWidth="100%"
        display={'block'}
        width={ww ? ww : 'auto'}
        height={hh ? hh : 'auto'}
        alt="" />
      <Text color={'purple'}>Image: {type}</Text>
    </>
  );
}

const RenderSVG = (svg: string): JSX.Element => {
  return (
    <>
      <Box dangerouslySetInnerHTML={{ __html: svg }} />
    </>
  );
};


const RenderStream = (stream: { name: string, text: string }): JSX.Element => {
  return (
    <>
      <pre>
        {stream.name == 'stdout' && stream.text && <Text color={'gray'}>{stream.text}</Text>}
        {stream.name == 'stderr' && stream.text && <Text color={'red'}>{stream.text}</Text>}
      </pre>{' '}
    </>
  );
}

const RenderOutCount = (executionCount: number): JSX.Element => {
  return (
    <>
      <Text fontSize={'sm'} color={'red'}>
        <pre>Out [{executionCount}]:</pre>
      </Text>
    </>
  );
};

const RenderPDF = ( MIMETYPE: string, encoding: any ): JSX.Element => {
  // const base64Decoded = atob(encoding);
  // const base64DecodedArray = new Uint8Array(base64Decoded.length);
  // for (let i = 0; i < base64Decoded.length; i++) {
  //   base64DecodedArray[i] = base64Decoded.charCodeAt(i);
  // }
  // const url = URL.createObjectURL(new Blob([base64DecodedArray], { type: MIMETYPE }));

  return (
    /**
     * This method works with
     */
    <>
      <Alert status="error" variant="left-accent">
        {MIMETYPE} preview unavailable at this time.
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
}

const RenderPlainText = (plaintext: string | string[]): JSX.Element => {
  // const text = Array.isArray(plaintext) ? plaintext.join('') : plaintext;
  return (
    <>
      <Text fontFamily={'mono'} fontSize='xs' fontWeight={'normal'} wordBreak={'break-word'}>
        <pre>{plaintext}</pre>
      </Text>
    </>
  );
}

const RenderJSON = (json: any): JSX.Element => {
  const ace = useRef<AceEditor>(null);
  return (
    <AceEditor
      name={'json'}
      ref={ace}
      mode="json"
      theme="github"
      fontSize={14}
      showPrintMargin={false}
      showGutter={true}
      highlightActiveLine={false}
      value={JSON.stringify(json, null, 2)}
      width={'100%'}
      height={'100%'}
      setOptions={{
        showLineNumbers: false,
        tabSize: 2,
      }}
      readOnly={true}
    />
  );
}



const RenderOutputs = (outputs: any): JSX.Element => {
  return (
    <>
      {outputs.map(
        (output: {
          output_type: string;
          data: { [key: string]: any };
          execution_count: number;
          text: string | string[];
          name: 'stderr' | 'stdout';
          metadata: { [key: string]: any };
        }) => {
          const outputType = output.output_type;
          const data = output.data;
          const name = output.name;
          const text = !output.text ? '' : Array.isArray(output.text) ? output.text.join('') : output.text;
          const meta = output.metadata
          // Handle outputs marked as execute_result
          if (outputType === 'execute_result') {
            return (
              <>
                {RenderOutCount(output.execution_count)}
                {'text/html' in data && RenderHTML(data['text/html'])}
                {'text/plain' in data && RenderPlainText(data['text/plain'])}
                {'image/png' in data && RenderImage('image/png', data['image/png'])}
                {'image/svg+xml' in data && RenderSVG(data['image/svg+xml'])}
                {'image/jpeg' in data &&
                  RenderImage(
                    'image/jpeg',
                    data['image/jpeg'],
                    meta['image/jpeg'] && 'height' in meta['image/jpeg'] ? meta['image/jpeg'].height : 'auto',
                    meta['image/jpeg'] && 'width' in meta['image/jpeg'] ? meta['image/jpeg'].width : 'auto'
                  )}
                {'image/svg+xml' in data && RenderImage('image/svg+xml', data['image/svg+xml'])}
                {'application/pdf' in data && RenderPDF('application/pdf', data['application/pdf'])}
                {'text/markdown' in data && RenderMarkdown(data['text/markdown'])}
                {'application/json' in data && RenderJSON(data['application/json'])}
              </>
            );
          }
          // Handle outputs marked as display_data
          if (outputType === 'display_data') {
            return (
              <>
                {'text/html' in data && RenderHTML(data['text/html'])}
                {'text/plain' in data && RenderPlainText(data['text/plain'])}
                {'image/png' in data &&
                  RenderImage(
                    'image/png',
                    data['image/png'],
                    meta['image/png'] && 'height' in meta['image/png'] ? meta['image/png'].height : 'auto',
                    meta['image/png'] && 'width' in meta['image/png'] ? meta['image/png'].width : 'auto'
                  )}
                {'image/jpeg' in data &&
                  RenderImage(
                    'image/jpeg',
                    data['image/jpeg'],
                    meta['image/jpeg'] && 'height' in meta['image/jpeg'] ? meta['image/jpeg'].height : 'auto',
                    meta['image/jpeg'] && 'width' in meta['image/jpeg'] ? meta['image/jpeg'].width : 'auto'
                  )}{' '}
                {'image/svg+xml' in data && RenderSVG(data['image/svg+xml'])}
                {'application/pdf' in data && RenderPDF('application/pdf', data['application/pdf'])}
                {'text/markdown' in data && RenderMarkdown(data['text/markdown'])}
                {'application/json' in data && RenderJSON(data['application/json'])}
              </>
            );
          }
          if (outputType === 'stream') {
            return RenderStream({ name, text });
          }
          if (outputType === 'error') {
            return RenderTraceBack(output);
          }
          return (
            <>
              <Alert status="error">
                <AlertIcon />
                <AlertTitle>Unknown Type!</AlertTitle>
                <AlertDescription>Unable to handle {outputType}.</AlertDescription>
              </Alert>
            </>
          );
        }
      )}
    </>
  );
}

// export default CodeCell;


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

function ShowAuthors() {
  const user = useUser();

  return (
    /**
     * Adds a list of users that made updates to the app.
     */
    <Flex h="0vh" justifyContent="right" alignItems="center">
      <Wrap mr={'0px'} mb={0}>
        <WrapItem>
          <Tooltip label={user.user?.data.email} placement="top">
            <Avatar size="2xs" name={user.user?.data.name} src={user.user?.data.profilePicture} />
          </Tooltip>
        </WrapItem>
      </Wrap>
    </Flex>
  );
}

function ToolbarComponent(props: App): JSX.Element {

  const s = props.data.state as AppState;

  return (
    <>
      <ColorModeToggle />
      {/* <ShowAuthors /> */}
    </>
  )
}

// export default AppComponent;

export default { AppComponent, ToolbarComponent };
