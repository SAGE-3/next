/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useRef, useState } from 'react';
import { VStack, Input, InputGroup, useColorModeValue } from '@chakra-ui/react';

import { GetConfiguration, useAppStore, useUser } from '@sage3/frontend';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { App } from '@sage3/applications/schema';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { QuillBinding } from 'y-quill';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';
import 'quill/dist/quill.snow.css';
import './styles.css';
import { sageColorByName } from '@sage3/shared';

Quill.register('modules/cursors', QuillCursors);

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const update = useAppStore((state) => state.update);

  const divref = useRef(null);

  const [quill, setQuill] = useState<Quill>();
  const [ydoc, setYdoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<WebsocketProvider>();
  const [quillBinding, setQuillBinding] = useState<QuillBinding>();

  const { user } = useUser();

  useEffect(() => {
    if (divref.current) {
      const quill = new Quill(divref.current, {
        modules: {
          cursors: true,
          toolbar: [
            [{ font: [] }, { size: [] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ script: 'super' }, { script: 'sub' }],
            ['code-block'],
            [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
            [{ align: [] }],
            ['link', 'image'],
            ['clean'],
          ],
          history: {
            // Local undo shouldn't undo changes
            // from remote users
            userOnly: true,
          },
        },
        placeholder: 'Start collaborating...',
        theme: 'snow', // 'bubble' is also great
      });

      // A Yjs document holds the shared data
      const ydoc = new Y.Doc();

      const provider = new WebsocketProvider(`ws://${window.location.host}/yjs`, props._id, ydoc);

      // Define a shared text type on the document
      const ytext = ydoc.getText('quill');

      // "Bind" the quill editor to a Yjs text type.
      const binding = new QuillBinding(ytext, quill, provider.awareness);
      if (user) {
        provider.awareness.setLocalStateField('user', {
          // Define a print name that should be displayed
          name: user.data.name,
          // Define a color that should be associated to the user:
          color: sageColorByName(user.data.color), // should be a hex color
        });
      }
    }
    return () => {
      if (quillBinding) quillBinding.destroy();
      if (provider) provider.disconnect();
    };
  }, [divref]);

  return (
    <AppWindow app={props}>
      <div ref={divref} style={{ width: '100%', height: '100%', backgroundColor: '#e5e5e5' }}></div>
    </AppWindow>
  );
}

/* App toolbar component for the app SVGBox */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  return <></>;
}

export default { AppComponent, ToolbarComponent };
