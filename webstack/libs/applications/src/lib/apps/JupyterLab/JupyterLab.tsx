/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Button, ButtonGroup, Center, Tooltip } from '@chakra-ui/react';
import { v1 as uuidv1 } from 'uuid';

import { MdFileDownload } from 'react-icons/md';
// Date manipulation (for filename)
import dateFormat from 'date-fns/format';

import { downloadFile, GetConfiguration, useAppStore, useBoardStore } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { isElectron } from './util';

// Electron and Browser components
// @ts-ignore
import { WebviewTag } from 'electron';

/* App component for JupyterApp */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const update = useAppStore((state) => state.update);
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
        let base: string;
        if (conf.production) {
          base = `https://${window.location.hostname}:4443`;
        } else {
          base = `http://${window.location.hostname}`;
        }
        // Talk to the jupyter server API
        let j_url: string;
        if (s.notebook) {
          j_url = base + '/api/contents/notebooks/' + `${s.notebook}`;
          // Create a new kernel
          const k_url = base + '/api/kernels';
          const kpayload = { name: 'python3', path: '/' };
          // Creating a new kernel with HTTP POST
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
              const sid = uuidv1();
              const spayload = {
                id: sid.replace(/-/g, ''),
                kernel: kernel,
                name: boardId,
                path: `boards/${boardId}.ipynb`,
                notebook: {
                  name: `${boardId}.ipynb`,
                  path: `boards/${boardId}.ipynb`,
                },
                type: 'notebook'
              }
              // Creating a new session with HTTP POST
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
                  let base: string;
                  if (conf.production) {
                    base = `https://${window.location.hostname}:4443`;
                  } else {
                    base = `http://${window.location.hostname}`;
                  }
                  const newUrl = `${base}/doc/workspaces/${roomId}/tree/notebooks/${s.notebook}?token=${conf.token}&reset`;
                  setUrl(newUrl);
                });
            })
            .catch((err) => {
              console.log('Jupyter> error', err);
            });
        } else {
          j_url = base + '/api/contents/boards/' + `${boardId}.ipynb`;
          const payload = { type: 'notebook', path: '/boards', format: 'text' };
          // Create a new notebook
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
              // Creating a new kernel with HTTP POST
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
                  const sid = uuidv1();
                  const spayload = {
                    id: sid.replace(/-/g, ''),
                    kernel: kernel,
                    name: boardId,
                    path: `boards/${boardId}.ipynb`,
                    notebook: {
                      name: `${boardId}.ipynb`,
                      path: `boards/${boardId}.ipynb`,
                    },
                    type: 'notebook'
                  }
                  // Creating a new session with HTTP POST
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
                      let base: string;
                      if (conf.production) {
                        base = `https://${window.location.hostname}:4443`;
                      } else {
                        base = `http://${window.location.hostname}`;
                      }
                      const newUrl = `${base}/doc/workspaces/${roomId}/tree/boards/${boardId}.ipynb?token=${conf.token}&reset`;
                      setUrl(newUrl);
                    });
                });
            })
            .catch((err) => {
              console.log('Jupyter> error', err);
            });
        }
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
  // const updateState = useAppStore((state) => state.updateState);

  // Board store
  const boards = useBoardStore((state) => state.boards);

  // Room and board
  const location = useLocation();
  const { boardId } = location.state as { boardId: string; roomId: string };

  // Download the notebook for this board
  function downloadNotebook() {
    GetConfiguration().then((conf) => {
      if (conf.token) {
        // Create a new notebook
        let base: string;
        if (conf.production) {
          base = `https://${window.location.hostname}:4443`;
        } else {
          base = `http://${window.location.hostname}`;
        }
        let j_url: string;
        if (s.notebook) {
          j_url = base + '/api/contents/notebooks/' + `${s.notebook}?token=${conf.token}`;
        } else {
          j_url = base + '/api/contents/boards/' + `${boardId}.ipynb?token=${conf.token}`;
        }
        fetch(j_url).then((response) => response.json()).then((note) => {
          // Generate a filename using date and board name
          const boardName = boards.find((b) => b._id === boardId)?.data.name || 'session';
          // Current date
          const prettyDate = dateFormat(new Date(), 'yyyy-MM-dd-HH-mm-ss');
          // Make a filename with board name and date
          const filename = s.notebook || `SAGE3-${boardName.replace(' ', '-')}-${prettyDate}.ipynb`;
          // Convert JSON object to string
          const content = JSON.stringify(note.content, null, 4);
          // Generate a URL containing the text of the note
          const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
          // Go for download
          downloadFile(txturl, filename);
        });
      }
    });
  }

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Download Notebook'} openDelay={400}>
          <Button onClick={downloadNotebook}>
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
