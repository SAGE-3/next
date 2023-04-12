/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React Imports
import { useEffect, useState } from 'react';

import { useColorMode, Box, Button, ButtonGroup, Tooltip } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Import Monaco Editor
import Editor from "@monaco-editor/react";
// Utility functions from SAGE3
import { downloadFile } from '@sage3/frontend';
// Date manipulation (for filename)
import dateFormat from 'date-fns/format';
import { MdFileDownload } from 'react-icons/md';


/* App component for JSONViewer */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const { colorMode } = useColorMode();

  // LocalState
  const [content, setContent] = useState(s.content);

  // Update local value with value from the server
  useEffect(() => {
    if (s.content) {
      const c = JSON.stringify(JSON.parse(s.content), null, 4);
      setContent(c);
    }
  }, [s.content]);

  const options = {
    fontSize: '18px',
    fontFamily: 'monaco, monospace',
    minimap: { enabled: false },
    lineNumbers: 'on',
    automaticLayout: true,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 4,
    readOnly: true,
    wordWrap: 'on',
    padding: {
      top: 3,
      bottom: 3,
    },
    renderLineHighlight: 'none',
  };

  return (
    <AppWindow app={props}>
      <Box style={{
        width: '100%',
        height: '100%',
        border: 'none',
        marginTop: 2,
        marginLeft: 2,
        marginRight: 2,
        marginBottom: 2,
        padding: 0,
        overflow: 'hidden',
        borderRadius: '2px',
      }}
      >
        <Editor
          defaultValue={content}
          value={content}
          height={"100%"}
          language={'json'}
          theme={colorMode === 'light' ? 'vs-light' : 'vs-dark'}
          options={options}
        />
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app JSONViewer */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // Download the stickie as a Mardown file
  const download = () => {
    // Current date
    const dt = dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    const content = JSON.stringify(JSON.parse(s.content), null, 4);
    // generate a URL containing the text of the note
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    // Make a filename with username and date
    const filename = 'video-summary-' + dt + '.json';
    // Go for download
    downloadFile(txturl, filename);
  };


  return (
    <ButtonGroup isAttached size="xs" colorScheme="teal">
      <Tooltip placement="top-start" hasArrow={true} label={'Download as JSON'} openDelay={400}>
        <Button onClick={download}>
          <MdFileDownload />
        </Button>
      </Tooltip>
    </ButtonGroup>
  );
}

export default { AppComponent, ToolbarComponent };
