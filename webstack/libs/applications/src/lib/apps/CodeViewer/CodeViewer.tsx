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
import { Box, Button, ButtonGroup, Tooltip, useColorModeValue, useDisclosure, useToast } from '@chakra-ui/react';
import { debounce } from 'throttle-debounce';
import { MdFileDownload, MdFileUpload } from 'react-icons/md';
// Date manipulation (for filename)
import dateFormat from 'date-fns/format';

// Import Monaco Editor
import Editor, { OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';

import { MdLock, MdLockOpen, MdRemove, MdAdd } from 'react-icons/md';

// Sage3 Imports
import { useAppStore, downloadFile, ConfirmValueModal, apiUrls } from '@sage3/frontend';
import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from '.';

// Store between the app and the toolbar
import { create } from 'zustand';

interface CodeStore {
  readonly: { [key: string]: boolean },
  setReadonly: (id: string, r: boolean) => void,
}

const useStore = create<CodeStore>()((set) => ({
  readonly: {} as { [key: string]: boolean },
  setReadonly: (id: string, r: boolean) => set((s) => ({ ...s, readonly: { ...s.readonly, ...{ [id]: r } } })),
}));

const languageExtensions = [
  { name: 'json', extension: 'json' },
  { name: 'yaml', extension: 'yaml' },
  { name: 'javascript', extension: 'js' },
  { name: 'typescript', extension: 'ts' },
  { name: 'python', extension: 'py' },
  { name: 'html', extension: 'html' },
  { name: 'css', extension: 'css' },
];

/* App component for CodeViewer */

function AppComponent(props: App): JSX.Element {
  // SAGE state
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  // Styling
  const defaultTheme = useColorModeValue('vs', 'vs-dark');

  // LocalState
  const [spec, setSpec] = useState(s.content);
  const readonly = useStore((state) => state.readonly[props._id]);
  const setReadonly = useStore((state) => state.setReadonly);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Initialize the readonly state
  useEffect(() => {
    setReadonly(props._id, true);
    update(props._id, { title: 'CodeViewer: ' + s.language })
  }, []);

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
      if (myselection.startLineNumber === newselection[0] && myselection.startColumn === newselection[1]
        && myselection.endLineNumber === newselection[2] && myselection.endColumn === newselection[3]) return;
      editorRef.current.setSelection({ startLineNumber: newselection[0], startColumn: newselection[1], endLineNumber: newselection[2], endColumn: newselection[3] });
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
    editor.onDidScrollChange(function (event) {
      updateState(props._id, { scrollPosition: event.scrollTop })
    });
    // Add an event listener for the CursorSelection event
    editor.onDidChangeCursorSelection(function (event) {
      // The event object contains information about the selection change
      const selection = event.selection;
      // test if actual selection and not just cursot movement
      if (selection.startLineNumber !== selection.endLineNumber || selection.startColumn !== selection.endColumn) {
        updateState(props._id, { selection: [selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn] })
      }
    });
  };

  return (
    <AppWindow app={props}>
      <Box p={0} border={'none'} overflow='hidden' height="100%">
        <Editor
          value={spec}
          onChange={handleTextChange}
          onMount={handleMount}
          theme={defaultTheme}
          height={"100%"}
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
    </AppWindow >
  );
}

/* App toolbar component for the app CodeViewer */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // Room and board
  const { roomId } = useParams();
  // display some notifications
  const toast = useToast();
  // Save Confirmation  Modal
  const { isOpen: saveIsOpen, onOpen: saveOnOpen, onClose: saveOnClose } = useDisclosure();
  // State
  const readonly = useStore((state) => state.readonly[props._id]);
  const setReadonly = useStore((state) => state.setReadonly);
  const updateState = useAppStore((state) => state.updateState);

  const fontSizeBackground = useColorModeValue('teal.500', 'teal.200');
  const fontSizeColor = useColorModeValue('white', 'black');

  // Download the code into a local file
  const downloadCode = (): void => {
    const lang = languageExtensions.find(obj => obj.name === s.language)?.extension;
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
  const handleSave = useCallback((val: string) => {
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
  }, [s.content, roomId]);

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


  return (
    <>
      <ConfirmValueModal
        isOpen={saveIsOpen} onClose={saveOnClose} onConfirm={handleSave}
        title="Save Code in Asset Manager" message="Select a file name:"
        initiaValue={'code-' + dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss') + '.' + languageExtensions.find(obj => obj.name === s.language)?.extension || 'txt'}
        cancelText="Cancel" confirmText="Save"
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
          <Button onClick={() => readonly ? setReadonly(props._id, false) : setReadonly(props._id, true)} size="xs" p="0" mx="2px" colorScheme={'teal'}>
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
