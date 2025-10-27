/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router';

import { Button, ButtonGroup, Tooltip, Input, InputGroup, InputRightElement, HStack, useToast, useDisclosure } from '@chakra-ui/react';
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
  MdCallMade,
  MdCallReceived,
} from 'react-icons/md';

import { create } from 'zustand';

import { useAppStore, useUser, processContentURL, ConfirmValueModal, apiUrls, useUIStore, useWindowResize } from '@sage3/frontend';
import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow, ElectronRequired } from '../../components';
import { isElectron } from './util';

// Electron WebviewTag type
// @ts-ignore
import { WebviewTag } from 'electron';

/**
 * Zustand store for managing webview instances across the application
 */
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
  const updateState = useAppStore((state) => state.updateState);

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

  // Track webview ready states
  const [domReady, setDomReady] = useState(false);
  const [attached, setAttached] = useState(false);

  const setLocalURL = useStore((state) => state.setLocalURL);

  /**
   * Initialize the webview element and set up partitions based on URL
   */
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

      // Save the webview reference for toolbar access
      setView(props._id, webview);

      // Set partition to persist login info and settings per service
      // This allows users to stay logged in across app instances
      if (url.indexOf('sharepoint.com') >= 0 || url.indexOf('live.com') >= 0 || url.indexOf('office.com') >= 0) {
        webview.partition = 'persist:office';
      } else if (url.indexOf('appear.in') >= 0 || url.indexOf('whereby.com') >= 0) {
        webview.partition = 'persist:whereby';
      } else if (url.indexOf('youtube.com') >= 0) {
        webview.partition = 'persist:youtube';
      } else if (url.indexOf('github.com') >= 0) {
        webview.partition = 'persist:github';
      } else if (url.indexOf('google.com') >= 0) {
        webview.partition = 'persist:google';
      } else if (url.includes('.pdf')) {
        webview.partition = 'persist:pdf';
      } else if (url.includes(window.location.hostname)) {
        webview.partition = 'persist:jupyter';
      } else if (url.includes('colab.research.google.com')) {
        webview.partition = 'persist:colab';
      } else {
        // Unique partition for isolation
        webview.partition = 'partition_' + props._id;
      }

      // Callback when the webview is ready
      webview.addEventListener('dom-ready', domReadyCallback);
      webview.addEventListener('did-attach', didAttachCallback);

      const titleUpdated = (event: any) => {
        // Update the app title to match webpage title
        update(props._id, { title: event.title });
      };
      webview.addEventListener('page-title-updated', titleUpdated);

      // Set initial URL after partition is configured
      webview.src = url;
    }
  }, []);

  /**
   * Load a new URL in the webview
   */
  const loadURL = (url: string) => {
    if (domReady === false || attached === false) return;
    webviewNode.current.stop();
    webviewNode.current.loadURL(url).catch((err: any) => {
      console.log('Webview> Error loading URL:', url, err);
      if (err.code === 'ERR_ABORTED') return;
    });
  };

  /**
   * Load URL from backend when it changes
   * Note: This only loads the URL locally, it doesn't sync back to prevent loops
   */
  useEffect(() => {
    if (s.webviewurl !== url) {
      setUrl(s.webviewurl);
      setLocalURL(props._id, s.webviewurl);
      loadURL(s.webviewurl);
    }
  }, [s.webviewurl]);

  /**
   * Initialize audio mute state when webview is ready
   */
  useEffect(() => {
    if (domReady === false || attached === false) return;
    webviewNode.current.setAudioMuted(false);
    setMute(props._id, false);
  }, [domReady, attached]);

  /**
   * Load initial URL when webview is ready
   */
  useEffect(() => {
    if (domReady === false || attached === false) return;
    if (webviewNode.current) {
      loadURL(url);
      setLocalURL(props._id, url);
    }
  }, [domReady, attached]);

  /**
   * Sync zoom level from backend state
   */
  useEffect(() => {
    if (domReady === false || attached === false) return;
    if (webviewNode.current && s.zoom) {
      setZoom(s.zoom);
      webviewNode.current.setZoomFactor(s.zoom);
    }
  }, [s.zoom, domReady, attached]);

  /**
   * Apply mute state changes to the webview
   */
  useEffect(() => {
    if (!isElectron()) return;
    if (domReady === false || attached === false) return;
    const webview = webviewNode.current;
    if (webview) {
      webview.setAudioMuted(mute);
    }
  }, [mute, domReady, attached]);

  /**
   * Set up webview navigation event listeners
   * Handles new windows, PDF links, and URL changes
   */
  useEffect(() => {
    if (!isElectron()) return;
    if (domReady === false || attached === false) return;
    const webview = webviewNode.current;

    /**
     * Create a new Webview app positioned next to this one
     */
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

    /**
     * Handle new window events from the webview
     */
    const newWindow = (event: any) => {
      if (event.url.includes(window.location.hostname)) {
        // Allow Jupyter and local services to stay within the same window
        setUrl(event.url);
        setLocalURL(props._id, s.webviewurl);
      } else if (event.url !== 'about:blank') {
        // Open in a new webview app
        openUrlInNewWebviewApp(event.url);
      }
    };

    /**
     * Intercept PDF navigation and open in a new webview instead
     */
    const willNavigate = (event: any) => {
      if (event.url && event.url.includes('.pdf')) {
        // Don't download PDF, open it in a new webview app
        event.preventDefault();
        webview.stop();
        openUrlInNewWebviewApp(event.url + '#toolbar=1&view=Fit&pagemode=none');
      } else {
        setUrl(event.url);
        setLocalURL(props._id, event.url);
      }
    };

    /**
     * Handle completed navigation (full page loads)
     * Note: Only updates local state - manual sync required via toolbar buttons
     */
    const didNavigate = (event: any) => {
      if (event.url != 'about:blank' && event.isMainFrame && !event.url.includes('.pdf')) {
        setUrl(event.url);
        setLocalURL(props._id, event.url);
      }
    };
    
    /**
     * Handle in-page navigation (SPA route changes, hash changes, etc.)
     * Note: Only updates local state - manual sync required via toolbar buttons
     */
    const didNavigateInPage = (event: any) => {
      if (event.url != 'about:blank' && !event.url.includes('.pdf')) {
        setUrl(event.url);
        setLocalURL(props._id, event.url);
      }
    };

    /**
     * Handle IPC message to open URL in a new webview
     */
    const openWebview = ({ url }: { url: string }) => {
      openUrlInNewWebviewApp(url);
    };

    // Register event listeners
    webview.addEventListener('new-window', newWindow);
    webview.addEventListener('will-navigate', willNavigate);
    webview.addEventListener('did-navigate', didNavigate);
    webview.addEventListener('did-navigate-in-page', didNavigateInPage);
    window.electron.on('open-webview', openWebview);

    // Cleanup on unmount
    return () => {
      if (webview) {
        webview.removeEventListener('new-window', newWindow);
        webview.removeEventListener('will-navigate', willNavigate);
        webview.removeEventListener('did-navigate', didNavigate);
        webview.removeEventListener('did-navigate-in-page', didNavigateInPage);
        window.electron.removeAllListeners('open-webview');
      }
    };
  }, [props.data.position, domReady]);

  /**
   * Handle window resize when app is focused
   */
  const isFocused = useUIStore((state) => state.focusedAppId === props._id);
  const { width: winWidth, height: winHeight } = useWindowResize();

  const webviewStyle: React.CSSProperties = {
    width: isFocused ? winWidth + 'px' : props.data.size.width + 'px',
    height: isFocused ? winHeight + 'px' : props.data.size.height + 'px',
    objectFit: 'contain',
    background: 'white',
    visibility: boardDragging ? 'hidden' : 'visible',
  };

  return (
    <AppWindow app={props} hideBackgroundIcon={MdWeb}>
      {isElectron() ? (
        <webview ref={setWebviewRef} style={webviewStyle} allowpopups={'true' as any}></webview>
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

  // Local URL state
  const setLocalURL = useStore((state) => state.setLocalURL);
  const localURL = useStore((state) => state.localURL[props._id]);
  const [viewURL, setViewURL] = useState(localURL);
  
  // Modal state
  const { isOpen: saveIsOpen, onOpen: saveOnOpen, onClose: saveOnClose } = useDisclosure();
  
  // Room info
  const { roomId } = useParams();

  // Sync viewURL with localURL
  useEffect(() => {
    setViewURL(localURL);
  }, [localURL]);

  const clientIsElectron = isElectron();
  const toast = useToast();

  // Check if local URL differs from backend URL
  const urlsMatch = localURL === s.webviewurl;

  /**
   * Handle URL input changes
   */
  const handleUrlChange = (event: any) => {
    setViewURL(event.target.value);
  }

  /**
   * Navigate to the URL from the address bar
   * Handles both URLs and search queries
   */
  const changeUrl = (evt: any) => {
    evt.preventDefault();
    let url = viewURL.trim();
    
    // If input contains spaces, treat it as a search query
    if (url.indexOf(' ') !== -1) {
      url = 'https://www.google.com/search?q=' + url.replace(' ', '+');
    }
    // Single word with no periods (excluding localhost) - treat as search
    else if (url.indexOf(' ') === -1 && url.indexOf('.') === -1 && url.indexOf('localhost') === -1) {
      url = 'https://www.google.com/search?q=' + url.replace(' ', '+');
    }
    // Must be a URL
    else {
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
    }
    
    try {
      url = new URL(url).toString();
      updateState(props._id, { webviewurl: url });
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

  /**
   * Navigate back in webview history
   */
  const goBack = () => {
    view.goBack();
  };

  /**
   * Navigate forward in webview history
   */
  const goForward = () => {
    view.goForward();
  };

  /**
   * Handle zoom controls for the webview
   */
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

  /**
   * Open current URL in default browser or new tab
   */
  const handleOpen = () => {
    if (clientIsElectron) {
      window.electron.send('open-external-url', { url: s.webviewurl });
    } else {
      window.open(s.webviewurl, '_blank');
    }
  };

  /**
   * Copy current URL to clipboard
   */
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

  /**
   * Update the shared URL with your current page (push to other clients)
   */
  const syncCurrentUrl = () => {
    if (localURL) {
      updateState(props._id, { webviewurl: localURL });
      toast({
        title: 'URL updated for group',
        status: 'success',
        duration: 2000,
      });
    }
  };

  /**
   * Revert to the shared URL (pull from other clients)
   */
  const returnToGroup = () => {
    if (s.webviewurl && view) {
      view.loadURL(s.webviewurl);
      setLocalURL(props._id, s.webviewurl);
      toast({
        title: 'Reverted to group URL',
        status: 'success',
        duration: 2000,
      });
    }
  };

  /**
   * Save the current URL as a .url file in the asset manager
   */
  const saveInAssetManager = useCallback(
    (val: string) => {
      if (!val.endsWith('.url')) {
        val += '.url';
      }
      
      // Generate Internet Shortcut file content
      const content = `[InternetShortcut]\nURL=${viewURL}\n`;
      
      if (roomId) {
        const fd = new FormData();
        const codefile = new File([new Blob([content])], val);
        fd.append('files', codefile);
        fd.append('room', roomId);
        
        // Upload to asset manager
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
            <Tooltip placement="top" hasArrow={true} label={'Go Back'} openDelay={400}>
              <Button onClick={goBack} size="xs" px={0}>
                <MdArrowBack size="16px" />
              </Button>
            </Tooltip>

            <Tooltip placement="top" hasArrow={true} label={'Go Forward'} openDelay={400}>
              <Button onClick={goForward} size="xs" px={0}>
                <MdArrowForward size="16px" />
              </Button>
            </Tooltip>

            <Tooltip placement="top" hasArrow={true} label={'Reload Page'} openDelay={400}>
              <Button onClick={() => view.reload()} size="xs" px={0}>
                <MdRefresh size="16px" />
              </Button>
            </Tooltip>
          </ButtonGroup>

          <form onSubmit={changeUrl}>
            <InputGroup size="xs" minWidth="250px">
              <Input
                placeholder="Web Address"
                value={viewURL}
                onChange={handleUrlChange}
                onPaste={(event) => {
                  event.stopPropagation();
                }}
                backgroundColor="whiteAlpha.300"
                paddingRight="50px"
                borderRadius="md"
              />
              <InputRightElement width="auto" paddingRight="2px">
                <Tooltip placement="top" hasArrow={true} label={'Go to Web Address'} openDelay={400}>
                  <Button onClick={changeUrl} size="xs" variant="ghost" colorScheme="teal" height="20px">
                    <MdOutlineSubdirectoryArrowLeft size="16px" />
                  </Button>
                </Tooltip>
              </InputRightElement>
            </InputGroup>
          </form>

          <ButtonGroup isAttached size="xs" colorScheme={urlsMatch ? "gray" : "orange"} variant="solid" >
            <Tooltip 
              placement="top" 
              hasArrow={true} 
              label={urlsMatch ? 'Already synced' : `Revert to the shared URL`}
              openDelay={400}
            >
              <Button 
                onClick={returnToGroup} 
                size="xs"
                isDisabled={urlsMatch}
                px={0}
              >
                <MdCallReceived size="16px" />
              </Button>
            </Tooltip>

            <Tooltip 
              placement="top" 
              hasArrow={true} 
              label={urlsMatch ? 'Already synced' : `Update the shared URL`}
              openDelay={400}
            >
              <Button 
                onClick={syncCurrentUrl} 
                size="xs"
                isDisabled={urlsMatch}
                px={0}
              >
                <MdCallMade size="16px" />
              </Button>
            </Tooltip>
          </ButtonGroup>

          <ButtonGroup isAttached size="xs" colorScheme="teal" mr="1">
            <Tooltip placement="top" hasArrow={true} label={'Zoom In'} openDelay={400}>
              <Button onClick={() => handleZoom('zoom-in')} size="xs" px={0}>
                <MdAdd size="16px" />
              </Button>
            </Tooltip>

            <Tooltip placement="top" hasArrow={true} label={'Zoom Out'} openDelay={400}>
              <Button onClick={() => handleZoom('zoom-out')} size="xs" px={0}>
                <MdRemove size="16px" />
              </Button>
            </Tooltip>

            <Tooltip placement="top" hasArrow={true} label={'Mute Webpage'} openDelay={400}>
              <Button onClick={() => setMute(props._id, !mute)} size="xs" px={0}>{mute ? <MdVolumeOff size="16px" /> : <MdVolumeUp size="16px" />}</Button>
            </Tooltip>

            <Tooltip placement="top" hasArrow={true} label={'Save URL in Asset Manager'} openDelay={400}>
              <Button onClick={saveOnOpen} _hover={{ opacity: 0.7 }} size="xs" px={0}>
                <MdFileUpload size="16px" />
              </Button>
            </Tooltip>

            <Tooltip placement="top" hasArrow={true} label={'Copy URL'} openDelay={400}>
              <Button onClick={handleCopy} size="xs" px={0}>
                <MdCopyAll size="16px" />
              </Button>
            </Tooltip>

            <Tooltip placement="top" hasArrow={true} label={'Open in Desktop'} openDelay={400}>
              <Button onClick={handleOpen} size="xs" px={0}>
                <MdOpenInNew size="16px" />
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
          <Tooltip placement="top" hasArrow={true} label={'Open page in new tab.'} openDelay={400}>
            <Button onClick={handleOpen} size="xs" variant="solid" colorScheme="teal">
              Open
            </Button>
          </Tooltip>
          <Tooltip placement="top" hasArrow={true} label={'Copy URL'} openDelay={400}>
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
