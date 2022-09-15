/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useRef } from 'react';

// Yjs Imports
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { QuillBinding } from 'y-quill';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';

// Styles
import 'quill/dist/quill.snow.css';
import './styles.css';

// SAGE Imports
import { useUser } from '@sage3/frontend';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { App } from '@sage3/applications/schema';
import { sageColorByName } from '@sage3/shared';

// Have to register the module before using it
Quill.register('modules/cursors', QuillCursors);

function AppComponent(props: App): JSX.Element {
  const quillRef = useRef(null);
  const { user } = useUser();

  useEffect(() => {
    // Setup Yjs stuff
    let provider: WebsocketProvider | null = null;
    let ydoc: Y.Doc | null = null;
    let binding: QuillBinding | null = null;
    if (quillRef.current) {
      const quill = new Quill(quillRef.current, {
        modules: {
          cursors: true,
          toolbar: [
            [{ font: [] }, { size: [] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            ['clean'],
            ['code-block'],
            [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
            ['link', 'image'],
          ],
          history: {
            // Local undo shouldn't undo changes from remote users
            userOnly: true,
          },
        },
        placeholder: 'Start collaborating...',
        theme: 'snow', // 'bubble' is also great
      });

      // A Yjs document holds the shared data
      ydoc = new Y.Doc();

      // WS Provider
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      provider = new WebsocketProvider(`${protocol}://${window.location.host}/yjs`, props._id, ydoc);

      // Define a shared text type on the document
      const ytext = ydoc.getText('quill');

      // "Bind" the quill editor to a Yjs text type.
      // Uses SAGE3 information to set the color of the cursor
      binding = new QuillBinding(ytext, quill, provider.awareness);
      if (user) {
        provider.awareness.setLocalStateField('user', {
          name: user.data.name,
          color: sageColorByName(user.data.color), // should be a hex color
        });
      }
    }
    return () => {
      // Remove the bindings and disconnect the provider
      if (ydoc) ydoc.destroy();
      if (binding) binding.destroy();
      if (provider) provider.disconnect();
    };
  }, [quillRef]);

  return (
    <AppWindow app={props}>
      <div ref={quillRef} style={{ width: '100%', height: '100%', backgroundColor: '#e5e5e5' }}></div>
    </AppWindow>
  );
}

/* App toolbar component for the app SVGBox */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  return <></>;
}

export default { AppComponent, ToolbarComponent };
