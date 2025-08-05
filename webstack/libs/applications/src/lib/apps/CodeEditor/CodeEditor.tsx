/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React Imports
import { useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router';
import { renderToStaticMarkup } from 'react-dom/server';

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
import { MdLock, MdLockOpen, MdRemove, MdAdd, MdFileDownload, MdFileUpload, MdCode, MdSlideshow } from 'react-icons/md';

// Markdown
import Markdown from 'markdown-to-jsx';
// Date manipulation (for filename)
import { format as dateFormat } from 'date-fns/format';
// Import Monaco Editor
import Editor, { OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';

// Sage3 Imports
import {
  useAppStore,
  downloadFile,
  ConfirmValueModal,
  apiUrls,
  useYjs,
  serverTime,
  useUser,
  YjsRoomConnection,
  setupApp,
  useUIStore,
  useLinkStore,
} from '@sage3/frontend';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from '.';

// Yjs Imports
import { MonacoBinding } from 'y-monaco';

// CodeEditor API
import { create } from 'zustand';

const languageExtensions = [
  { name: 'markdown', extension: 'md' },
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
  { name: 'r', extension: 'R' },
  { name: 'julia', extension: 'jl' },
].sort((a, b) => {
  return a.name.localeCompare(b.name);
});

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
  const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A'); // gray.100  gray.800

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

    // Update database on key up
    editor.onKeyUp((e) => {
      if (e.code === 'Escape') {
        // Deselect the app
        useUIStore.getState().setSelectedApp('');
        // Unfocus the app
        useUIStore.getState().setFocusedAppId('');
        return;
      }
    });
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
      <Box p={2} border={'none'} overflow="hidden" height="100%" borderRadius={'md'} background={bgColor}>
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
  const addLink = useLinkStore((state) => state.addLink);

  // Editor in Store
  // const editor = useStore((state) => state.editor[props._id] as editor.IStandaloneCodeEditor);

  const fontSizeBackground = useColorModeValue('teal.500', 'teal.200');
  const fontSizeColor = useColorModeValue('white', 'black');

  // Check if the AI is online
  useEffect(() => {
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

  // Preview some content
  const previewContent = async () => {
    if (!roomId || !boardId) return;
    if (s.language === 'markdown') {
      // Create a new app with the markdown
      const elt = <Markdown>{s.content}</Markdown>;
      const htmlResult = renderToStaticMarkup(elt);
      const w = props.data.size.width;
      const h = props.data.size.height;
      const x = props.data.position.x + w + 20;
      const y = props.data.position.y;
      const app = setupApp('Markdown', 'IFrame', x, y, roomId, boardId, { w, h }, { doc: htmlResult });
      app.sourceApps = [props._id]; // Link to the original app
      const res = await createApp(app);
      // If the app was created successfully, add a link to the provenance
      if (res.success === true) {
        const sourceId = props._id;
        const targetId = res.data._id;
        addLink(sourceId, targetId, props.data.boardId, 'provenance');
      }
    } else if (s.language === 'html') {
      // Create a new app with the HTML
      const htmlResult = s.content;
      const w = props.data.size.width;
      const h = props.data.size.height;
      const x = props.data.position.x + w + 20;
      const y = props.data.position.y;
      const app = setupApp('HTML', 'IFrame', x, y, roomId, boardId, { w, h }, { doc: htmlResult });
      app.sourceApps = [props._id]; // Link to the original app
      const res = await createApp(app);
      // If the app was created successfully, add a link to the provenance
      if (res.success === true) {
        const sourceId = props._id;
        const targetId = res.data._id;
        addLink(sourceId, targetId, props.data.boardId, 'provenance');
      }
    }
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
        <Menu placement="top">
          <Tooltip hasArrow={true} label={'Language'} openDelay={300}>
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
        <Tooltip placement="top" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
          <Button isDisabled={s.fontSize <= 6} onClick={() => handleDecreaseFont()} size='xs' px={0}>
            <MdRemove size="16px"/>
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Current Font Size'} openDelay={400}>
          <Box px={2} m={0} height={'24px'} lineHeight={'24px'} fontSize="16px" background={fontSizeBackground} color={fontSizeColor}>
            {s.fontSize}
          </Box>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
          <Button isDisabled={s.fontSize >= 86} onClick={() => handleIncreaseFont()} size='xs' px={0}>
            <MdAdd size="16px"/>
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal" ml={1}>
        <Tooltip placement="top" hasArrow={true} label={s.readonly ? 'Read only' : 'Edit'} openDelay={400}>
          <Button onClick={handleReadonly}   mx="2px" colorScheme={'teal'} size='xs' px={0}>
            {s.readonly ? <MdLock size="16px"/> : <MdLockOpen size="16px"/>}
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal" ml={1}>
        <Tooltip placement="top" hasArrow={true} label={'Save Code in Asset Manager'} openDelay={400}>
          <Button onClick={saveOnOpen} _hover={{ opacity: 0.7 }} isDisabled={s.content.length === 0} size='xs' px={0}>
            <MdFileUpload size="16px"/>
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Download Code'} openDelay={400}>
          <Button onClick={downloadCode} _hover={{ opacity: 0.7 }} size='xs' px={0}>
            <MdFileDownload size="16px"/>
          </Button>
        </Tooltip>
      </ButtonGroup>
      {(s.language === 'markdown' || s.language === 'html') && (
        <ButtonGroup isAttached size="xs" colorScheme="teal" ml={1}>
          <Tooltip placement="top" hasArrow={true} label={'Preview Content'} openDelay={400}>
            <Button onClick={previewContent} _hover={{ opacity: 0.7 }} size='xs' px={0}>
              <MdSlideshow size="16px" />
            </Button>
          </Tooltip>
        </ButtonGroup>
      )}
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => { return null; };

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
