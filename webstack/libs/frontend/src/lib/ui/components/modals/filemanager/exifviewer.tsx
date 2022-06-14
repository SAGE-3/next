/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';

// Ace editor
import AceEditor from 'react-ace';
import 'ace-builds/src-min-noconflict/mode-json.js';
// Dark mode
import 'ace-builds/src-min-noconflict/theme-monokai.js';
// Light mode
import 'ace-builds/src-min-noconflict/theme-github.js';

import { ExifViewerProps } from './types';


export function ExifViewer(props: ExifViewerProps): JSX.Element {
  return <AceEditor
    mode={'json'}
    theme={props.colorMode === 'light' ? 'github' : 'monokai'}
    name="ace-editor"
    value={JSON.stringify(props.file.exif, null, 2)}
    readOnly={true}
    focus={true}
    setOptions={{
      fontSize: 12,
      wrap: true,
      hasCssTransforms: true,
      useWorker: false,
      showLineNumbers: false,
      showGutter: false,
      showPrintMargin: false,
      highlightActiveLine: true,
    }}
    height={'200px'}
    width={'100%'}
  />;
}
