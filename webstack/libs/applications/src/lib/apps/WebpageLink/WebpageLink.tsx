/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useRef, useCallback, useState } from 'react';
import {
  ButtonGroup, Box, Button, useColorModeValue, Text, Heading, Tooltip, Image, useToast,
  useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, DrawerFooter,
} from '@chakra-ui/react';
import { MdWeb, MdViewSidebar, MdDesktopMac, MdCopyAll } from 'react-icons/md';

import { isElectron, useAppStore, processContentURL } from '@sage3/frontend';

import { state as AppState } from './index';
import { App, AppSchema } from '../../schema';
import { AppWindow } from '../../components';

// Electron and Browser components
// @ts-ignore
import { WebviewTag } from 'electron';

/* App component for BoardLink */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const url = s.url;

  const title = s.meta.title ? s.meta.title : 'No Title';
  const description = s.meta.description ? s.meta.description : 'No Description';
  const imageUrl = s.meta.image;

  const aspect = 1200 / 630;
  const imageHeight = 250;
  const imageWidth = imageHeight * aspect;

  // UI Stuff
  const dividerColor = useColorModeValue('gray.300', 'gray.600');
  const backgroundColor = useColorModeValue('gray.100', 'gray.800');

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  return (
    <AppWindow app={props} disableResize={true}>
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
    </AppWindow>
  );
}

/* App toolbar component for the app BoardLink */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // Stores
  const createApp = useAppStore((state) => state.create);
  // UI elements
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef<HTMLButtonElement>(null);
  const webviewNode = useRef<WebviewTag>();
  // Tracking the dom-ready and did-load events
  const [domReady, setDomReady] = useState(false);
  const [attached, setAttached] = useState(false);
  const [title, setTitle] = useState('Webview');

  // Init the webview
  const setWebviewRef = useCallback((node: WebviewTag) => {
    // event did-attach callback
    const didAttachCallback = (evt: any) => {
      webviewNode.current.removeEventListener('did-attach', didAttachCallback);
      setAttached(true);
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

      const titleUpdated = (event: any) => {
        // Update the app title
        setTitle(event.title);
      };
      webview.addEventListener('page-title-updated', titleUpdated);

      // After the partition has been set, you can navigate
      console.log('Setting webview url', s.url)
      webview.src = s.url;
    }
  }, []);

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
    navigator.clipboard.writeText(s.url);
    toast({
      title: 'Copied URL to clipboard',
      status: 'success',
      duration: 3000,
    });
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
    onOpen();
  };

  return (
    <>
      <Drawer placement='right' size='xl' variant="fifty" finalFocusRef={btnRef}
        isOpen={isOpen} onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent p={0} m={0}>
          <DrawerCloseButton />
          <DrawerHeader>{title}</DrawerHeader>

          <DrawerBody p={0} m={0}>
            <webview ref={setWebviewRef} allowpopups={'true' as any} style={{ width: "50vw", height: "100%" }}></webview>
          </DrawerBody>

          {/* <DrawerFooter>
            <Button colorScheme='blue' size="xs" onClick={onClose}>Done</Button>
          </DrawerFooter> */}
        </DrawerContent>
      </Drawer>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Open in SAGE3'} openDelay={400}>
          <Button onClick={openInSAGE3}>
            <MdWeb />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Open in Sidebar'} openDelay={400}>
          <Button onClick={openSidebar} ref={btnRef} isDisabled={!isElectron()}>
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
    </>
  );
}

export default { AppComponent, ToolbarComponent };
