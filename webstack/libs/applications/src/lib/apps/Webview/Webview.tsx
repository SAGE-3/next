/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Button, ButtonGroup, Tooltip, Input, InputGroup, HStack } from '@chakra-ui/react';

import {
  MdArrowBack,
  MdArrowForward,
  MdRefresh,
  MdAdd,
  MdRemove,
  MdVolumeOff,
  MdOutlineSubdirectoryArrowLeft,
  MdVolumeUp,
} from 'react-icons/md';

import { App } from '../../schema';

import { useAppStore, useUser, processContentURL } from '@sage3/frontend';
import { state as AppState } from './index';
import { AppWindow, ElectronRequired } from '../../components';
import { isElectron } from './util';

// Electron and Browser components
// @ts-ignore
import { WebviewTag } from 'electron';

import create from 'zustand';
import { useParams } from 'react-router';

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
  const [zoom, setZoom] = useState(s.zoom ?? 1.0);
  const mute = useStore((state: any) => state.mute[props._id]);
  const setMute = useStore((state: any) => state.setMute);
  const createApp = useAppStore((state) => state.create);
  const { boardId, roomId } = useParams();
  const { user } = useUser();

  // Tracking the dom-ready and did-load events
  const [domReady, setDomReady] = useState(false);
  const [attached, setAttached] = useState(false);

  // Update from backend
  useEffect(() => {
    setUrl(s.webviewurl);
  }, [s.webviewurl]);

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

  useEffect(() => {
    if (domReady === false || attached === false) return;
    // Start page muted
    webviewNode.current.setAudioMuted(true);
    setMute(props._id, true);
  }, [domReady, attached]);

  useEffect(() => {
    if (domReady === false || attached === false) return;
    if (webviewNode.current) {
      webviewNode.current.stop();
      webviewNode.current.loadURL(url).catch((err: any) => {
        console.log('Webview> Error loading URL:', url, err);
        if (err.code === 'ERR_ABORTED') return;
      });
    }
  }, [url, domReady, attached]);

  useEffect(() => {
    if (domReady === false || attached === false) return;
    if (webviewNode.current && s.zoom) {
      setZoom(s.zoom);
      webviewNode.current.setZoomFactor(s.zoom);
    }
  }, [s.zoom, domReady]);

  /**
   * Observes for Page Changes
   */
  useEffect(() => {
    if (!isElectron()) return;
    if (domReady === false || attached === false) return;
    const webview = webviewNode.current;

    if (webview) {
      if (webview.getURL() !== url) {
        try {
          webviewNode.current
            .loadURL(url)
            .then(() => {
              console.log('Loaded URL:', url);
            })
            .catch((err: any) => {
              console.log('Webview> Error loading URL:', url, err);
            });
        } catch (e) {
          console.log(e);
        }
      }
    }

    /**
     * If a user changes the page by clicking/interacting a link on the webpage
     */
    const didNavigateInPage = (evt: any) => {
      console.log('Webview> did-navigate-in-page', evt.url);
    };

    webview.addEventListener('did-navigate-in-page', didNavigateInPage);

    return () => {
      if (webview) {
        webview.removeEventListener('did-navigate-in-page', didNavigateInPage);
      }
    };
  }, [url, attached, domReady]);

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
    const openUrlInNewWebviewApp = (url: string): void => {
      if (!user) return;
      createApp({
        title: url,
        roomId: roomId!,
        boardId: boardId!,
        position: { x: props.data.position.x + props.data.size.width + 15, y: props.data.position.y, z: 0 },
        size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'Webview',
        state: { webviewurl: processContentURL(url) },
        raised: true,
      });
    };

    // When the webview tries to open a new window
    const newWindow = (event: any) => {
      // console.log('new-window', event);
      if (event.url.includes(window.location.hostname)) {
        // Allow jupyter to stay within the same window
        setUrl(event.url);
      }
      // Open a new window
      else if (event.url !== 'about:blank') {
        openUrlInNewWebviewApp(event.url);
      }
    };

    // Check if destination is a PDF document and open another webview if so
    const willNavigate = (event: any) => {
      if (event.url && event.url.includes('.pdf')) {
        // Dont try to download a PDF
        event.preventDefault();
        webview.stop();
        openUrlInNewWebviewApp(event.url + '#toolbar=1&view=Fit');
      } else {
        setUrl(event.url);
        updateState(props._id, { webviewurl: event.url });
      }
    };

    const didNavigate = (event: any) => {
      // if (event.url != 'about:blank' && event.isInPlace && event.isMainFrame) {
      if (event.url != 'about:blank' && event.isMainFrame) {
        setUrl(event.url);
        updateState(props._id, { webviewurl: event.url });
      }
    };

    // Webview opened a new window
    webview.addEventListener('new-window', newWindow);
    // Check the url before navigating
    webview.addEventListener('will-navigate', willNavigate);
    webview.addEventListener('did-start-navigation', didNavigate);

    return () => {
      if (webview) {
        webview.removeEventListener('new-window', newWindow);
        webview.removeEventListener('will-navigate', willNavigate);
        webview.removeEventListener('did-start-navigation', didNavigate);
      }
    };
  }, [props.data.position, domReady]);

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
          link={s.webviewurl}
          title={props.data.title}
        />
      )}
    </AppWindow>
  );
}

/* App toolbar component for the app Webview */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const [urlValue, setUrlValue] = useState(s.webviewurl);
  const mute = useStore((state: any) => state.mute[props._id]);
  const setMute = useStore((state: any) => state.setMute);
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
      console.log('Webview> Invalid URL', url);
    }
  };

  const goBack = () => {
    view.goBack();
  };
  const goForward = () => {
    view.goForward();
  };

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
    <HStack>
      {isElectron() && (
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
          </ButtonGroup>
        </>
      )}
    </HStack>
  );
}

export default { AppComponent, ToolbarComponent };
