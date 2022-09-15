/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Box, Button, ButtonGroup, Center, Tooltip,
  Input, InputGroup, Menu, MenuButton, HStack,
} from '@chakra-ui/react';

import {
  MdArrowBack,
  MdArrowForward,
  MdRefresh,
  MdAdd,
  MdRemove,
  MdVolumeOff,
  MdOutlineSubdirectoryArrowLeft,
  MdHistory,
  MdVolumeUp,
} from 'react-icons/md';


import { App } from '../../schema';

import { useAppStore } from '@sage3/frontend';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { isElectron } from './util';

// Electron and Browser components
// @ts-ignore
import { WebviewTag } from 'electron';

import create from 'zustand';

export const useStore = create((set: any) => ({
  title: {} as { [key: string]: string },
  setTitle: (id: string, title: string) => set((state: any) => ({ title: { ...state.title, ...{ [id]: title } } })),

  mute: {} as { [key: string]: boolean },
  setMute: (id: string, mute: boolean) => set((state: any) => ({ mute: { ...state.mute, ...{ [id]: mute } } })),

  view: {} as { [key: string]: WebviewTag },
  setView: (id: string, view: WebviewTag) => set((state: any) => ({ view: { ...state.view, ...{ [id]: view } } })),
}));


/* App component for Webview */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
  const webviewNode = useRef<WebviewTag>();
  const [url, setUrl] = useState<string>(s.webviewurl);
  const setView = useStore((state: any) => state.setView);

  // Using Electron webview functions of the webivew requires the dom-ready event to be called first
  // This is used to track when that function has been called
  const [domReady, setDomReady] = useState(false);

  // Update from backend
  useEffect(() => {
    setUrl(s.webviewurl);
  }, [s.webviewurl]);

  // Init the webview
  const setWebviewRef = useCallback(
    (node: WebviewTag) => {
      // event dom-ready callback
      const domReadyCallback = (webview: any) => {
        webview.removeEventListener('dom-ready', domReadyCallback);
        // Timeout for dom-ready race stuff
        setTimeout(() => {
          setDomReady(true);
        }, 100);
      };

      if (node) {
        webviewNode.current = node;
        const webview = webviewNode.current;

        // save the webview for the toolbar
        setView(props._id, webview);

        // Special partitions to keep login info and settings separate
        if (url.indexOf("sharepoint.com") >= 0 ||
          url.indexOf("live.com") >= 0 ||
          url.indexOf("office.com") >= 0) {
          webview.partition = 'persist:office';
        } else if (url.indexOf("appear.in") >= 0 ||
          url.indexOf("whereby.com") >= 0) {
          // VTC
          webview.partition = 'persist:whereby';
        } else if (url.indexOf("youtube.com") >= 0) {
          // VTC
          webview.partition = 'persist:youtube';
        } else if (url.indexOf("github.com") >= 0) {
          // GITHUB
          webview.partition = 'persist:github';
        } else if (url.indexOf("google.com") >= 0) {
          // GOOGLE
          webview.partition = 'persist:google';
        } else if (url.includes(".pdf")) {
          // PDF documents
          webview.partition = 'persist:pdf';
        } else if (url.includes(window.location.hostname)) {
          // Jupyter
          webview.partition = 'persist:jupyter';
        } else if (url.includes("colab.research.google.com")) {
          // Colab
          webview.partition = 'persist:colab';
        } else {
          // Isolation for other content
          webview.partition = "partition_" + props._id;
        }

        // Callback when the webview is ready
        webview.addEventListener('dom-ready', domReadyCallback(webview));

        const titleUpdated = (event: any) => {
          // Update the app title
          update(props._id, { description: event.title });
        };
        webview.addEventListener('page-title-updated', titleUpdated);

        // After the partition has been set, you can navigate
        webview.src = url;
      }
    }, []);

  useEffect(() => {
    if (domReady === false) return;
    if (webviewNode.current) {
      webviewNode.current.stop();
      webviewNode.current.src = url;
    }
  }, [url, domReady]);

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
        <div style={{ width: props.data.size.width + 'px', height: props.data.size.height + 'px' }}>
          <Center w="100%" h="100%" bg="gray.700">
            <Box p={4}>
              <Center>
                <Box as="span" color="white" fontSize="2xl" fontWeight="bold" p="2rem">
                  Webview is only supported with the SAGE3 Desktop Application.
                </Box>
              </Center>
              <br />
              <Center>
                <Box as="span" color="white" fontSize="2xl" fontWeight="bold" p="2rem">
                  Current URL{' '}
                  <a style={{ color: '#13a89e' }} href={s.webviewurl} rel="noreferrer" target="_blank">
                    {s.webviewurl}{' '}
                  </a>
                </Box>
              </Center>
            </Box>
          </Center>
        </div>
      )}
    </AppWindow>
  );
}

/* App toolbar component for the app Webview */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const setMute = useStore((state: any) => state.setMute);
  const [urlValue, setUrlValue] = useState(s.webviewurl);
  const mute = useStore((state: any) => state.mute[props._id]);
  const view = useStore((state: any) => state.view[props._id]);

  // from the UI to the react state
  const handleUrlChange = (event: any) => setUrlValue(event.target.value);

  // Used by electron to change the url, usually be in-page navigation.
  const changeUrl = (evt: any) => {
    evt.preventDefault();
    let url = urlValue.trim();
    // Check for spaces. If they exist the this isn't a url. Create a google search
    if (url.indexOf(' ') !== -1) {
      url = 'https://www.google.com/search?q=' + url.replace(' ', '+');
    }
    // Maybe it is just a one word search. Check for no SPACES and has no periods.
    // Stuff like: news.google.com will bypass this but a search for 'Chicago' wont
    // But 'Chicago.' will fail....Probably a better way to do this.
    else if (url.indexOf(' ') === -1 && url.indexOf('.') === -1 && url.indexOf('localhost') === -1) {
      url = 'https://www.google.com/search?q=' + url.replace(' ', '+');
    }
    // Must be a URL
    else {
      if (!url.startsWith('http')) {
        // Add https protocol to make it a valid URL
        url = 'https://' + url;
      }
    }
    try {
      url = new URL(url).toString();
      updateState(props._id, { webviewurl: url });
      // update the address bar
      setUrlValue(url);
    } catch (error) {
      console.log('Webview> Invalid URL');
    }
  };

  return <HStack>
    <ButtonGroup isAttached size="xs" colorScheme="teal">
      <Tooltip placement="top-start" hasArrow={true} label={'Go Back'} openDelay={400}>
        <Button onClick={() => view.goBack()} >
          <MdArrowBack />
        </Button>
      </Tooltip>

      <Tooltip placement="top-start" hasArrow={true} label={'Go Forward'} openDelay={400}>
        <Button onClick={() => view.goForward()} >
          <MdArrowForward />
        </Button>
      </Tooltip>

      <Tooltip placement="top-start" hasArrow={true} label={'Reload Page'} openDelay={400}>
        <Button onClick={() => view.reload()} >
          <MdRefresh />
        </Button>
      </Tooltip>

      <Menu size="xs">
        <Tooltip placement="top-start" hasArrow={true} label={'History'} openDelay={400}>
          <MenuButton as={Button} size="xs" variant="solid">
            <MdHistory />
          </MenuButton>
        </Tooltip>
        {/* <MenuList >
          {addressState.history.map((el, idx) => {
            return addressState.historyIdx === idx ? (
              <MenuItem key={idx} color="teal" onClick={() => addressDispatch({ type: 'navigate-by-history', index: idx })}>
                {truncateWithEllipsis(el, 40)}
              </MenuItem>
            ) : (
              <MenuItem key={idx} onClick={() => addressDispatch({ type: 'navigate-by-history', index: idx })}>
                {truncateWithEllipsis(el, 40)}
              </MenuItem>
            );
          })}
        </MenuList> */}
      </Menu>
    </ButtonGroup>

    <form onSubmit={changeUrl}>
      <InputGroup size="xs" minWidth="200px">
        <Input
          placeholder="Web Address"
          value={urlValue}
          onChange={handleUrlChange}
          onPaste={(event) => {
            event.stopPropagation();
          }}
          backgroundColor="whiteAlpha.300"
        />
      </InputGroup>
    </form>

    <Tooltip placement="top-start" hasArrow={true} label={'Go to Web Address'} openDelay={400}>
      <Button onClick={changeUrl} size="xs" variant="solid" colorScheme="teal">
        <MdOutlineSubdirectoryArrowLeft />
      </Button>
    </Tooltip>

    <ButtonGroup isAttached size="xs" colorScheme="teal">
      <Tooltip placement="top-start" hasArrow={true} label={'Zoom In'} openDelay={400}>
        <Button
        // onClick={() => visualDispatch({ type: 'zoom-in' })}
        >
          <MdAdd />
        </Button>
      </Tooltip>

      <Tooltip placement="top-start" hasArrow={true} label={'Zoom Out'} openDelay={400}>
        <Button
        // onClick={() => visualDispatch({ type: 'zoom-out' })}
        >
          <MdRemove />
        </Button>
      </Tooltip>

      <Tooltip placement="top-start" hasArrow={true} label={'Mute Webpage'} openDelay={400}>
        <Button onClick={() => setMute(props._id, !mute)}>{mute ? <MdVolumeOff /> : <MdVolumeUp />}</Button>
      </Tooltip>
    </ButtonGroup>
  </HStack>;
}

export default { AppComponent, ToolbarComponent };
