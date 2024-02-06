/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React Imports
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router';

// Library imports
import {
  Box, Button, ButtonGroup, Tooltip, useColorModeValue, useDisclosure, useToast,
  Menu, MenuButton, MenuList, MenuItem
} from '@chakra-ui/react';
import { debounce } from 'throttle-debounce';
import { MdLock, MdLockOpen, MdRemove, MdAdd, MdFileDownload, MdFileUpload, MdMenu, MdTipsAndUpdates } from 'react-icons/md';
// Date manipulation (for filename)
import { format as dateFormat } from 'date-fns/format';

// Import Monaco Editor
import Editor, { OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';


// Sage3 Imports
import { useAppStore, useAssetStore, downloadFile, ConfirmValueModal, isUUIDv4, apiUrls, setupApp } from '@sage3/frontend';
import { stringContainsCode } from '@sage3/shared';
import { Asset } from '@sage3/shared/types';

import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from '.';

// Store between the app and the toolbar
import { create } from 'zustand';

// Yjs Imports
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

interface CodeStore {
  readonly: { [key: string]: boolean };
  setReadonly: (id: string, r: boolean) => void;
  yText: { [key: string]: Y.Text };
  setYText: (id: string, text: Y.Text) => void;
}

const useStore = create<CodeStore>()((set) => ({
  readonly: {} as { [key: string]: boolean },
  setReadonly: (id: string, r: boolean) => set((s) => ({ ...s, readonly: { ...s.readonly, ...{ [id]: r } } })),
  yText: {} as { [key: string]: Y.Text },
  setYText: (id: string, text: Y.Text) => set((s) => ({ ...s, yText: { ...s.yText, ...{ [id]: text } } })),
}));

const languageExtensions = [
  { name: 'json', extension: 'json' },
  { name: 'yaml', extension: 'yaml' },
  { name: 'javascript', extension: 'js' },
  { name: 'typescript', extension: 'ts' },
  { name: 'python', extension: 'py' },
  { name: 'html', extension: 'html' },
  { name: 'css', extension: 'css' },
  { name: 'cs', extension: 'cs' },
  { name: 'cpp', extension: 'cpp' },
  { name: 'c', extension: 'c' },
  { name: 'java', extension: 'java' },
];

/* App component for CodeEditor */
function AppComponent(props: App): JSX.Element {
  // SAGE state
  const s = props.data.state as AppState;
  const assets = useAssetStore((state) => state.assets);
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  // Styling
  const defaultTheme = useColorModeValue('vs', 'vs-dark');

  // Asset data structure
  const [file, setFile] = useState<Asset>();

  // LocalState
  const [spec, setSpec] = useState(s.content);
  const readonly = useStore((state) => state.readonly[props._id]);
  const setReadonly = useStore((state) => state.setReadonly);
  const yText = useStore((state) => state.yText[props._id]);
  const setYText = useStore((state) => state.setYText);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Initialize the readonly state
  useEffect(() => {
    setReadonly(props._id, true);
  }, []);

  // Convert the ID to an asset
  useEffect(() => {
    const isUUID = isUUIDv4(s.assetid);
    if (isUUID) {
      const myasset = assets.find((a) => a._id === s.assetid);
      if (myasset) {
        setFile(myasset);
        // Update the app title
        update(props._id, { title: myasset?.data.originalfilename });
      }
    } else {
      update(props._id, { title: 'CodeEditor: ' + (s.language || '') });
    }
  }, [s.assetid, assets]);

  // Once we have the asset, get the data
  useEffect(() => {
    async function fetchAsset() {
      if (file) {
        // Look for the file in the asset store
        const localurl = apiUrls.assets.getAssetById(file.data.file);
        // Get the content of the file
        const response = await fetch(localurl, {
          headers: {
            'Content-Type': 'text/plain',
            Accept: 'text/plain',
          },
        });
        // Get the content of the file
        const text = await response.text();
        const lang = stringContainsCode(text);
        updateState(props._id, { language: lang });
        console.log('Set spec', text.length);
        setSpec(text);
        if (yText) {
          yText.insert(0, spec);
        } else {
          console.log('No yText');
        }
      }
    }
    fetchAsset();
  }, [file, yText]);

  // Update local value with value from the server
  useEffect(() => {
    setSpec(s.content);
  }, [s.content]);

  // Sync the selection
  useEffect(() => {
    if (s.selection && s.selection.length === 4 && editorRef.current) {
      const myselection = editorRef.current.getSelection();
      if (!myselection) return;
      const newselection = s.selection;
      if (
        myselection.startLineNumber === newselection[0] &&
        myselection.startColumn === newselection[1] &&
        myselection.endLineNumber === newselection[2] &&
        myselection.endColumn === newselection[3]
      )
        return;
      editorRef.current.setSelection({
        startLineNumber: newselection[0],
        startColumn: newselection[1],
        endLineNumber: newselection[2],
        endColumn: newselection[3],
      });
    }
  }, [s.selection]);

  // Sync the scroll position
  useEffect(() => {
    if (!editorRef.current) return;
    if (s.scrollPosition !== undefined) {
      editorRef.current.setScrollPosition({ scrollTop: s.scrollPosition }, 1); // 1: immediate, 0: smooth
    }
  }, [s.scrollPosition]);

  // Saving the text after 1sec of inactivity
  const debounceSave = debounce(1000, (val) => {
    updateState(props._id, { content: val });
  });

  // Keep a copy of the function
  const debounceFunc = useRef(debounceSave);

  // callback for aceditor change
  function handleTextChange(value: string | undefined) {
    if (!value) return;
    // Update the local value
    setSpec(value);
    // Update the text when not typing
    debounceFunc.current(value);
  }

  const handleMount: OnMount = (editor) => {
    // save the editorRef
    editorRef.current = editor;
    // Connect to Yjs
    console.log('Before connect', spec.length)
    connectToYjs(editor);
    // Track the scroll position
    editor.onDidScrollChange(function (event) {
      updateState(props._id, { scrollPosition: event.scrollTop });
    });
    // Add an event listener for the CursorSelection event
    editor.onDidChangeCursorSelection(function (event) {
      // The event object contains information about the selection change
      const selection = event.selection;
      // test if actual selection and not just cursot movement
      if (selection.startLineNumber !== selection.endLineNumber || selection.startColumn !== selection.endColumn) {
        updateState(props._id, {
          selection: [selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn],
        });
      }
    });
  };

  const connectToYjs = (editor: editor.IStandaloneCodeEditor) => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

    const doc = new Y.Doc();
    const lyText = doc.getText('monaco');
    setYText(props._id, lyText);
    const provider = new WebsocketProvider(`${protocol}://${window.location.host}/yjs`, props._id, doc);
    // Ensure we are always operating on the same line endings
    const model = editor.getModel();
    if (model) model.setEOL(0);
    new MonacoBinding(lyText, editor.getModel() as editor.ITextModel, new Set([editor]), provider.awareness);

    provider.on('sync', () => {
      const users = provider.awareness.getStates();
      const count = users.size;
      // I'm the only one here, so need to sync current ydoc with that is saved in the database
      if (count == 1) {
        // Does the app have code?
        console.log('Spec', spec.length)
        if (spec) {
          // Clear any existing lines
          lyText.delete(0, lyText.length);
          // Set the lines from the database
          lyText.insert(0, spec);
        }
      }
    });
  };

  return (
    <AppWindow app={props}>
      <Box p={0} border={'none'} overflow="hidden" height="100%">
        <Editor
          // value={spec}
          onChange={handleTextChange}
          onMount={handleMount}
          theme={defaultTheme}
          height={'100%'}
          language={s.language}
          options={{
            readOnly: readonly,
            fontSize: s.fontSize,
            contextmenu: false,
            minimap: { enabled: false },
            lineNumbersMinChars: 4,
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            quickSuggestions: false,
            glyphMargin: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            lineDecorationsWidth: 0,
            scrollBeyondLastLine: false,
            wordWrapColumn: 80,
            wrappingStrategy: 'advanced',
            fontFamily: "'Source Code Pro', 'Menlo', 'Monaco', 'Consolas', 'monospace'",
            scrollbar: {
              useShadows: true,
              verticalHasArrows: true,
              horizontalHasArrows: true,
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 18,
              horizontalScrollbarSize: 18,
              arrowSize: 30,
            },
          }}
        />
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app CodeEditor */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // Room and board
  const { roomId, boardId } = useParams();
  // display some notifications
  const toast = useToast();
  // Save Confirmation  Modal
  const { isOpen: saveIsOpen, onOpen: saveOnOpen, onClose: saveOnClose } = useDisclosure();
  // State
  const readonly = useStore((state) => state.readonly[props._id]);
  const setReadonly = useStore((state) => state.setReadonly);
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);

  const fontSizeBackground = useColorModeValue('teal.500', 'teal.200');
  const fontSizeColor = useColorModeValue('white', 'black');

  // Download the code into a local file
  const downloadCode = (): void => {
    const lang = languageExtensions.find((obj) => obj.name === s.language)?.extension;
    const extension = lang || 'txt';
    // Current date
    const dt = dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    // generate a URL containing the text of the note
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(s.content);
    // Make a filename with username and date
    const filename = 'code-' + dt + '.' + extension;
    // Go for download
    downloadFile(txturl, filename);
  };

  // Save the code in the asset manager
  const handleSave = useCallback(
    (val: string) => {
      // Save the code in the asset manager
      if (roomId) {
        // Create a form to upload the file
        const fd = new FormData();
        const codefile = new File([new Blob([s.content])], val);
        fd.append('files', codefile);
        // Add fields to the upload form
        fd.append('room', roomId);
        // Upload with a POST request
        fetch(apiUrls.assets.upload, { method: 'POST', body: fd })
          .catch((error: Error) => {
            toast({
              title: 'Upload',
              description: 'Upload failed: ' + error.message,
              status: 'warning',
              duration: 4000,
              isClosable: true,
            });
          })
          .finally(() => {
            toast({
              title: 'Upload',
              description: 'Upload complete',
              status: 'info',
              duration: 4000,
              isClosable: true,
            });
          });
      }
    },
    [s.content, roomId]
  );

  // Larger font size
  function handleIncreaseFont() {
    const fs = s.fontSize + 4;
    updateState(props._id, { fontSize: fs });
  }

  // Smaller font size
  function handleDecreaseFont() {
    const fs = s.fontSize - 4;
    updateState(props._id, { fontSize: fs });
  }

  // Explain the code
  function explainCode() {
    const modelHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    const modelBody = {
      inputs: `[INST]Explain the following ${s.language} code: ${s.content}[/INST]`,
      parameters: {
        max_new_tokens: 400
      }
    };
    console.log('Request Code', JSON.stringify(modelBody, null, 4));
    // Send the request
    fetch("https://astrolab.evl.uic.edu:4343/generate", {
      method: 'POST',
      headers: modelHeaders,
      body: JSON.stringify(modelBody),
    }).then((response) => response.json())
      .then((data) => {
        if (roomId && boardId && data) {
          const result = data.generated_text || 'No result';
          console.log(result);
          const w = props.data.size.width;
          const h = props.data.size.height;
          const x = props.data.position.x + w + 20;
          const y = props.data.position.y;
          createApp(setupApp('Explain Code', 'Stickie', x, y, roomId, boardId,
            { w, h }, { text: result, fontSize: 24, color: 'yellow' }));
        }
      });
  }

  // Refector the code
  function refactorCode() {
    const modelHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    const modelBody = {
      inputs: `[INST]Can you refactor this ${s.language} code: ${s.content}[/INST]`,
      parameters: {
        max_new_tokens: 400
      }
    };
    console.log('Request Code', JSON.stringify(modelBody, null, 4));
    // Send the request
    fetch("https://astrolab.evl.uic.edu:4343/generate", {
      method: 'POST',
      headers: modelHeaders,
      body: JSON.stringify(modelBody),
    }).then((response) => response.json())
      .then((data) => {
        if (roomId && boardId && data) {
          const result = data.generated_text || 'No result';
          console.log(result);
          const w = props.data.size.width;
          const h = props.data.size.height;
          const x = props.data.position.x + w + 20;
          const y = props.data.position.y;
          createApp(setupApp('Explain Code', 'Stickie', x, y, roomId, boardId,
            { w, h }, { text: result, fontSize: 24, color: 'orange' }));
        }
      });
  }

  // Comment the code
  function commentCode() {
    const modelHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    const modelBody = {
      inputs: `[INST] <<SYS>> You are a good programmer. Return only the new version code. <<SYS>> Can you add comments in this ${s.language} code to explain clearly what each instruction is supposed to do: ${s.content} [/INST]`,
      parameters: {
        max_new_tokens: 400
      }
    };
    console.log('Request Code', JSON.stringify(modelBody, null, 4));
    // Send the request
    fetch("https://astrolab.evl.uic.edu:4343/generate", {
      method: 'POST',
      headers: modelHeaders,
      body: JSON.stringify(modelBody),
    }).then((response) => response.json())
      .then((data) => {
        if (roomId && boardId && data) {
          const result = data.generated_text || 'No result';
          console.log(result);
          const w = props.data.size.width;
          const h = props.data.size.height;
          const x = props.data.position.x + w + 20;
          const y = props.data.position.y;
          createApp(setupApp('CodeEditor', 'CodeEditor', x, y, roomId, boardId,
            { w, h }, { content: result, language: s.language, fontSize: s.fontSize }));
        }
      });
  }

  // Generate code
  function generateCode() {
    const modelHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    /*
    for follow up prompt:
      [INST] {prompt1} [/INST]
      {response1}
      [INST] {prompt2} [/INST]
      {response2}
    */

    const query = `Load a CSV file into a pandas dataframe and display the data using matplotlib, using 300dpi resolution.`;
    // const query = `Load a CSV file into a pandas dataframe and display the first 5 rows.`;
    // const query = `Write an input text box with React. Use Typescruipt and Material UI.`;
    // const query = `Write a python function to integrate x**2 from x_min to x_max`;
    // const query = `Write a python function to generate the nth fibonacci number.`;
    const modelBody = {
      inputs: `[INST] <<SYS>> You are an expert programmer that helps to write Python code based on the user request. Don't be too verbose. Return only commented code. <<SYS>> ${query} [/INST]`,
      parameters: {
        max_new_tokens: 400
      }
    };
    console.log('Request Code', JSON.stringify(modelBody, null, 4));
    // Send the request
    fetch("https://astrolab.evl.uic.edu:4343/generate", {
      method: 'POST',
      headers: modelHeaders,
      body: JSON.stringify(modelBody),
    }).then((response) => response.json())
      .then((data) => {
        if (roomId && boardId && data) {
          const result: string = data.generated_text || 'No result';
          const lines = result.split('\n');
          lines.shift();
          lines.pop();
          const w = props.data.size.width;
          const h = props.data.size.height;
          const x = props.data.position.x + w + 20;
          const y = props.data.position.y;
          createApp(setupApp('CodeEditor', 'CodeEditor', x, y, roomId, boardId,
            { w, h }, { content: lines.join('\n'), language: 'python', fontSize: s.fontSize }));
        }
      });
  }


  return (
    <>
      <ConfirmValueModal
        isOpen={saveIsOpen}
        onClose={saveOnClose}
        onConfirm={handleSave}
        title="Save Code in Asset Manager"
        message="Select a file name:"
        initiaValue={
          'code-' +
          dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss') +
          '.' +
          languageExtensions.find((obj) => obj.name === s.language)?.extension || 'txt'
        }
        cancelText="Cancel"
        confirmText="Save"
        confirmColor="green"
      />

      <ButtonGroup isAttached size="xs" colorScheme="teal" ml={1}>
        <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
          <Button isDisabled={s.fontSize <= 6} onClick={() => handleDecreaseFont()}>
            <MdRemove />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Current Font Size'} openDelay={400}>
          <Box px={2} m={0} height={'24px'} lineHeight={'24px'} fontSize="12px" background={fontSizeBackground} color={fontSizeColor}>
            {s.fontSize}
          </Box>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
          <Button isDisabled={s.fontSize >= 86} onClick={() => handleIncreaseFont()}>
            <MdAdd />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top" hasArrow={true} label={readonly ? 'Read only' : 'Edit'} openDelay={400}>
          <Button
            onClick={() => (readonly ? setReadonly(props._id, false) : setReadonly(props._id, true))}
            size="xs"
            p="0"
            mx="2px"
            colorScheme={'teal'}
          >
            {readonly ? <MdLock /> : <MdLockOpen />}
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Save Code in Asset Manager'} openDelay={400}>
          <Button onClick={saveOnOpen} _hover={{ opacity: 0.7 }} isDisabled={s.content.length === 0}>
            <MdFileUpload />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Download Code'} openDelay={400}>
          <Button onClick={downloadCode} _hover={{ opacity: 0.7 }}>
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>

      {/* Smart Action */}
      <ButtonGroup isAttached size="xs" colorScheme="orange" ml={1}>
        <Menu placement="top-start">
          <Tooltip hasArrow={true} label={'Remote Actions'} openDelay={300}>
            <MenuButton as={Button} colorScheme="orange" aria-label="layout">
              <MdMenu />
            </MenuButton>
          </Tooltip>
          <MenuList minWidth="150px" fontSize={'sm'}>
            <MenuItem icon={<MdTipsAndUpdates />} onClick={explainCode}>
              Explain Code
            </MenuItem>
            <MenuItem icon={<MdTipsAndUpdates />} onClick={refactorCode}>
              Refactor Code
            </MenuItem>
            <MenuItem icon={<MdTipsAndUpdates />} onClick={commentCode}>
              Comment Code
            </MenuItem>
            <MenuItem icon={<MdTipsAndUpdates />} onClick={generateCode}>
              Generate Code
            </MenuItem>
          </MenuList>
        </Menu>
      </ButtonGroup>

    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
