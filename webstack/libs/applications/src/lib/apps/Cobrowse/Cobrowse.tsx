/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Button, Center } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { useAppStore, useUser } from '@sage3/frontend';
import { isElectron, waitForOpenSocket } from './util';
import create from 'zustand';

// Electron and Browser components
// @ts-ignore
import { WebviewTag } from 'electron';

export const useStore = create((set: any) => ({
  sock: {} as { [key: string]: WebSocket },
  setSock: (id: string, sock: WebSocket) => set((state: any) => ({ sock: { ...state.sock, ...{ [id]: sock } } })),
}));


/* App component for JupyterApp */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
  const webviewNode = useRef<WebviewTag>();
  const [url, setUrl] = useState<string | null>(s.sharedurl);

  const location = useLocation();
  const locationState = location.state as { boardId: string; roomId: string; };
  const { user } = useUser();
  const [mine, setMine] = useState(false);
  const [connected, setConnected] = useState(false);

  // Websocket to communicate with the server
  const rtcSock = useRef<WebSocket>();
  const setSock = useStore((state: any) => state.setSock);

  function handleStop() {
    console.log('RTC> Stop');
    if (rtcSock.current && rtcSock.current.readyState === WebSocket.OPEN) {
      console.log('RTC> SHOULD remove event listener');
      rtcSock.current.close();
      setConnected(false);
    }
  }

  useEffect(() => {
    if (user && props.data.ownerId === user._id) {
      // Update the local state
      setMine(true);
    }

    // Open websocket connection to the server
    const socketType = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${socketType}//${window.location.host}/rtc/${locationState.roomId}`;
    console.log('RTC> Connecting to', socketUrl);
    rtcSock.current = new WebSocket(socketUrl);
    rtcSock.current.addEventListener('open', () => {
      setConnected(true);
      if (rtcSock.current) {
        waitForOpenSocket(rtcSock.current).then(() => {
          if (rtcSock.current) {
            console.log('RTC> WS Connection Open', rtcSock.current.readyState);
            setSock(props._id, rtcSock.current);
            if (props.data.ownerId === user?._id) {
              console.log('RTC> Create group', props._id);
              rtcSock.current.send(JSON.stringify({ type: 'create', user: user?._id, app: props._id }));
            } else {
              console.log('RTC> Join group', props._id);
              rtcSock.current.send(JSON.stringify({ type: 'join', user: user?._id, app: props._id }));
            }
          }
        });
      }
    });

    return () => {
      // Closing the sharing session
      if (mine) {
        handleStop();
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (connected) return;

    console.log('Cobrowse> Started', mine, user?._id);

    const processRTCMessage = (ev: MessageEvent<any>) => {
      const data = JSON.parse(ev.data);
      console.log('RTC> Message', data.type);
      if (data.type === 'paint') {
        const imgid = "image" + props._id;
        const img = document.getElementById(imgid) as HTMLImageElement;
        if (img) {
          img.src = 'data:image/jpeg;charset=utf-8;base64,' + data.data;
        }
      }
    };

    if (rtcSock.current) {
      console.log('RTC> Adding event listener');
      rtcSock.current.addEventListener('message', processRTCMessage);
      rtcSock.current.addEventListener('close', () => {
        console.log('RTC> WS Close');
        if (rtcSock.current) rtcSock.current.removeEventListener('message', processRTCMessage);
      });
      rtcSock.current.addEventListener('error', (ev) => {
        console.log('RTC> WS Error', ev);
        if (rtcSock.current) rtcSock.current.removeEventListener('message', processRTCMessage);
      });
    }

    return () => {
      console.log('RTC> Stopped');
      if (rtcSock.current) {
        console.log('RTC> Removing event listener');
        rtcSock.current.removeEventListener('message', processRTCMessage);
        if (rtcSock.current.readyState === WebSocket.OPEN) {
          rtcSock.current.close();
        }
        setConnected(false);
      }
    };
  }, [mine]);


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

        const id = webview.getWebContentsId();
        console.log('getWebContentsId Webview id', id);
        updateState(props._id, { frame: id });
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
        mine ?
          <webview ref={setWebviewRef} style={nodeStyle} allowpopups={'true' as any} > </webview>
          : <img id={"image" + props._id}></img>
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
                  Current URL <a style={{ color: "#13a89e" }} href={s.sharedurl} rel="noreferrer" target="_blank">
                    {s.sharedurl} </a>
                </Box>
              </Center>
            </Box>
          </Center>
        </div>
      }
    </AppWindow >
  );
}

/* App toolbar component for the app JupyterApp */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const { user } = useUser();
  const [mine, setMine] = useState(false);
  const sock = useStore((state: any) => state.sock[props._id]);

  useEffect(() => {
    if (user && props.data.ownerId === user._id) {
      setMine(true);
    }
  }, [user]);

  const startStream = () => {
    if (isElectron()) {
      console.log('Cobrowse> startStream');
      // Load electron and the IPCRender
      const electron = window.require('electron');
      const ipcRenderer = electron.ipcRenderer;
      ipcRenderer.send('streamview', { url: s.sharedurl, id: s.frame });
      ipcRenderer.on('paint', (_evt: any, arg: any) => {
        sock.send(JSON.stringify({ type: 'paint', data: arg.buf }));
      });
    }
  };

  return (
    <>
      <Button colorScheme="green" disabled={!mine} onClick={startStream}>Stream</Button>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
