/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: codeCell
 * created by: Luc Renambot
 */

// Import the React library
import React, { useEffect, useRef } from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/src-min-noconflict/mode-python.js';
import 'ace-builds/src-min-noconflict/theme-monokai.js';

// State management functions from SAGE3
import { useSageStateAtom, useSageStateReducer } from '@sage3/frontend/smart-data/hooks';

// Window layout component provided by SAGE3
import { Collection, DataPane } from '@sage3/frontend/smart-data/layout';

// Import the props definition for this application
import { codeCellProps } from './metadata';

// Import state type definition
import { CellAction, cellReducer } from './state-reducers';
// Import from UI lib
import { Code, Button } from '@chakra-ui/react';
import { useSocket } from '@sage3/frontend/utils/misc';
import { useUser } from '@sage3/frontend/services';

export const AppscodeCell = (props: codeCellProps): JSX.Element => {
  // Getting basic info about the app
  const { data: cellState, dispatch } = useSageStateReducer(props.state.cellState, cellReducer);
  const cellOutput = useSageStateAtom<{ value: string }>(props.state.cellOutput);
  const isLocked = useSageStateAtom<{ value: boolean }>(props.state.isLocked);
  const user = useUser();

  const handleInputChange = (val: string) => {
    const message = { type: 'update', code: val } as CellAction;
    dispatch(message);
  };

  // Reference to the text area
  const aceEditorRef = useRef<AceEditor>(null);

  const socket = useSocket();

  // useEffect(() => {
  //   socket.on('python-cell-output', (results: any) => {
  //     console.log(results);
  //     if (results.appId == props.id) {
  //       cellOutput.setData({ value: results.output });
  //     }
  //   });
  // }, []);

  const runCode = () => {
    console.log('RUN THIS CODE', cellState.code);
    // socket.emit('python-cell-run', { appId: props.id, code: cellState.code });
  };

  return (
    // Main application layout
    <Collection>
      <DataPane {...props.state.cellState}>
        {' '}
        <b>Code</b>
        <Button
          isDisabled={props.info.createdBy.name == user.name ? false : isLocked.data.value}
          m={2}
          variant="solid"
          colorScheme="teal"
          size="sm"
          onClick={() => runCode()}
        >
          RUN DAT CODE
        </Button>
        {props.info.createdBy.name === user.name ? (
          isLocked.data.value ? (
            <Button onClick={() => isLocked.setData({ value: false })} variant="solid" colorScheme="green" m={2} size="sm">
              Unlock
            </Button>
          ) : (
            <Button onClick={() => isLocked.setData({ value: true })} variant="solid" colorScheme="red" m={2} size="sm">
              Lock
            </Button>
          )
        ) : isLocked.data.value ? (
          'Locked by ' + props.info.createdBy.name
        ) : null}
      </DataPane>

      <DataPane {...props.state.cellState}>
        <AceEditor
          mode={'python'}
          theme="monokai"
          name="ace-editor"
          value={cellState.code}
          onChange={handleInputChange}
          readOnly={props.info.createdBy.name == user.name ? false : isLocked.data.value}
          ref={aceEditorRef}
          focus={true}
          setOptions={{ fontSize: 16, wrap: false, hasCssTransforms: true, showPrintMargin: false }}
          style={{
            width: '100%',
            flex: 1,
            height: 16 * cellState.code.split('\n').length + 50,
          }}
        />
      </DataPane>

      <DataPane {...props.state.cellState}>
        <b>Output</b>
      </DataPane>

      <DataPane {...props.state.cellState}>
        <Code noOfLines={5} color="gray.500" isTruncated>
          {cellOutput.data.value}
        </Code>
      </DataPane>
    </Collection>
  );
};

export default AppscodeCell;
