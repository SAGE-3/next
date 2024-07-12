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
import { format } from 'date-fns/format';
// Icons
import { MdFileDownload, MdOpenInNew, MdAdd, MdRemove } from 'react-icons/md';
import { create } from 'zustand';

import { apiUrls, downloadFile, GetConfiguration, useAppStore, useBoardStore, useConfigStore, useUser } from '@sage3/frontend';

import { AppWindow, ElectronRequired } from '../../components';
import { state as AppState } from './index';
import { isElectron } from './util';
import { App } from '../../schema';

// Electron and Browser components
// @ts-ignore
import { WebviewTag } from 'electron';

interface WebviewStore {
  view: { [key: string]: WebviewTag };
  setView: (id: string, view: WebviewTag) => void;
}

export const useStore = create<WebviewStore>()((set) => ({
  view: {},
  setView: (id: string, view: WebviewTag) => set((state) => ({ view: { ...state.view, ...{ [id]: view } } })),
}));

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
  const setView = useStore((state) => state.setView);
  // user info
  const { user } = useUser();
  const conf = useConfigStore((state) => state.config);

  // Room and board
  const { boardId } = useParams();

  useEffect(() => {
    if (user && user._id === props._createdBy && conf.token && !s.kernel) {
      // Create a new notebook
      const base = `http://${window.location.hostname}:8888`;
      // Talk to the jupyter server API
      if (s.notebook) {
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
            // Save the kernel id
            const kernel = res;
            updateState(props._id, { kernel: kernel.id });
            // Create a new session
            const s_url = base + '/api/sessions';
            const sid = uuidv1();
            const spayload = {
              id: sid.replace(/-/g, ''),
              kernel: kernel,
              name: `session-${boardId}`,
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

                // const newUrl = `${base}/doc/workspaces/${roomId}/tree/notebooks/${s.notebook}?token=${conf.token}&reset`;
                // const newUrl = `${base}/nbclassic/notebooks/notebooks/${s.notebook}?token=${conf.token}&reset`;
                // const newUrl = `${base}/notebooks/notebooks/${s.notebook}?token=${conf.token}&reset`;
                // http://localhost:8888/lab/tree/RTC%3Anotebooks/plot1.ipynb
                // const newUrl = `${base}/lab/tree/RTC:notebooks/${s.notebook}?token=${conf.token}&reset`;
                // http://127.0.0.1:10000/notebooks/RTC:work/first.ipynb

                // URL for collaboration
                const newUrl = `${base}/notebooks/RTC:notebooks/${s.notebook}?token=${conf.token}&reset`;

                // Update the URL
                setUrl(newUrl);
              });
          })
          .catch((err) => {
            console.log('Jupyter> error', err);
          });
      }
    }
  }, [s.kernel, s.notebook, user, conf.token]);

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

      if (node && url) {
        // the webview will use a persistent session (cookies, cache, proxy settings, etc.)
        node.partition = `persist:jupyter:${props._id}`;

        webviewNode.current = node;
        const webview = webviewNode.current;

        // save the webview for the toolbar
        setView(props._id, webview);

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
        updateState(props._id, { jupyterURL: url });
      }
    },
    [url]
  );

  useEffect(() => {
    if (s.jupyterURL) {
      setUrl(s.jupyterURL);
    }
  }, [s.jupyterURL]);

  useEffect(() => {
    if (domReady === false || attached === false) return;
  }, [domReady, attached]);

  useEffect(() => {
    if (domReady === false || attached === false) return;
    if (webviewNode.current && s.zoom) {
      webviewNode.current.setZoomFactor(s.zoom);
    }
  }, [s.zoom, domReady, attached]);

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
        <ElectronRequired appName={props.data.type} link={url || ''} title={'Jupyter URL'} />
      )}
    </AppWindow>
  );
}

/* App toolbar component for the app JupyterApp */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const view = useStore((state) => state.view[props._id]);

  // Board store
  const boards = useBoardStore((state) => state.boards);

  // Room and board
  const { boardId } = useParams();

  // Download the notebook for this board
  function downloadNotebook() {
    GetConfiguration().then((conf) => {
      if (conf.token && s.notebook) {
        // Create a new notebook
        const base = `http://${window.location.hostname}:8888`;
        const j_url = base + apiUrls.assets.getNotebookByName(s.notebook) + `?token=${conf.token}`;
        fetch(j_url)
          .then((response) => response.json())
          .then((note) => {
            // Generate a filename using date and board name
            const boardName = boards.find((b) => b._id === boardId)?.data.name || 'session';
            // Current date
            const prettyDate = format(new Date(), 'yyyy-MM-dd-HH-mm-ss');
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
        if (conf.token && s.notebook) {
          const base = `http://${window.location.hostname}:8888`;
          // const j_url = `${base}/doc/workspaces/${roomId}/tree/notebooks/${s.notebook}?token=${conf.token}&reset`;
          // const j_url = `${base}/nbclassic/notebooks/notebooks/${s.notebook}?token=${conf.token}&reset`;
          // const j_url = `${base}/notebooks/notebooks/${s.notebook}?token=${conf.token}&reset`;

          // URL for collaboration
          const j_url = `${base}/notebooks/RTC:notebooks/${s.notebook}?token=${conf.token}&reset`;

          window.electron.send('open-external-url', { url: j_url });
        }
      });
    }
  };

  // Zooming
  const handleZoom = (dir: string) => {
    const v = view as WebviewTag;
    if (dir === 'zoom-in') {
      v.zoomFactor = Math.min(v.zoomFactor + 0.1, 3);
    } else if (dir === 'zoom-out') {
      v.zoomFactor = Math.max(v.zoomFactor - 0.1, 0.1);
    } else if (dir === 'zoom-reset') {
      v.zoomFactor = 1;
    }
    updateState(props._id, { zoom: v.zoomFactor });
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">

        <Tooltip placement="top-start" hasArrow={true} label={'Zoom Out'} openDelay={400}>
          <Button onClick={() => handleZoom('zoom-out')}>
            <MdRemove />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Zoom In'} openDelay={400}>
          <Button onClick={() => handleZoom('zoom-in')}>
            <MdAdd />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Download Notebook'} openDelay={400}>
          <Button onClick={downloadNotebook}>
            <MdFileDownload />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Open in Desktop'} openDelay={400}>
          <Button onClick={handleOpen}>
            <MdOpenInNew />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
