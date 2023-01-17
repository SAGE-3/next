/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React Imports
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';

// Library imports
import { Button, ButtonGroup, Box } from '@chakra-ui/react';

// Import Monaco Editor
import Editor, { Monaco, useMonaco } from "@monaco-editor/react";


// Sage3 Imports
import { useAppStore, useUser } from '@sage3/frontend';
import { App } from '../../schema';
import { state as AppState } from '.';
import { AppWindow } from '../../components';
import { debounce } from 'throttle-debounce';


/* App component for VegaLite */

/**
 * NoteApp SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */
function AppComponent(props: App): JSX.Element {
  // SAGE state
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  // LocalState
  const [spec, setSpec] = useState(s.spec);

  // Editor ref
  const editor = useRef<Monaco>();

  // Update local value with value from the server
  useEffect(() => {
    setSpec(s.spec);
  }, [s.spec]);

  // Saving the text after 1sec of inactivity
  const debounceSave = debounce(1000, (val) => {
    updateState(props._id, { spec: val });
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
      <Box style={{
        width: '95%',
        height: '100%',
        border: 'none',
        marginTop: 15,
        marginLeft: 15,
        marginRight: 0,
        marginBottom: 10,
        padding: 0,
        overflow: 'hidden',
        borderRadius: '8px',
      }}
      >
        <Editor
          defaultValue={spec}
          onChange={handleTextChange}
          height={"95%"}
          language={'json'}
          options={{
            fontSize: '10px',
            minimap: { enabled: false },
            lineNumbersMinChars: 4,
            "overviewRulerBorder": false,
            "overviewRulerLanes": 0,
          }}
        />
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app VegaLite */

function ToolbarComponent(props: App): JSX.Element {
  // State
  const s = props.data.state as AppState;
  const createApp = useAppStore((state) => state.create);
  const { user } = useUser();

  // BoardInfo
  const { boardId, roomId } = useParams();

  // Creates a new VegaLiteViewer app with aceeditor text
  const createChart = () => {
    if (!user) return;
    createApp({
      title: '',
      roomId: roomId!,
      boardId: boardId!,
      position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
      size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'VegaLiteViewer',
      state: {
        spec: s.spec,
      },
      raised: true,
    });
  };

  return (
    <ButtonGroup isAttached size="xs" colorScheme="teal">
      <Button onClick={createChart} colorScheme="green">
        Create View
      </Button>
    </ButtonGroup>
  );
}

export default { AppComponent, ToolbarComponent };
