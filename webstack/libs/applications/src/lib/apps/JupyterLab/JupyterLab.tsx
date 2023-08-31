/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router';

import { Button, ButtonGroup, Tooltip } from '@chakra-ui/react';
// UUID generation
import { v1 as uuidv1 } from 'uuid';
// Date manipulation (for filename)
import dateFormat from 'date-fns/format';
// Icons
import { MdFileDownload, MdOpenInNew } from 'react-icons/md';

import { downloadFile, GetConfiguration, useAppStore, useBoardStore } from '@sage3/frontend';

import { AppWindow, ElectronRequired } from '../../components';
import { state as AppState } from './index';
import { isElectron } from './util';
import { App } from '../../schema';

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
  const { boardId, roomId } = useParams();

  useEffect(() => {
    GetConfiguration().then((conf) => {
      if (conf.token) {
        // Create a new notebook
        const base = `http://${window.location.hostname}:8888`;
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
              Authorization: 'Token ' + conf.token,
            },
            body: JSON.stringify(kpayload),
          })
            .then((response) => response.json())
            .then((res) => {
              console.log('Jupyter> kernel created', res);
              const kernel = res;
              // Create a new session
              const s_url = base + '/api/sessions';
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
                type: 'notebook',
              };
              // Creating a new session with HTTP POST
              fetch(s_url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: 'Token ' + conf.token,
                },
                body: JSON.stringify(spayload),
              })
                .then((response) => response.json())
                .then((res) => {
                  console.log('Juypyter> session created', res);
                  //  Open the notebook in a separate workspace
                  const base = `http://${window.location.hostname}:8888`;
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
              Authorization: 'Token ' + conf.token,
            },
            body: JSON.stringify(payload),
          })
            .then((response) => response.json())
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
                  Authorization: 'Token ' + conf.token,
                },
                body: JSON.stringify(kpayload),
              })
                .then((response) => response.json())
                .then((res) => {
                  console.log('Jupyter> kernel created', res);
                  const kernel = res;
                  // Create a new session
                  const s_url = base + '/api/sessions';
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
                    type: 'notebook',
                  };
                  // Creating a new session with HTTP POST
                  fetch(s_url, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: 'Token ' + conf.token,
                    },
                    body: JSON.stringify(spayload),
                  })
                    .then((response) => response.json())
                    .then((res) => {
                      console.log('Juypyter> session created', res);
                      //  Open the notebook in a separate workspace
                      const base = `http://${window.location.hostname}:8888`;
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
  const setWebviewRef = useCallback(
    (node: WebviewTag) => {
      // event dom-ready callback
      const domReadyCallback = (evt: any) => {
        webviewNode.current.removeEventListener('dom-ready', domReadyCallback);
        setDomReady(true);
      };
      // event did-attach callback
      const didAttachCallback = (evt: any) => {
        webviewNode.current.removeEventListener('did-attach', didAttachCallback);
        setAttached(true);
      };

      if (node) {
        webviewNode.current = node;
        const webview = webviewNode.current;

        // Callback when the webview is ready
        webview.addEventListener('dom-ready', domReadyCallback);
        webview.addEventListener('did-attach', didAttachCallback);

        const titleUpdated = (event: any) => {
          // Update the app title
          update(props._id, { title: event.title });
        };
        webview.addEventListener('page-title-updated', titleUpdated);

        // After the partition has been set, you can navigate
        webview.src = url;
      }
    },
    [url]
  );

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
      {isElectron() ? (
        <webview ref={setWebviewRef} style={nodeStyle} allowpopups={'true' as any}></webview>
      ) : (
        <ElectronRequired
          appName={props.data.type}
          link={url || ''}
          title={"Jupyter URL"}
        />
      )}
    </AppWindow>
  );
}

/* App toolbar component for the app JupyterApp */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // Board store
  const boards = useBoardStore((state) => state.boards);

  // Room and board
  const { boardId, roomId } = useParams();

  // Download the notebook for this board
  function downloadNotebook() {
    GetConfiguration().then((conf) => {
      if (conf.token) {
        // Create a new notebook
        const base = `http://${window.location.hostname}:8888`;
        let j_url: string;
        if (s.notebook) {
          j_url = base + '/api/contents/notebooks/' + `${s.notebook}?token=${conf.token}`;
        } else {
          j_url = base + '/api/contents/boards/' + `${boardId}.ipynb?token=${conf.token}`;
        }
        fetch(j_url)
          .then((response) => response.json())
          .then((note) => {
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

  const handleOpen = () => {
    if (isElectron()) {
      GetConfiguration().then((conf) => {
        if (conf.token) {
          // Create a new notebook
          const base = `http://${window.location.hostname}:8888`;
          let j_url: string;
          if (s.notebook) {
            j_url = `${base}/doc/workspaces/${roomId}/tree/notebooks/${s.notebook}?token=${conf.token}&reset`;
          } else {
            j_url = `${base}/doc/workspaces/${roomId}/tree/boards/${boardId}.ipynb?token=${conf.token}&reset`;
          }
          window.electron.send('open-external-url', { url: j_url });
        }
      });
    }
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Download Notebook'} openDelay={400}>
          <Button onClick={downloadNotebook}>
            <MdFileDownload />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Open in Desktop'} openDelay={400}>
          <Button onClick={handleOpen}><MdOpenInNew /></Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
