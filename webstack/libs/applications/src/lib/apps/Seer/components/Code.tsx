/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { App } from '@sage3/applications/schema';

import Editor, { Monaco, useMonaco } from '@monaco-editor/react';
import { state as AppState } from '../index';
import { useRef, useState } from 'react';
import { Box, useColorMode, useColorModeValue } from '@chakra-ui/react';

type CodeBoxProps = {
  app: App;
};
export function CodeBox(props: CodeBoxProps) {
  const s = props.app.data.state as AppState;
  const editor = useRef<Monaco>();
  const [code, setCode] = useState<string>(s.code);
  const [position, setPosition] = useState({ r: 1, c: 1 });
  const [lines, setLines] = useState(s.code.split('\n').length);
  const { colorMode } = useColorMode();
  // Handle to the Monoco API
  const monaco = useMonaco();
  // Get the reference to the Monaco Editor after it mounts
  function handleEditorDidMount(ed: typeof Editor) {
    editor.current = ed;
    editor.current.onDidChangeCursorPosition((ev: any) => {
      setPosition({ r: ev.position.lineNumber, c: ev.position.column });
    });
  }
  // Update from Monaco Editor
  function updateCode(value: string | undefined) {
    if (value) {
      // Store the code in the state
      setCode(value);
      // Update the number of lines
      setLines(value.split('\n').length);
    }
  }
  return (
    <Box
      style={{
        border: 'none',
        padding: 2,
        overflow: 'hidden',
        backgroundColor: useColorModeValue('#F0F2F6', '#111111'),
        borderRadius: '4px',
      }}
    >
      <Editor
        onMount={handleEditorDidMount}
        defaultValue={code}
        onChange={updateCode}
        height={props.app.data.size.height + 'px'}
        language={'python'}
        theme={colorMode === 'light' ? 'vs-light' : 'vs-dark'}
        options={{
          fontSize: `${s.fontSize}px`,
          minimap: { enabled: false },
          lineNumbersMinChars: 4,
          acceptSuggestionOnCommitCharacter: true,
          acceptSuggestionOnEnter: 'on',
          accessibilitySupport: 'auto',
          autoIndent: false,
          automaticLayout: true,
          codeLens: true,
          colorDecorators: true,
          contextmenu: false,
          cursorBlinking: 'blink',
          cursorSmoothCaretAnimation: false,
          cursorStyle: 'line',
          disableLayerHinting: false,
          disableMonospaceOptimizations: false,
          dragAndDrop: false,
          fixedOverflowWidgets: false,
          folding: true,
          foldingStrategy: 'auto',
          fontLigatures: false,
          formatOnPaste: false,
          formatOnType: false,
          hideCursorInOverviewRuler: false,
          highlightActiveIndentGuide: true,
          links: true,
          mouseWheelZoom: false,
          multiCursorMergeOverlapping: true,
          multiCursorModifier: 'alt',
          overviewRulerBorder: false,
          overviewRulerLanes: 0,
          quickSuggestions: false,
          quickSuggestionsDelay: 100,
          readOnly: false,
          renderControlCharacters: false,
          renderFinalNewline: true,
          renderIndentGuides: true,
          renderLineHighlight: 'all',
          renderWhitespace: 'none',
          revealHorizontalRightPadding: 30,
          roundedSelection: true,
          rulers: [],
          scrollBeyondLastColumn: 5,
          scrollBeyondLastLine: true,
          selectOnLineNumbers: true,
          selectionClipboard: true,
          selectionHighlight: true,
          showFoldingControls: 'mouseover',
          smoothScrolling: false,
          suggestOnTriggerCharacters: true,
          wordBasedSuggestions: true,
          wordSeparators: '~!@#$%^&*()-=+[{]}|;:\'",.<>/?',
          wordWrap: 'off',
          wordWrapBreakAfterCharacters: '\t})]?|&,;',
          wordWrapBreakBeforeCharacters: '{([+',
          wordWrapBreakObtrusiveCharacters: '.',
          wordWrapColumn: 80,
          wordWrapMinified: true,
          wrappingIndent: 'none',
        }}
      />
    </Box>
  );
}
