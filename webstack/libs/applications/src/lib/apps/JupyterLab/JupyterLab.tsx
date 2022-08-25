/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Box, Button, Center } from '@chakra-ui/react';
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

  useEffect(() => {
    GetConfiguration().then((conf) => {
      if (conf.token) {
        console.log('Jupyter> token', conf.token);
        const newUrl = `http://${window.location.hostname}/lab?token=${conf.token}`;
        console.log('Jupyter> url', newUrl)
        setUrl(newUrl);
      }
    });
  }, []);


  // Init the webview
  const setWebviewRef = useCallback((node: WebviewTag) => {
    // event dom-ready callback
    const domReadyCallback = (webview: any) => {
      webview.removeEventListener('dom-ready', domReadyCallback)
    }

    if (node) {
      webviewNode.current = node;
      const webview = webviewNode.current;

      // Callback when the webview is ready
      webview.addEventListener('dom-ready', domReadyCallback(webview))

      const titleUpdated = (event: any) => {
        // Update the app title
        update(props._id, { description: event.title });
      };
      webview.addEventListener('page-title-updated', titleUpdated);

      // After the partition has been set, you can navigate
      webview.src = url;
    }
  }, [url]);

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
