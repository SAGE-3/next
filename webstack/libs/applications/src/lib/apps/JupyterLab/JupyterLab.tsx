/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Center } from '@chakra-ui/react';
import { v1 as uuidv1 } from 'uuid';

import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { GetConfiguration, useAppStore } from '@sage3/frontend';
import { isElectron } from './util';

// Electron and Browser components
// @ts-ignore
import { WebviewTag } from 'electron';

/* App component for JupyterApp */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
  const webviewNode = useRef<WebviewTag>();
  const [url, setUrl] = useState<string | null>(s.jupyterURL);
  // Tracking the dom-ready and did-load events
  const [domReady, setDomReady] = useState(false);
  const [attached, setAttached] = useState(false);

  // Room and board
  const location = useLocation();
  const { boardId, roomId } = location.state as { boardId: string; roomId: string };

  useEffect(() => {
    GetConfiguration().then((conf) => {
      if (conf.token) {
        // Create a new notebook
        const base = `http://${window.location.hostname}`;
        const j_url = base + '/api/contents/boards/' + `${boardId}.ipynb`;
        const payload = { type: 'notebook', path: '/', format: 'text' };
        // Talk to the jupyter server API
        fetch(j_url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Token ' + conf.token,
          },
          body: JSON.stringify(payload)
        }).then((response) => response.json())
          .then((res) => {
            console.log('Jupyter> notebook created', res);
            // Create a new kernel
            const k_url = base + '/api/kernels';
            const kpayload = { name: 'python3', path: '/' };

            fetch(k_url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token ' + conf.token,
              },
              body: JSON.stringify(kpayload)
            }).then((response) => response.json())
              .then((res) => {
                console.log('Jupyter> kernel created', res);
                const kernel = res;
                // Create a new session
                const s_url = base + '/api/sessions'
                const spayload = {
                  id: uuidv1().replace(/-/g, ''),
                  kernel: kernel,
                  name: `${boardId}.ipynb`,
                  path: `boards/${boardId}.ipynb`,
                  notebook: {
                    name: `${boardId}.ipynb`,
                    path: `boards/${boardId}.ipynb`,
                  },
                  type: 'notebook'
                }
                fetch(s_url, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Token ' + conf.token,
                  },
                  body: JSON.stringify(spayload)
                }).then((response) => response.json())
                  .then((res) => {
                    console.log('Juypyter> session created', res);
                    //  Open the notebook in a separate workspace
                    const newUrl = `http://${window.location.hostname}/doc/workspaces/${roomId}/tree/boards/${boardId}.ipynb?token=${conf.token}&reset`;
                    setUrl(newUrl);
                  });
              });

          })
          .catch((err) => {
            console.log('Jupyter> error', err);
          });

      }
    });
  }, []);


  // Init the webview
  const setWebviewRef = useCallback((node: WebviewTag) => {
    // event dom-ready callback
    const domReadyCallback = (evt: any) => {
      webviewNode.current.removeEventListener('dom-ready', domReadyCallback)
      setDomReady(true);
    }
    // event did-attach callback
    const didAttachCallback = (evt: any) => {
      webviewNode.current.removeEventListener('did-attach', didAttachCallback);
      setAttached(true);
    };


    if (node) {
      webviewNode.current = node;
      const webview = webviewNode.current;

      // Callback when the webview is ready
      webview.addEventListener('dom-ready', domReadyCallback)
      webview.addEventListener('did-attach', didAttachCallback);

      const titleUpdated = (event: any) => {
        // Update the app title
        update(props._id, { description: event.title });
      };
      webview.addEventListener('page-title-updated', titleUpdated);

      // After the partition has been set, you can navigate
      webview.src = url;
    }
  }, [url]);

  useEffect(() => {
    if (domReady === false || attached === false) return;
    console.log('Jupyter> domReady', domReady, 'attached', attached);
  }, [domReady, attached]);

  const nodeStyle: React.CSSProperties = {
    width: props.data.size.width + 'px',
    height: props.data.size.height + 'px',
    objectFit: 'contain',
  };


  return (
    <AppWindow app={props}>
      {isElectron() ?
        <webview ref={setWebviewRef} style={nodeStyle} allowpopups={'true' as any}></webview>
        :
        <div style={{ width: props.data.size.width + 'px', height: props.data.size.height + 'px' }}>
          <Center w="100%" h="100%" bg="gray.700" >
            <Box p={4} >
              <Center>
                <Box as="span" color="white" fontSize="2xl" fontWeight="bold" p="2rem">
                  JupyterLab is only supported with the SAGE3 Desktop Application.
                </Box>
              </Center>
              <br />
              <Center>
                <Box as="span" color="white" fontSize="2xl" fontWeight="bold" p="2rem">
                  Current URL <a style={{ color: "#13a89e" }} href={s.jupyterURL} rel="noreferrer" target="_blank">
                    {s.jupyterURL} </a>
                </Box>
              </Center>
            </Box>
          </Center>
        </div>
      }
    </AppWindow>
  );
}

/* App toolbar component for the app JupyterApp */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
