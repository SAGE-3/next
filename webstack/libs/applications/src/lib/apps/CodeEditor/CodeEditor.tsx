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
import { MdLock, MdLockOpen, MdRemove, MdAdd, MdFileDownload, MdFileUpload, MdOutlineLightbulb, MdCode } from 'react-icons/md';

// Date manipulation (for filename)
import { format as dateFormat } from 'date-fns/format';

// Import Monaco Editor
import Editor, { OnMount } from '@monaco-editor/react';
import { editor, Range } from 'monaco-editor';

// Sage3 Imports
import {
  useAppStore,
  downloadFile,
  ConfirmValueModal,
  apiUrls,
  setupApp,
  AiAPI,
  useYjs,
  serverTime,
  useUser,
  YjsRoomConnection,
} from '@sage3/frontend';
import { AiQueryRequest } from '@sage3/shared';

import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from '.';

// Yjs Imports
import { MonacoBinding } from 'y-monaco';

// CodeEditor API
import { create } from 'zustand';
import { generateRequest, generateSystemPrompt } from './ai-request-generator';

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
  { name: 'r', extension: 'r' },
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
  const updateState = useAppStore((state) => state.updateState);

  // User
  const { user } = useUser();

  // Styling
  const defaultTheme = useColorModeValue('vs', 'vs-dark');

  // Monaco Editor Ref
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { setEditor } = useStore();

  // Use Yjs
  const { yApps } = useYjs();

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
    connectToYjs(editor, yApps!);
  };

  const connectToYjs = async (editor: editor.IStandaloneCodeEditor, yRoom: YjsRoomConnection) => {
    const yText = yRoom.doc.getText(props._id);
    const provider = yRoom.provider;

    // Ensure we are always operating on the same line endings
    const model = editor.getModel();
    if (model) model.setEOL(0);
    new MonacoBinding(yText, editor.getModel() as editor.ITextModel, new Set([editor]), provider.awareness);

    const users = provider.awareness.getStates();
    const count = users.size;

    // Sync current ydoc with that is saved in the database
    const syncStateWithDatabase = () => {
      // Clear any existing lines
      yText.delete(0, yText.length);
      // Set the lines from the database
      yText.insert(0, s.content);
    };

    // If I am the only one here according to Yjs, then sync with database
    if (count == 1) {
      syncStateWithDatabase();
    } else if (count > 1 && props._createdBy === user?._id) {
      // There are other users here and I created this app.
      // Is this app less than 5 seconds old...this feels hacky
      const now = await serverTime();
      const created = props._createdAt;
      // Then we need to sync with database due to Yjs not being able to catch the initial state
      if (now.epoch - created < 5000) {
        // I created this
        syncStateWithDatabase();
      }
    }
  };

  return (
    <AppWindow app={props} hideBackgroundIcon={MdCode}>
      <Box p={2} border={'none'} overflow="hidden" height="100%" borderRadius={'md'}>
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
            lineNumbers: 'on',
            lineNumbersMinChars: 5,
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            quickSuggestions: false,
            glyphMargin: false,
            wordWrap: 'on',
            lineDecorationsWidth: 0,
            scrollBeyondLastLine: false,
            wordWrapColumn: 80,
            wrappingStrategy: 'simple',
            renderLineHighlight: 'line',
            renderLineHighlightOnlyWhenFocus: true,
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
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
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
      const response = await AiAPI.code.status();
      setOnlineModels(response.onlineModels);
      if (response.onlineModels.length > 0) setSelectedModel(response.onlineModels[0]);
      else setSelectedModel('');
    }
    fetchStatus();

    // Set the title
    if (s.filename) update(props._id, { title: `CodeEditor: ${s.filename}` });
    else update(props._id, { title: `CodeEditor: ${s.language}` });
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
    if (s.filename) update(props._id, { title: `CodeEditor: ${s.filename}` });
    else update(props._id, { title: `CodeEditor: ${lang}` });
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
      prompt: generateSystemPrompt(s.language, selectionText, 'refactor'),
      input: generateRequest(s.language, selectionText, 'refactor'),
      model: selectedModel,
    } as AiQueryRequest;
    const result = await AiAPI.code.query(queryRequest);
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
      prompt: generateSystemPrompt(s.language, selectionText, 'explain'),
      input: generateRequest(s.language, selectionText, 'explain'),
      model: selectedModel,
    } as AiQueryRequest;
    const result = await AiAPI.code.query(queryRequest);
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
      prompt: generateSystemPrompt(s.language, selectionText, 'comment'),
      input: generateRequest(s.language, selectionText, 'comment'),
      model: selectedModel,
    } as AiQueryRequest;
    const result = await AiAPI.code.query(queryRequest);
    if (result.success && result.output) {
      // Remove all instances of ``` from generated text
      const cleanedText = result.output.replace(/```.*/g, '');
      editor.executeEdits('handleHighlight', [{ range: selection, text: cleanedText.trim() }]);
    }
  }

  // Generate code
  async function generate() {
    if (!editor) return;
    const selection = editor.getSelection();
    if (!selection) return;
    let selectionText;
    if (selection.isEmpty()) {
      // Get the whole document
      selectionText = editor.getModel()?.getValue();
    } else {
      // Get the selected text
      selectionText = editor.getModel()?.getValueInRange(selection);
      // Comment out the selected text
      editor.trigger('comment', 'editor.action.commentLine', null);
    }
    if (!selectionText) return;
    const queryRequest = {
      prompt: generateSystemPrompt(s.language, selectionText, 'generate'),
      input: generateRequest(s.language, selectionText, 'generate'),
      model: selectedModel,
    } as AiQueryRequest;
    const result = await AiAPI.code.query(queryRequest);
    if (result.success && result.output) {
      // Remove all instances of ``` from generated text
      const cleanedText = result.output.replace(/```.*/g, '');
      // Get the current cursor position
      const position = editor.getPosition();
      if (!position) return;
      if (selection.isEmpty()) {
        // Add the code after the current cursor position
        // Create a new position right after the current cursor position
        const newPosition = {
          lineNumber: position.lineNumber,
          column: position.column,
        };
        // The text to append
        const textToAppend = '\n' + cleanedText.trim();
        // Execute the edit to insert the text
        editor.executeEdits('my-source', [
          {
            range: new Range(newPosition.lineNumber, newPosition.column, newPosition.lineNumber, newPosition.column),
            text: textToAppend,
            forceMoveMarkers: true,
          },
        ]);
      } else {
        // editor.executeEdits('handleHighlight', [{ range: selection, text: cleanedText.trim() }]);
        // Create a new position right after the current cursor position
        const newPosition = {
          lineNumber: position.lineNumber + 1,
          column: position.column,
        };
        // Execute the edit to insert the text
        editor.executeEdits('my-source', [
          {
            range: new Range(newPosition.lineNumber, newPosition.column, newPosition.lineNumber, newPosition.column),
            text: cleanedText.trim(),
            forceMoveMarkers: true,
          },
        ]);
      }
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

      {/* AI Model selection */}
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
