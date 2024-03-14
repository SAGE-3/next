/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore } from '@sage3/frontend';
import { Box, Button, useColorModeValue } from '@chakra-ui/react';
import { App, AppGroup } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Markdown Viewer
import Markdown from 'markdown-to-jsx';

// Yjs Imports
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

// Import Monaco Editor
import Editor, { OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';

import { create } from 'zustand';
import { debounce } from 'throttle-debounce';
import { useRef } from 'react';

interface EditorStore {
  editor: { [key: string]: editor.IStandaloneCodeEditor };
  setEditor: (id: string, r: editor.IStandaloneCodeEditor) => void;
}

const useStore = create<EditorStore>()((set) => ({
  editor: {} as { [key: string]: editor.IStandaloneCodeEditor },
  setEditor: (id: string, editor: editor.IStandaloneCodeEditor) => set((s) => ({ ...s, editor: { ...s.editor, ...{ [id]: editor } } })),
}));

/* App component for MarkdownEditor */

function AppComponent(props: App): JSX.Element {
  // SAGE state
  const s = props.data.state as AppState;
  const { updateState } = useAppStore((state) => state);

  // Styling
  const defaultTheme = useColorModeValue('vs', 'vs-dark');
  const backgroundColor = useColorModeValue('white', 'blue.900');

  // Monaco Editor Ref
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { setEditor } = useStore();

  // Saving the text after 1sec of inactivity
  const debounceSave = debounce(1000, (val) => {
    updateState(props._id, { content: val });
  });

  // Keep a copy of the function
  const debounceFunc = useRef(debounceSave);

  // callback for aceditor change
  function handleTextChange(value: string | undefined) {
    if (!value) return;
    // Update the local value
    // setSpec(value);
    // Update the text when not typing
    debounceFunc.current(value);
  }

  const handleMount: OnMount = (editor) => {
    // save the editorRef
    editorRef.current = editor;
    // Save the editor in the store
    setEditor(props._id, editor);
    // Connect to Yjs
    connectToYjs(editor);
  };

  const connectToYjs = (editor: editor.IStandaloneCodeEditor) => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

    const doc = new Y.Doc();
    const yText = doc.getText('monaco');

    const provider = new WebsocketProvider(`${protocol}://${window.location.host}/yjs`, props._id, doc);
    // Ensure we are always operating on the same line endings
    const model = editor.getModel();
    if (model) model.setEOL(0);
    new MonacoBinding(yText, editor.getModel() as editor.ITextModel, new Set([editor]), provider.awareness);

    provider.on('sync', () => {
      const users = provider.awareness.getStates();
      const count = users.size;
      // I'm the only one here, so need to sync current ydoc with that is saved in the database
      if (count == 1) {
        // Does the app have code?
        if (s.content) {
          // Clear any existing lines
          yText.delete(0, yText.length);
          // Set the lines from the database
          yText.insert(0, s.content);
        }
      }
    });
  };

  return (
    <AppWindow app={props}>
      <>
        {s.editMode ? (
          <Box p={2} border={'none'} overflow="hidden" height="100%" borderRadius={'md'}>
            <Editor
              // value={spec}
              onChange={handleTextChange}
              onMount={handleMount}
              theme={defaultTheme}
              height={'100%'}
              language={'markdown'}
              options={{
                // readOnly: s.readonly,
                // fontSize: s.fontSize,
                contextmenu: false,
                minimap: { enabled: false },
                lineNumbers: 'on',
                lineNumbersMinChars: 3,
                overviewRulerBorder: false,
                overviewRulerLanes: 0,
                quickSuggestions: false,
                glyphMargin: false,
                wordWrap: 'on',
                lineDecorationsWidth: 0,
                scrollBeyondLastLine: false,
                wordWrapColumn: 80,
                wrappingStrategy: 'simple',
                renderLineHighlight: 'line',
                renderLineHighlightOnlyWhenFocus: true,
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
              }}
            />
          </Box>
        ) : (
          <Box p={8} border={'none'} background={backgroundColor} overflowX={'hidden'} height="100%" borderRadius={'md'}>
            <Markdown
              options={{
                overrides: {
                  a: {
                    component: 'a',
                    props: {
                      onClick: (e: any) => {
                        e.preventDefault();
                        window.open(e.target.href, '_blank');
                      },
                      style: {
                        color: '#555',
                        textDecoration: 'underline',
                      },
                    },
                  },
                  h1: {
                    component: 'h1',
                    props: {
                      style: {
                        fontSize: '1.5em',
                        fontWeight: 'bold',
                        color: '#008080',
                      },
                    },
                  },
                  h2: {
                    component: 'h2',
                    props: {
                      style: {
                        fontSize: '1.3em',
                        fontWeight: 'bold',
                        color: '#008080',
                      },
                    },
                  },
                  h3: {
                    component: 'h3',
                    props: {
                      style: {
                        fontSize: '1.1em',
                        fontWeight: 'bold',
                        color: '#008080',
                      },
                    },
                  },
                  h4: {
                    component: 'h4',
                    props: {
                      style: {
                        fontSize: '1em',
                        fontWeight: 'bold',
                        color: '#008080',
                      },
                    },
                  },
                  h5: {
                    component: 'h5',
                    props: {
                      style: {
                        fontSize: '0.9em',
                        fontWeight: 'bold',
                        color: '#008080',
                      },
                    },
                  },
                  h6: {
                    component: 'h6',
                    props: {
                      style: {
                        fontSize: '0.8em',
                        fontWeight: 'bold',
                        color: '#008080',
                      },
                    },
                  },
                  p: {
                    component: 'p',
                    props: {
                      style: {
                        fontSize: '0.9em',
                      },
                    },
                  },
                  li: {
                    component: 'li',
                    props: {
                      style: {
                        fontSize: '0.9em',
                        display: 'list-item',
                        margin: '1em',
                      },
                    },
                  },
                  ul: {
                    component: 'ul',
                    props: {
                      style: {
                        fontSize: '0.9em',
                      },
                    },
                  },
                  ol: {
                    component: 'ol',
                    props: {
                      style: {
                        fontSize: '0.9em',
                        listStyleType: 'decimal',
                      },
                    },
                  },
                  blockquote: {
                    component: 'blockquote',
                    props: {
                      style: {
                        fontSize: '0.9em',
                        borderLeft: '0.2em solid #008080',
                        paddingLeft: '0.5em',
                      },
                    },
                  },
                  code: {
                    component: 'code',

                    props: {
                      style: {
                        fontSize: '0.9em',
                        padding: '0.2em',
                        fontFamily: 'monospace',
                      },
                    },
                  },
                  del: {
                    component: 'del',
                    props: {
                      style: {
                        fontSize: '0.9em',
                        textDecoration: 'line-through',
                      },
                    },
                  },
                },
              }}
            >
              {s.content}
            </Markdown>
          </Box>
        )}
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app MarkdownEditor */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const toggleEditMode = () => {
    updateState(props._id, { ...s, editMode: !s.editMode });
  };

  return (
    <>
      <Button colorScheme="green" size="xs" onClick={toggleEditMode} width="80px">
        {s.editMode ? 'Preview' : 'Edit'}
      </Button>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
