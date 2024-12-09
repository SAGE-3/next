/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useRef, useCallback, useState, useEffect } from 'react';
import { useParams } from 'react-router';
import {
  ButtonGroup,
  Box,
  Button,
  useColorModeValue,
  Text,
  Heading,
  Tooltip,
  Image,
  useToast,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
} from '@chakra-ui/react';
import { MdWeb, MdViewSidebar, MdDesktopMac, MdCopyAll, MdFileDownload, MdFileUpload, MdLink } from 'react-icons/md';

import { isElectron, useAppStore, processContentURL, downloadFile, ConfirmValueModal, apiUrls } from '@sage3/frontend';
import { throttle } from 'throttle-debounce';
// Zustand
import { create } from 'zustand';

import { state as AppState } from './index';
import { App, AppSchema } from '../../schema';
import { AppWindow } from '../../components';

// Electron and Browser components
// @ts-ignore
import { WebviewTag } from 'electron';

interface SockStore {
  sock: { [key: string]: WebSocket };
  setSocket: (id: string, sock: WebSocket) => void;
}

export const useStore = create<SockStore>()((set) => ({
  sock: {},
  setSocket: (id: string, sock: WebSocket) => set((state) => ({ sock: { ...state.sock, ...{ [id]: sock } } })),
}));

/* App component for WebpageLink */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // UI Stuff
  const dividerColor = useColorModeValue('gray.300', 'gray.600');
  const backgroundColor = useColorModeValue('red.400', 'red.400');
  // App store
  const update = useAppStore((state) => state.update);

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  const [streaming, setStreaming] = useState(s.streaming);
  const [connected, setConnected] = useState(false);
  // Websocket to communicate with the server
  const rtcSock = useRef<WebSocket>();
  const setSocket = useStore((state) => state.setSocket);

  const url = s.url;
  const title = s.meta.title ? s.meta.title : url;
  const description = s.meta.description ? s.meta.description : 'No Description';
  const imageUrl = s.meta.image;

  const aspect = 1200 / 630;
  const imageHeight = 250;
  const imageWidth = imageHeight * aspect;

  // Update the titlebar of the app
  useEffect(() => {
    if (s.meta && s.meta.title) {
      update(props._id, { title: s.meta.title });
    }
  }, [s.meta]);

  useEffect(() => {
    setStreaming(s.streaming);
  }, [s.streaming]);

  function handleStop() {
    if (rtcSock.current && rtcSock.current.readyState === WebSocket.OPEN) {
      rtcSock.current.close();
      setConnected(false);
    }
  }

  useEffect(() => {
    if (streaming) {
      // Open websocket connection to the server
      const socketType = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socketUrl = `${socketType}//${window.location.host}/rtc/`;
      // Connection to the server
      rtcSock.current = new WebSocket(socketUrl);
      rtcSock.current.addEventListener('open', () => {
        setConnected(true);
        if (rtcSock.current) {
          const processRTCMessage = (ev: MessageEvent<any>) => {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'data' && msg.params.room === props._id) {
              const imgid = 'image' + props._id;
              const img = document.getElementById(imgid) as HTMLImageElement;
              if (img) {
                img.src = 'data:image/jpeg;charset=utf-8;base64,' + msg.params.pixels;
              }
            }
          };

          rtcSock.current.addEventListener('message', processRTCMessage);
          rtcSock.current.addEventListener('close', () => {
            if (rtcSock.current) rtcSock.current.removeEventListener('message', processRTCMessage);
          });

          // waitForOpenSocket(rtcSock.current).then(() => {
          // if (rtcSock.current) {
          setSocket(props._id, rtcSock.current);
          rtcSock.current.send(JSON.stringify({ type: 'join', params: { room: props._id } }));
          // }
          // });
        }
      });
    }
    return () => {
      if (streaming) handleStop();
    };
  }, [streaming]);

  return (
    <AppWindow app={props} disableResize={!streaming} hideBackgroundIcon={MdLink}>
      {!streaming ? (
        <Tooltip label={url} placement="top" openDelay={1000}>
          <Box width="100%" height="100%" display="flex" flexDir="column" justifyContent={'center'} alignItems={'center'}>
            {/* Preview Image */}
            <Box
              width={imageWidth}
              height={imageHeight}
              backgroundSize="contain"
              backgroundColor={backgroundColor}
              display="flex"
              alignItems="center"
              justifyContent="center"
              textAlign={'center'}
              flexDir={'column'}
              color="white"
            >
              {imageUrl ? <Image src={imageUrl} /> : <MdWeb size={256} />}
            </Box>

            {/* Info Sections */}
            <Box
              display="flex"
              flexDir={'column'}
              justifyContent={'space-between'}
              height={400 - imageHeight}
              width="100%"
              p="3"
              pt="1"
              borderTop="solid 4px"
              borderColor={dividerColor}
              background={linearBGColor}
            >
              <Box display="flex" flexDir={'column'} height="150px" overflow={'hidden'} textOverflow="ellipsis">
                <Box>
                  <Heading size="lg" textOverflow="ellipsis" overflow="hidden">
                    {title}
                  </Heading>
                </Box>
                <Box>
                  <Text overflow="hidden" textOverflow={'ellipsis'}>
                    {description}
                  </Text>
                </Box>
              </Box>
            </Box>
          </Box>
        </Tooltip>
      ) : (
        <Image id={'image' + props._id} w={'100%'} h={'auto'} alt={'webview streaming'} background={'white'} />
      )}
    </AppWindow>
  );
}

/* App toolbar component for the app BoardLink */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // Stores
  const createApp = useAppStore((state) => state.create);
  const sock = useStore((state) => state.sock[props._id]);
  // Local State
  const btnRef = useRef<HTMLButtonElement>(null);
  const webviewNode = useRef<WebviewTag>();
  // Tracking the dom-ready and did-load events
  const [domReady, setDomReady] = useState(false);
  const [attached, setAttached] = useState(false);
  const [title, setTitle] = useState('Webview');
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const [streaming, setStreaming] = useState(s.streaming);

  // UI elements
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isE = isElectron();
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  // Save Confirmation  Modal
  const { isOpen: saveIsOpen, onOpen: saveOnOpen, onClose: saveOnClose } = useDisclosure();
  // Room and board
  const { roomId } = useParams();

  // Throttle Function
  const throttleUpdate = throttle(60, (data: any, width: number, height: number) => {
    // save the dimensions of the sidebar
    setDimensions({ width, height });
    // Send the pixels to the server
    if (sock && sock.readyState === sock.OPEN) {
      sock.send(JSON.stringify({ type: 'pixels', params: { room: props._id, pixels: data, width, height } }));
    }
  });
  // Keep the throttlefunc reference
  const throttleFunc = useCallback(throttleUpdate, [sock]);

  // Init the webview
  const setWebviewRef = useCallback((node: WebviewTag) => {
    // event did-attach callback
    const didAttachCallback = (evt: any) => {
      webviewNode.current.removeEventListener('did-attach', didAttachCallback);
      setAttached(true);
    };
    // event destroyed callback
    const didDestroyed = (evt: any) => {
      webviewNode.current.removeEventListener('destroyed', didDestroyed);
      setAttached(false);
      setDomReady(false);
    };

    // event dom-ready callback
    const domReadyCallback = (evt: any) => {
      webviewNode.current.removeEventListener('dom-ready', domReadyCallback);
      setDomReady(true);
    };

    if (node) {
      webviewNode.current = node;
      const webview = webviewNode.current;

      // Callback when the webview is ready
      webview.addEventListener('dom-ready', domReadyCallback);
      webview.addEventListener('did-attach', didAttachCallback);
      webview.addEventListener('destroy', didDestroyed);

      const titleUpdated = (event: any) => {
        // Update the app title
        setTitle(event.title);
      };
      webview.addEventListener('page-title-updated', titleUpdated);

      // process url to be embeddable
      const final_url = processContentURL(s.url);
      webview.src = final_url;
    }
  }, []);

  useEffect(() => {
    setStreaming(s.streaming);
  }, [s.streaming]);

  useEffect(() => {
    if (isE && domReady && attached && webviewNode.current && streaming && sock && sock.readyState === sock.OPEN) {
      // Get the webview id for electron to grab pixels
      const id = webviewNode.current.getWebContentsId();
      // Load electron and the IPCRender
      window.electron.on('paint', (arg: any) => {
        if (arg.id === id) throttleFunc(arg.buf, arg.dirty.width, arg.dirty.height);
      });
      // Get the webview dimensions for mobile emulation
      const width = webviewNode.current.offsetWidth;
      const height = webviewNode.current.offsetHeight;
      // save the dimensions of the sidebar
      setDimensions({ width, height });
      // Send the streamview event to electron
      window.electron.send('streamview', { url: s.url, id, width, height });
    } else {
      if (webviewNode.current) {
        if (attached && domReady) {
          // Get the webview id for electron to grab pixels
          const id = webviewNode.current.getWebContentsId();
          window.electron.send('streamview_stop', { id });
        }
      }
    }
  }, [streaming, sock, attached, domReady]);

  const openUrl = () => {
    if (!s.url) return;
    if (isElectron()) {
      window.electron.send('open-external-url', { url: s.url });
    } else {
      window.open(s.url, '_blank');
    }
  };

  const copyUrl = () => {
    if (!s.url) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(s.url);
      toast({
        title: 'Copied URL to clipboard',
        status: 'success',
        duration: 3000,
      });
    }
  };

  const openInSAGE3 = async () => {
    // process url to be embeddable
    const final_url = processContentURL(s.url);
    let w = 800;
    let h = 800;
    if (final_url !== s.url) {
      // might be a video
      w = 1280;
      h = 720;
    }
    const newApp = {
      type: 'Webview',
      state: {
        webviewurl: final_url,
        zoom: 1.0,
      },
      title: 'Webview',
      roomId: props.data.roomId,
      boardId: props.data.boardId,
      position: {
        x: props.data.position.x + props.data.size.width + 50,
        y: props.data.position.y,
        z: props.data.position.z,
      },
      size: { width: w, height: h },
      rotation: { x: 0, y: 0, z: 0 },
      raised: false,
      dragging: false,
    } as AppSchema;

    const res = await createApp(newApp);
    if (!res.success) {
      toast({
        title: res.message ? res.message : 'Error creating app',
        description: res.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const openSidebar = () => {
    updateState(props._id, { streaming: true });
    update(props._id, {
      size: {
        width: props.data.size.width,
        height: props.data.size.width * (dimensions.height / dimensions.width),
        depth: props.data.size.depth,
      },
    });

    onOpen();
  };

  const closing = () => {
    updateState(props._id, { streaming: false });
    setStreaming(false);
    setDomReady(false);
    setAttached(false);
    update(props._id, { size: { width: 400, height: 400, depth: props.data.size.depth } });
    onClose();
  };

  /**
   * Download the stickie as a text file
   * @returns {void}
   */
  const downloadURL = (): void => {
    // Generate the content of the file
    const content = `[InternetShortcut]\nURL=${s.url}\n`;
    // generate a URL containing the text of the note
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    // Make a filename from the title
    const filename = 'link-' + props.data.title.split(' ').slice(0, 2).join('-') + '.url';
    // Go for download
    downloadFile(txturl, filename);
  };

  const saveInAssetManager = useCallback(
    (val: string) => {
      // save cell code in asset manager
      if (!val.endsWith('.url')) {
        val += '.url';
      }
      // Generate the content of the file
      const content = `[InternetShortcut]\nURL=${s.url}\n`;
      // Save the code in the asset manager
      if (roomId) {
        // Create a form to upload the file
        const fd = new FormData();
        const codefile = new File([new Blob([content])], val);
        fd.append('files', codefile);
        // Add fields to the upload form
        fd.append('room', roomId);
        // Upload with a POST request
        fetch(apiUrls.assets.upload, { method: 'POST', body: fd })
          .catch((error: Error) => {
            toast({
              title: 'Upload',
              description: 'Upload failed: ' + error.message,
              status: 'warning',
              duration: 4000,
              isClosable: true,
            });
          })
          .finally(() => {
            toast({
              title: 'Upload',
              description: 'Upload complete',
              status: 'info',
              duration: 4000,
              isClosable: true,
            });
          });
      }
    },
    [s.url, roomId]
  );

  // Update the size of the app when the sidebar is resized
  useEffect(() => {
    update(props._id, {
      size: {
        width: props.data.size.width,
        height: props.data.size.width * (dimensions.height / dimensions.width),
        depth: props.data.size.depth,
      },
    });
  }, [dimensions.width, dimensions.height]);

  return (
    <>
      <Drawer placement="right" size="xl" variant="fifty" finalFocusRef={btnRef} isOpen={isOpen} onClose={closing}>
        <DrawerOverlay />
        <DrawerContent p={0} m={0}>
          <DrawerCloseButton />
          <DrawerHeader>{title}</DrawerHeader>
          <DrawerBody p={0} m={0}>
            <webview ref={setWebviewRef} allowpopups={'true' as any} style={{ width: '50vw', height: '100%' }}></webview>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Open in SAGE3'} openDelay={400}>
          <Button onClick={openInSAGE3}>
            <MdWeb />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Stream webview'} openDelay={400}>
          <Button onClick={openSidebar} ref={btnRef} isDisabled={!isElectron() || streaming}>
            <MdViewSidebar />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Open in Desktop'} openDelay={400}>
          <Button onClick={openUrl}>
            <MdDesktopMac />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top-start" hasArrow={true} label={'Copy URL to Clipboard'} openDelay={400}>
          <Button onClick={copyUrl}>
            <MdCopyAll />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Save URL in Asset Manager'} openDelay={400}>
          <Button onClick={saveOnOpen} _hover={{ opacity: 0.7 }}>
            <MdFileUpload />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Download Link'} openDelay={400}>
          <Button onClick={downloadURL} _hover={{ opacity: 0.7 }}>
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ConfirmValueModal
        isOpen={saveIsOpen}
        onClose={saveOnClose}
        onConfirm={saveInAssetManager}
        title="Save URL in Asset Manager"
        message="Select a file name:"
        initiaValue={props.data.title.split(' ').slice(0, 2).join('-') + '.url'}
        cancelText="Cancel"
        confirmText="Save"
        confirmColor="green"
      />
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
