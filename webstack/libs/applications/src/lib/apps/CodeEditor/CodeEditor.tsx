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
  Box,
  Button,
  ButtonGroup,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { debounce } from 'throttle-debounce';
import { MdLock, MdLockOpen, MdRemove, MdAdd, MdFileDownload, MdFileUpload, MdOutlineLightbulb } from 'react-icons/md';
// Date manipulation (for filename)
import { format as dateFormat } from 'date-fns/format';

// Import Monaco Editor
import Editor, { OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';

// Sage3 Imports
import { useAppStore, useAssetStore, downloadFile, ConfirmValueModal, isUUIDv4, apiUrls, setupApp, AiAPI } from '@sage3/frontend';
import { AiQueryRequest, stringContainsCode } from '@sage3/shared';
import { Asset } from '@sage3/shared/types';

import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from '.';

// Yjs Imports
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

// CodeEditor API
import { create } from 'zustand';
import { generateRequest } from './ai-request-generator';

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
interface CodeStore {
  editor: { [key: string]: editor.IStandaloneCodeEditor };
  setEditor: (id: string, r: editor.IStandaloneCodeEditor) => void;
}

const useStore = create<CodeStore>()((set) => ({
  editor: {} as { [key: string]: editor.IStandaloneCodeEditor },
  setEditor: (id: string, editor: editor.IStandaloneCodeEditor) => set((s) => ({ ...s, editor: { ...s.editor, ...{ [id]: editor } } })),
}));

/* App component for CodeEditor */
function AppComponent(props: App): JSX.Element {
  // SAGE state
  const s = props.data.state as AppState;
  const { update, updateState } = useAppStore((state) => state);

  // Assets
  const assets = useAssetStore((state) => state.assets);

  // Asset data structure
  const [file, setFile] = useState<Asset>();

  // Styling
  const defaultTheme = useColorModeValue('vs', 'vs-dark');

  // Monaco Editor Ref
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { setEditor } = useStore();

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
      if (file && editorRef.current) {
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
        // Need to set the content in the editor here with 'text'
      }
    }

    fetchAsset();
  }, [file, editorRef.current]);

  // Update local value with value from the server
  useEffect(() => {
    // setSpec(s.content);
  }, [s.content]);

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
    // setSpec(value);
    // Update the text when not typing
    debounceFunc.current(value);
  }

  const handleMount: OnMount = (editor) => {
    // save the editorRef
    editorRef.current = editor;
    // Save the editor in the store
    setEditor(props._id, editor);
    // Connect to Yjs
    connectToYjs(editor);
  };

  const connectToYjs = (editor: editor.IStandaloneCodeEditor) => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

    const doc = new Y.Doc();
    const yText = doc.getText('monaco');

    const provider = new WebsocketProvider(`${protocol}://${window.location.host}/yjs`, props._id, doc);
    // Ensure we are always operating on the same line endings
    const model = editor.getModel();
    if (model) model.setEOL(0);
    new MonacoBinding(yText, editor.getModel() as editor.ITextModel, new Set([editor]), provider.awareness);

    provider.on('sync', () => {
      const users = provider.awareness.getStates();
      const count = users.size;
      // I'm the only one here, so need to sync current ydoc with that is saved in the database
      if (count == 1) {
        // Does the app have code?
        if (s.content) {
          // Clear any existing lines
          yText.delete(0, yText.length);
          // Set the lines from the database
          yText.insert(0, s.content);
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
            readOnly: s.readonly,
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
  const { update, updateState } = useAppStore((state) => state);
  const createApp = useAppStore((state) => state.create);

  // Editor in Store
  const editor = useStore((state) => state.editor[props._id] as editor.IStandaloneCodeEditor);

  const fontSizeBackground = useColorModeValue('teal.500', 'teal.200');
  const fontSizeColor = useColorModeValue('white', 'black');

  // Online Models
  const [onlineModels, setOnlineModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Check if the AI is online
  useEffect(() => {
    async function fetchStatus() {
      const response = await AiAPI.status();
      setOnlineModels(response.onlineModels);
      if (response.onlineModels.length > 0) setSelectedModel(response.onlineModels[0]);
      else setSelectedModel('');
    }
    fetchStatus();
  }, []);

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
    const fs = Math.min(48, s.fontSize + 4);
    updateState(props._id, { fontSize: fs });
  }

  // Smaller font size
  function handleDecreaseFont() {
    const fs = Math.max(8, s.fontSize - 4);
    updateState(props._id, { fontSize: fs });
  }

  // Handle Toggle Readonly
  function handleReadonly() {
    updateState(props._id, { readonly: !s.readonly });
  }

  function handleLanguageChange(lang: string) {
    updateState(props._id, { language: lang });
    update(props._id, { title: `CodeEditor: ${lang}` });
  }

  function handleModelChange(model: string) {
    setSelectedModel(model);
  }

  async function refactor() {
    if (!editor) return;
    const selection = editor.getSelection();
    // Get the line before the selection
    if (!selection) return;
    const selectionText = editor.getModel()?.getValueInRange(selection);
    if (!selectionText) return;
    const queryRequest = {
      input: generateRequest(s.language, selectionText, 'refactor'),
      model: selectedModel,
    } as AiQueryRequest;
    const result = await AiAPI.query(queryRequest);
    if (result.success && result.output) {
      // Create new range with the same start and end line
      editor.executeEdits('handleHighlight', [{ range: selection, text: result.output }]);
    } else {
      toast({
        title: 'Refactor Code',
        description: 'Refactor failed: ' + result.error_message,
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
    }
  }

  // Explain the code
  async function explain() {
    if (!roomId || !boardId) return;
    if (!editor) return;
    const selection = editor.getSelection();
    // Get the line before the selection
    if (!selection) return;
    const selectionText = editor.getModel()?.getValueInRange(selection);
    if (!selectionText) return;
    const queryRequest = {
      input: generateRequest(s.language, selectionText, 'explain'),
      model: selectedModel,
    } as AiQueryRequest;
    const result = await AiAPI.query(queryRequest);
    if (result.success && result.output) {
      const w = props.data.size.width;
      const h = props.data.size.height;
      const x = props.data.position.x + w + 20;
      const y = props.data.position.y;
      createApp(
        setupApp('Explain Code', 'Stickie', x, y, roomId, boardId, { w, h }, { text: result.output, fontSize: 24, color: 'yellow' })
      );
    } else {
      toast({
        title: 'Explain Code',
        description: 'Explain failed: ' + result.error_message,
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
    }
  }

  // Comment the code
  async function comment() {
    if (!editor) return;
    const selection = editor.getSelection();
    // Get the line before the selection
    if (!selection) return;
    const selectionText = editor.getModel()?.getValueInRange(selection);
    if (!selectionText) return;
    const queryRequest = {
      input: generateRequest(s.language, selectionText, 'comment'),
      model: selectedModel,
    } as AiQueryRequest;
    const result = await AiAPI.query(queryRequest);
    if (result.success && result.output) {
      // Remove all instances of ``` from generated_text
      const cleanedText = result.output.replace(/```/g, '');
      editor.executeEdits('handleHighlight', [{ range: selection, text: cleanedText }]);
    }
  }

  // Generate code
  async function generate() {
    if (!editor) return;
    const selection = editor.getSelection();
    // Get the line before the selection
    if (!selection) return;
    const selectionText = editor.getModel()?.getValueInRange(selection);
    if (!selectionText) return;
    const queryRequest = {
      input: generateRequest(s.language, selectionText, 'comment'),
      model: selectedModel,
    } as AiQueryRequest;
    const result = await AiAPI.query(queryRequest);
    if (result.success && result.output) {
      // Remove all instances of ``` from generated_text
      const cleanedText = result.output.replace(/```/g, '');
      editor.executeEdits('handleHighlight', [{ range: selection, text: cleanedText }]);
    }
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

      <ButtonGroup isAttached size="xs" ml={1} minWidth="100px">
        <Menu placement="top-start">
          <Tooltip hasArrow={true} label={'Remote Actions'} openDelay={300}>
            <MenuButton as={Button} colorScheme="teal" aria-label="layout" minWidth="100px">
              {s.language}
            </MenuButton>
          </Tooltip>
          <MenuList minWidth="100px" fontSize={'sm'}>
            {languageExtensions.map((lang) => (
              <MenuItem key={lang.name} onClick={() => handleLanguageChange(lang.name)}>
                {lang.name}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </ButtonGroup>

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
        <Tooltip placement="top" hasArrow={true} label={s.readonly ? 'Read only' : 'Edit'} openDelay={400}>
          <Button onClick={handleReadonly} size="xs" p="0" mx="2px" colorScheme={'teal'}>
            {s.readonly ? <MdLock /> : <MdLockOpen />}
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

      <ButtonGroup isAttached size="xs" colorScheme="orange" ml={1} isDisabled={onlineModels.length == 0}>
        <Menu placement="top-start">
          <Tooltip hasArrow={true} label={'Ai Model Selection'} openDelay={300}>
            <MenuButton as={Button} colorScheme="orange" width="100px" aria-label="layout">
              {selectedModel}
            </MenuButton>
          </Tooltip>
          <MenuList minWidth="150px" fontSize={'sm'}>
            {onlineModels.map((model) => (
              <MenuItem key={model} onClick={() => handleModelChange(model)}>
                {model}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </ButtonGroup>

      {/* Smart Action */}
      <ButtonGroup isAttached size="xs" colorScheme="orange" ml={1} isDisabled={selectedModel === ''}>
        <Menu placement="top-start">
          <Tooltip hasArrow={true} label={'Remote Actions'} openDelay={300}>
            <MenuButton as={Button} colorScheme="orange" aria-label="layout">
              <MdOutlineLightbulb />
            </MenuButton>
          </Tooltip>
          <MenuList minWidth="150px" fontSize={'sm'}>
            <MenuItem onClick={explain}>Explain</MenuItem>
            <MenuItem onClick={refactor}>Refactor</MenuItem>
            <MenuItem onClick={comment}>Comment</MenuItem>
            <MenuItem onClick={generate}>Generate</MenuItem>
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
