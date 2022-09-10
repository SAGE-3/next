/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Ace editor
import AceEditor from 'react-ace';
import 'ace-builds/src-min-noconflict/mode-json.js';
// Dark mode
import 'ace-builds/src-min-noconflict/theme-monokai.js';
// Light mode
import 'ace-builds/src-min-noconflict/theme-github.js';

import { ExifViewerProps } from './types';
import { useData } from 'libs/frontend/src/lib/hooks';

/**
 * Read-only ace editor showing the exif data of file
 *
 * @export
 * @param {ExifViewerProps} props
 * @returns {JSX.Element}
 */
export function ExifViewer(props: ExifViewerProps): JSX.Element {
  // props.file.metadata is a JSON file
  // Fetch the data from the server
  const json = useData('/api/assets/static/' + props.file.metadata);

  return <AceEditor
    mode={'json'}
    theme={props.colorMode === 'light' ? 'github' : 'monokai'}
    name="ace-editor"
    value={JSON.stringify(json, null, 2)}
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
