/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

//Sage3 Imports
import { useAppStore, useUser } from '@sage3/frontend';
import { App } from '../../schema';
import { state as AppState } from '.';
import { AppWindow } from '../../components';
import { debounce } from 'throttle-debounce';

//React Imports
import { useEffect, useRef, useState } from 'react';

//Library imports
import { Button } from '@chakra-ui/react';

//Import ace editor tools
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
import { useParams } from 'react-router';

/* App component for VegaLite */

/**
 * NoteApp SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */
function AppComponent(props: App): JSX.Element {
  //SAGE state
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  //LocalState
  const [spec, setSpec] = useState(s.spec);

  //aceEditor ref
  const ace = useRef<AceEditor>(null);

  // Update local value with value from the server
  useEffect(() => {
    setSpec(s.spec);
  }, [s.spec]);

  // Saving the text after 1sec of inactivity
  const debounceSave = debounce(1000, (val) => {
    console.log('debounce');
    updateState(props._id, { spec: val });
  });

  // Keep a copy of the function
  const debounceFunc = useRef(debounceSave);

  // callback for aceditor change
  function handleTextChange(ev: string) {
    const inputValue = ev;
    // Update the local value
    setSpec(inputValue);
    // Update the text when not typing
    debounceFunc.current(inputValue);
  }

  return (
    <AppWindow app={props}>
      <>
        <AceEditor
          ref={ace}
          value={spec}
          onChange={handleTextChange}
          style={{
            width: '95%',
            height: '100%',
            border: 'none',
            marginTop: 15,
            marginLeft: 15,
            marginRight: 0,
            marginBottom: 10,
            padding: 0,
            overflow: 'hidden',
            borderRadius: '12px',
          }}
          name="ace"
          fontSize={'1em'}
          minLines={6}
          maxLines={Math.floor(props.data.size.height / 18)}
          placeholder="Enter code here"
          mode={'python'}
          editorProps={{ $blockScrolling: true }}
          setOptions={{
            hasCssTransforms: true,
            showGutter: true,
            showPrintMargin: false,
            highlightActiveLine: true,
            showLineNumbers: true,
            wrap: true,
          }}
        />
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app VegaLite */

function ToolbarComponent(props: App): JSX.Element {
  //State
  const s = props.data.state as AppState;
  const createApp = useAppStore((state) => state.create);
  const { user } = useUser();

  //BoardInfo
  const { boardId, roomId } = useParams();

  // Creates a new VegaLiteViewer app with aceeditor text
  const createChart = () => {
    if (!user) return;
    createApp({
      name: 'VegaLiteViewer',
      description: 'Visualization',
      roomId: roomId!,
      boardId: boardId!,
      position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
      size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'VegaLiteViewer',
      state: {
        spec: s.spec,
      },
      ownerId: user?._id,
      minimized: false,
      raised: true,
    });
  };

  return (
    <>
      <Button onClick={createChart} colorScheme="green">
        Create View
      </Button>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
