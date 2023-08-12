import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

export const monacoOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  model: null,
  minimap: { enabled: false },
  quickSuggestions: false,
  glyphMargin: false,
  automaticLayout: false, // this is needed to make the editor resizeable
  wordWrap: 'off',
  lineNumbers: 'on',
  lineDecorationsWidth: 0,
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
