/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React Imports
import { useEffect, useRef, useState } from 'react';

// Library imports
import { Box, useColorModeValue } from '@chakra-ui/react';

// Import Monaco Editor
import Editor from '@monaco-editor/react';

// Sage3 Imports
import { useAppStore } from '@sage3/frontend';
import { App, AppGroup } from '../../schema';
import { state as AppState } from '.';
import { AppWindow } from '../../components';
import { debounce } from 'throttle-debounce';


/* App component for CodeViewer */

function AppComponent(props: App): JSX.Element {
  // SAGE state
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  // Styling
  const defaultTheme = useColorModeValue('vs', 'vs-dark');

  // LocalState
  const [spec, setSpec] = useState(s.content);

  // Update local value with value from the server
  useEffect(() => {
    setSpec(s.content);
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
    setSpec(value);
    // Update the text when not typing
    debounceFunc.current(value);
  }

  return (
    <AppWindow app={props}>
      <Box p={0} border={'none'} overflow='hidden' height="100%">
        <Editor
          value={spec}
          onChange={handleTextChange}
          theme={defaultTheme}
          height={"100%"}
          language={s.language}
          options={{
            // readOnly: true,
            fontSize: 16,
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
  // const s = props.data.state as AppState;
  // const updateState = useAppStore((state) => state.updateState);

  return (<></>);
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
