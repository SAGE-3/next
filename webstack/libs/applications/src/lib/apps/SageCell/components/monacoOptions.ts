/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

export const monacoOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  quickSuggestions: {
    other: 'inline',
    comments: 'inline',
    strings: 'inline',
  },
  glyphMargin: true,
  automaticLayout: false, // this is needed to make the editor resizeable
  wordWrap: 'off',
  lineNumbers: 'on',
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 3,
  scrollBeyondLastLine: false,
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
};
