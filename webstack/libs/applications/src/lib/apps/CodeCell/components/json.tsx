/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-xcode';
import 'ace-builds/src-noconflict/theme-tomorrow_night_bright';

import { useColorModeValue } from '@chakra-ui/react';

export const JSONOutput = (output: string) => {
  return (
    <AceEditor
      mode="json"
      theme={useColorModeValue('xcode', 'tomorrow_night_bright')}
      readOnly={true}
      fontSize={'1em'}
      minLines={6}
      maxLines={20}
      value={output ? JSON.stringify(JSON.parse(output), null, '\t') : ''}
      wrapEnabled={true}
      setOptions={{
        hasCssTransforms: true,
        showGutter: false,
        showPrintMargin: false,
        highlightActiveLine: false,
        showLineNumbers: false,
      }}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        overflow: 'hidden',
        backgroundColor: useColorModeValue('#F0F2F6', '#111111'),
        boxShadow: '0 0 0 4px ' + useColorModeValue('rgba(0,0,0,0.1)', 'rgba(0, 128, 128, 0.5)'),
        borderRadius: '12px',
      }}
    />
  );
};
