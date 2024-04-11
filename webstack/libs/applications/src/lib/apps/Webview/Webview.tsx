/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router';

import { Button, ButtonGroup, Tooltip, Input, InputGroup, HStack, useToast, useDisclosure } from '@chakra-ui/react';
import {
  MdArrowBack,
  MdArrowForward,
  MdRefresh,
  MdAdd,
  MdRemove,
  MdVolumeOff,
  MdOutlineSubdirectoryArrowLeft,
  MdVolumeUp,
  MdOpenInNew,
  MdCopyAll,
  MdFileUpload,
  MdWeb,
} from 'react-icons/md';
import { FaEyeSlash } from 'react-icons/fa';

import { create } from 'zustand';

import { useAppStore, useUser, processContentURL, useHexColor, ConfirmValueModal, apiUrls, useUIStore } from '@sage3/frontend';
import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow, ElectronRequired } from '../../components';
import { isElectron } from './util';

// Electron and Browser components
// @ts-ignore
import { WebviewTag } from 'electron';

interface WebviewStore {
  title: { [key: string]: string };
  setTitle: (id: string, title: string) => void;

  mute: { [key: string]: boolean };
  setMute: (id: string, mute: boolean) => void;

  view: { [key: string]: WebviewTag };
  setView: (id: string, view: WebviewTag) => void;

  localURL: { [key: string]: string };
  setLocalURL: (id: string, url: string) => void;
}

export const useStore = create<WebviewStore>()((set) => ({
  title: {},
  setTitle: (id: string, title: string) => set((state) => ({ title: { ...state.title, ...{ [id]: title } } })),

  mute: {},
  setMute: (id: string, mute: boolean) => set((state) => ({ mute: { ...state.mute, ...{ [id]: mute } } })),

  view: {},
  setView: (id: string, view: WebviewTag) => set((state) => ({ view: { ...state.view, ...{ [id]: view } } })),

  localURL: {},
  setLocalURL: (id: string, url: string) => set((state) => ({ localURL: { ...state.localURL, ...{ [id]: url } } })),
}));

/* App component for Webview */

function AppComponent(props: App): JSX.Element {
  // App State
  const s = props.data.state as AppState;
  const update = useAppStore((state) => state.update);

  // Local State
  const webviewNode = useRef<WebviewTag>();
  const [url, setUrl] = useState<string>(s.webviewurl);
  const setView = useStore((state) => state.setView);
  const [zoom, setZoom] = useState(s.zoom ?? 1.0);
  const mute = useStore((state) => state.mute[props._id]);
  const setMute = useStore((state) => state.setMute);
  const createApp = useAppStore((state) => state.create);

  // UI
  const boardDragging = useUIStore((state) => state.boardDragging);

  // User and board info
  const { boardId, roomId } = useParams();
  const { user } = useUser();

  // Tracking the dom-ready and did-load events
  const [domReady, setDomReady] = useState(false);
  const [attached, setAttached] = useState(false);

  // Track if your URL matches the state's URL
  const [urlMatchesState, setUrlMatchesState] = useState(true);
  const matchIconColor = useHexColor('red');
  const setLocalURL = useStore((state) => state.setLocalURL);

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

      // save the webview for the toolbar
      setView(props._id, webview);

      // Special partitions to keep login info and settings separate
      if (url.indexOf('sharepoint.com') >= 0 || url.indexOf('live.com') >= 0 || url.indexOf('office.com') >= 0) {
        webview.partition = 'persist:office';
      } else if (url.indexOf('appear.in') >= 0 || url.indexOf('whereby.com') >= 0) {
        // VTC
        webview.partition = 'persist:whereby';
      } else if (url.indexOf('youtube.com') >= 0) {
        // VTC
        webview.partition = 'persist:youtube';
      } else if (url.indexOf('github.com') >= 0) {
        // GITHUB
        webview.partition = 'persist:github';
      } else if (url.indexOf('google.com') >= 0) {
        // GOOGLE
        webview.partition = 'persist:google';
      } else if (url.includes('.pdf')) {
        // PDF documents
        webview.partition = 'persist:pdf';
      } else if (url.includes(window.location.hostname)) {
        // Jupyter
        webview.partition = 'persist:jupyter';
      } else if (url.includes('colab.research.google.com')) {
        // Colab
        webview.partition = 'persist:colab';
      } else {
        // Isolation for other content
        webview.partition = 'partition_' + props._id;
      }

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
  }, []);

  // Load the new URL
  const loadURL = (url: string) => {
    if (domReady === false || attached === false) return;
    webviewNode.current.stop();
    webviewNode.current.loadURL(url).catch((err: any) => {
      console.log('Webview> Error loading URL:', url, err);
      if (err.code === 'ERR_ABORTED') return;
    });
  };

  // If the URL changes, check if it matches the state's URL
  useEffect(() => {
    setUrlMatchesState(url === s.webviewurl);
  }, [s.webviewurl, url]);

  // Update to URL from backend
  useEffect(() => {
    setUrl(s.webviewurl);
    setLocalURL(props._id, s.webviewurl);
    if (s.webviewurl !== url) {
      loadURL(s.webviewurl);
    }
  }, [s.webviewurl]);

  useEffect(() => {
    if (domReady === false || attached === false) return;
    // Start page muted if you are not a wall
    const isWall = user?.data.userType === 'wall' ? true : false;
    webviewNode.current.setAudioMuted(!isWall);
    setMute(props._id, isWall);
  }, [domReady, attached]);

  // First Load
  useEffect(() => {
    if (domReady === false || attached === false) return;
    if (webviewNode.current) {
      loadURL(url);
      setLocalURL(props._id, url);
    }
  }, [domReady, attached]);

  useEffect(() => {
    if (domReady === false || attached === false) return;
    if (webviewNode.current && s.zoom) {
      setZoom(s.zoom);
      webviewNode.current.setZoomFactor(s.zoom);
    }
  }, [s.zoom, domReady, attached]);

  /**
   * Observes for Mute Changes
   */
  useEffect(() => {
    if (!isElectron()) return;
    if (domReady === false || attached === false) return;
    const webview = webviewNode.current;
    if (webview) {
      webview.setAudioMuted(mute);
    }
  }, [mute, domReady, attached]);

  // Open a url in a new webview, should result from event new-window within webview component
  // Added here since there is access to more relevant information
  useEffect(() => {
    if (!isElectron()) return;
    if (domReady === false || attached === false) return;
    const webview = webviewNode.current;

    const openUrlInNewWebviewApp = (aUrl: string): void => {
      if (!user) return;
      createApp({
        title: aUrl,
        roomId: roomId!,
        boardId: boardId!,
        position: { x: props.data.position.x + props.data.size.width + 15, y: props.data.position.y, z: 0 },
        size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'Webview',
        state: { webviewurl: processContentURL(aUrl) },
        raised: true,
        dragging: false,
        pinned: false,
      });
    };

    // When the webview tries to open a new window
    const newWindow = (event: any) => {
      if (event.url.includes(window.location.hostname)) {
        // Allow jupyter to stay within the same window
        setUrl(event.url);
        setLocalURL(props._id, s.webviewurl);
      }
      // Open a new window
      else if (event.url !== 'about:blank') {
        openUrlInNewWebviewApp(event.url);
      }
    };

    const willNavigate = (event: any) => {
      // Check if destination is a PDF document and open another webview if so
      if (event.url && event.url.includes('.pdf')) {
        // Dont try to download a PDF
        event.preventDefault();
        webview.stop();
        openUrlInNewWebviewApp(event.url + '#toolbar=1&view=Fit&pagemode=none');
      } else {
        setUrl(event.url);
        setLocalURL(props._id, event.url);
      }
    };

    const didNavigate = (event: any) => {
      if (event.url != 'about:blank' && event.isMainFrame && !event.url.includes('.pdf')) {
        setUrl(event.url);
        setLocalURL(props._id, event.url);
      }
    };

    const openWebview = ({ url }: { url: string }) => {
      openUrlInNewWebviewApp(url);
    };

    // Webview opened a new window
    webview.addEventListener('new-window', newWindow);
    // Check the url before navigating
    webview.addEventListener('will-navigate', willNavigate);
    webview.addEventListener('did-start-navigation', didNavigate);

    window.electron.on('open-webview', openWebview);

    return () => {
      if (webview) {
        webview.removeEventListener('new-window', newWindow);
        webview.removeEventListener('will-navigate', willNavigate);
        webview.removeEventListener('did-start-navigation', didNavigate);
        window.electron.removeAllListeners('open-webview');
      }
    };
  }, [props.data.position, domReady]);

  // Open the url in the default browser or a new tab
  const handleOpen = () => {
    if (isElectron()) {
      window.electron.send('open-external-url', { url: s.webviewurl });
    }
  };

  const webviewStyle: React.CSSProperties = {
    width: props.data.size.width + 'px',
    height: props.data.size.height + 'px',
    objectFit: 'contain',
    background: 'white',
    visibility: boardDragging ? 'hidden' : 'visible',
  };

  return (
    <AppWindow app={props} hideBackgroundIcon={MdWeb}>
      {isElectron() ? (
        <div>
          {/* button */}
          {/* <Tooltip placement="top" hasArrow={true} label={'Open in Desktop'} openDelay={400}>
            <Button colorScheme="teal" variant="ghost" top={0} right={0} position={'absolute'} size={'lg'} onClick={handleOpen}>
              <MdOpenInNew />
            </Button>
          </Tooltip> */}
          {/* Webview */}

          {/* Warning Icon to show your view might not match others */}
          {!urlMatchesState && (
            <Tooltip placement="top" hasArrow={true} label={'Your view might not match everyone elses.'}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  bottom: 0,
                }}
              >
                <FaEyeSlash size={64} color={matchIconColor}></FaEyeSlash>
              </div>
            </Tooltip>
          )}

          <webview ref={setWebviewRef} style={webviewStyle} allowpopups={'true' as any}></webview>
        </div>
      ) : (
        <ElectronRequired appName={props.data.type} link={s.webviewurl} title={props.data.title} />
      )}
    </AppWindow>
  );
}

/* App toolbar component for the app Webview */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const mute = useStore((state) => state.mute[props._id]);
  const setMute = useStore((state) => state.setMute);
  const view = useStore((state) => state.view[props._id]);

  // Local URL
  const setLocalURL = useStore((state) => state.setLocalURL);
  const localURL = useStore((state) => state.localURL[props._id]);
  const [viewURL, setViewURL] = useState(localURL);
  // Save Confirmation  Modal
  const { isOpen: saveIsOpen, onOpen: saveOnOpen, onClose: saveOnClose } = useDisclosure();
  // Room and board
  const { roomId } = useParams();

  useEffect(() => {
    setViewURL(localURL);
  }, [localURL]);

  // Is Electron
  const clientIsElectron = isElectron();

  // Toast
  const toast = useToast();

  // from the UI to the react state
  const handleUrlChange = (event: any) => setLocalURL(props._id, event.target.value);

  // Used by electron to change the url, usually be in-page navigation.
  const changeUrl = (evt: any) => {
    evt.preventDefault();
    let url = localURL.trim();
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
      setLocalURL(props._id, url);
    } catch (error) {
      console.log('Webview> Invalid URL', url);
      toast({
        title: 'Invalid URL',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Go back in the webview history
  const goBack = () => {
    view.goBack();
  };

  // Go forward in the webview history
  const goForward = () => {
    view.goForward();
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

  // Open the url in the default browser or a new tab
  const handleOpen = () => {
    if (clientIsElectron) {
      window.electron.send('open-external-url', { url: s.webviewurl });
    } else {
      // Open in new tab
      window.open(s.webviewurl, '_blank');
    }
  };

  // Copy the url to the clipboard
  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(localURL);
      toast({
        title: 'Copied URL to clipboard',
        status: 'success',
        duration: 3000,
      });
    }
  };

  const saveInAssetManager = useCallback(
    (val: string) => {
      // save URL in asset manager
      if (!val.endsWith('.url')) {
        val += '.url';
      }
      // Generate the content of the file
      const content = `[InternetShortcut]\nURL=${viewURL}\n`;
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
    [viewURL, roomId]
  );

  return (
    <HStack>
      {clientIsElectron ? (
        <>
          <ButtonGroup isAttached size="xs" colorScheme="teal">
            <Tooltip placement="top-start" hasArrow={true} label={'Go Back'} openDelay={400}>
              <Button onClick={goBack}>
                <MdArrowBack />
              </Button>
            </Tooltip>

            <Tooltip placement="top-start" hasArrow={true} label={'Go Forward'} openDelay={400}>
              <Button onClick={goForward}>
                <MdArrowForward />
              </Button>
            </Tooltip>

            <Tooltip placement="top-start" hasArrow={true} label={'Reload Page'} openDelay={400}>
              <Button onClick={() => view.reload()}>
                <MdRefresh />
              </Button>
            </Tooltip>
          </ButtonGroup>

          <form onSubmit={changeUrl}>
            <InputGroup size="xs" minWidth="200px">
              <Input
                placeholder="Web Address"
                value={viewURL}
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
              <Button onClick={() => handleZoom('zoom-in')}>
                <MdAdd />
              </Button>
            </Tooltip>

            <Tooltip placement="top-start" hasArrow={true} label={'Zoom Out'} openDelay={400}>
              <Button onClick={() => handleZoom('zoom-out')}>
                <MdRemove />
              </Button>
            </Tooltip>

            <Tooltip placement="top-start" hasArrow={true} label={'Mute Webpage'} openDelay={400}>
              <Button onClick={() => setMute(props._id, !mute)}>{mute ? <MdVolumeOff /> : <MdVolumeUp />}</Button>
            </Tooltip>

            <Tooltip placement="top-start" hasArrow={true} label={'Save URL in Asset Manager'} openDelay={400}>
              <Button onClick={saveOnOpen} _hover={{ opacity: 0.7 }}>
                <MdFileUpload />
              </Button>
            </Tooltip>

            <Tooltip placement="top-start" hasArrow={true} label={'Copy URL'} openDelay={400}>
              <Button onClick={handleCopy}>{<MdCopyAll />}</Button>
            </Tooltip>

            <Tooltip placement="top-start" hasArrow={true} label={'Open in Desktop'} openDelay={400}>
              <Button onClick={handleOpen}>
                <MdOpenInNew />
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
      ) : (
        <>
          <Tooltip placement="top-start" hasArrow={true} label={'Open page in new tab.'} openDelay={400}>
            <Button onClick={handleOpen} size="xs" variant="solid" colorScheme="teal">
              Open
            </Button>
          </Tooltip>
          <Tooltip placement="top-start" hasArrow={true} label={'Copy URL'} openDelay={400}>
            <Button onClick={handleCopy} size="xs" variant="solid" colorScheme="teal">
              Copy
            </Button>
          </Tooltip>
        </>
      )}
    </HStack>
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
