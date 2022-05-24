/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: webview
 * created by: Dylan
 */

// Import the React library
import React, { useEffect, useRef, useState, CSSProperties, useCallback } from 'react';
import { Box, Center } from '@chakra-ui/react';

// SAGE3
import { isElectron } from './util';
import { useSageStateAtom, useSageStateReducer } from '@sage3/frontend/smart-data/hooks';

// Electron and Browser components
// @ts-ignore
import { WebviewTag } from 'electron';
import { useAction } from '@sage3/frontend/services';
import { processContentURL } from '@sage3/frontend/utils/misc';

// Import the CSS definitions for this application
import { addressReducer, visualReducer } from './webviewreducer';
import { webviewProps } from './metadata';
import { useStore } from '.';

/**
 * App to show webview
 * @param props
 */
export const AppsWebview = (props: webviewProps): JSX.Element => {

  const { data: addressState, dispatch: addressDispatch } = useSageStateReducer(props.state.address, addressReducer);
  const { data: visualState, dispatch: visualDispatch } = useSageStateReducer(props.state.visual, visualReducer);
  const { data: needReload, setData: setReload } = useSageStateAtom<{ reload: boolean }>(props.state.local);

  // To allow creation of new-windows as a new webview app
  const { act } = useAction();

  // Using Electron webview functions of the webivew requires the dom-ready event to be called first
  // This is used to track when that function has been called
  const [domReady, setDomReady] = useState(false);
  const webviewNode = useRef<WebviewTag>();

  // Title
  const setTitle = useStore((state: any) => state.setTitle)

  // Mute
  const setMute = useStore((state: any) => state.setMute)
  const mute = useStore((state: any) => state.mute[props.id])

  // Initialization
  useEffect(() => {
    // reset the history
    addressDispatch({ type: "init" });
  }, []);

  // Init the webview
  const setWebviewRef = useCallback(node => {
    // event dom-ready callback
    const domReadyCallback = (webview: any) => {

      webview.removeEventListener('dom-ready', domReadyCallback)
      // Timeout for dom-ready race stuff
      setTimeout(() => {
        setDomReady(true)
        webview.insertCSS(`
        ::-webkit-scrollbar {
          width: 35px;
        }
        ::-webkit-scrollbar-track {
            background: rgba(100,100,100,1);
            -webkit-box-shadow: inset 0 0 6px rgba(60,60,60,1);
            border-radius: 8px;
        }
        ::-webkit-scrollbar-track-piece {
            background: rgba(180,180,180,1);
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(100,100,100,1);
            -webkit-box-shadow: inset 0 0 6px rgba(60,60,60,1);
            border-radius: 8px;
        }`);
      }, 1000);
    }

    if (node) {
      webviewNode.current = node;
      const webview = webviewNode.current;

      // Get the current URL from the history
      const currentUrl = addressState.history[addressState.historyIdx];

      // Special partitions to keep login info and settings separate
      if (currentUrl.indexOf("sharepoint.com") >= 0 ||
        currentUrl.indexOf("live.com") >= 0 ||
        currentUrl.indexOf("office.com") >= 0) {
        webview.partition = 'persist:office';
      } else if (currentUrl.indexOf("appear.in") >= 0 ||
        currentUrl.indexOf("whereby.com") >= 0) {
        // VTC
        webview.partition = 'persist:whereby';
      } else if (currentUrl.indexOf("youtube.com") >= 0) {
        // VTC
        webview.partition = 'persist:youtube';
      } else if (currentUrl.indexOf("github.com") >= 0) {
        // GITHUB
        webview.partition = 'persist:github';
      } else if (currentUrl.indexOf("google.com") >= 0) {
        // GOOGLE
        webview.partition = 'persist:google';
      } else if (currentUrl.includes(".pdf")) {
        // PDF documents
        webview.partition = 'persist:pdf';
      } else if (currentUrl.includes(window.location.hostname + ":8888")) {
        // Jupyter
        webview.partition = 'persist:jupyter';
      } else if (currentUrl.includes("colab.research.google.com")) {
        // Colab
        webview.partition = 'persist:colab';
      } else {
        // Isolation for other content
        webview.partition = "partition_" + props.id;
      }

      // Callback when the webview is ready
      webview.addEventListener('dom-ready', domReadyCallback(webview))

      const titleUpdated = (event: any) => {
        setTitle(props.id, event.title);
      };
      webview.addEventListener('page-title-updated', titleUpdated);

      // After the partition has been set, you can navigate
      webview.src = currentUrl;

      // By default the webiews are muted
      setMute(props.id, true);
    }

  }, [])

  /**
   * Observes for Mute Changes
   */
  useEffect(() => {
    if (!isElectron()) return;
    if (domReady === false) return;
    const webview = webviewNode.current;
    if (webview) {
      webview.setAudioMuted(mute);
    }
  }, [mute, domReady])

  /**
   * Observes for Zoom Level Changes
   */
  useEffect(() => {
    if (!isElectron()) return;
    if (domReady === false) return;
    const webview = webviewNode.current;
    if (webview) {
      webview.zoomFactor = visualState.zoom;
      try {
        // Update zoom if state received is different
        if (webview.zoomFactor !== visualState.zoom) {
          webview.zoomFactor = visualState.zoom;
        }
      } catch (e) {
        // Main error is from not yet attached to DOM
      }
    }
  }, [visualState.zoom, domReady])

  /**
   * Observes for reload Changes
   */
  useEffect(() => {
    if (!isElectron()) return;
    if (domReady === false) return;
    const webview = webviewNode.current;
    if (webview && needReload.reload) {
      webview.reload();
    }
  }, [needReload, domReady])

  /**
   * Observes for Scroll Changes
   * This uses Dylan's fancy console messages
   */
  useEffect(() => {
    // console.log("Scroll has been changed");
    if (!isElectron()) return;
    if (domReady === false) return;
    const webview = webviewNode.current;

    // Observe page console events to avoid using Electron bridge for now.
    const consoleMessage = (event: any) => {
      try {
        const jso = JSON.parse(event.message);
        if (jso.s3i && jso.s3i === 'scrollEvent') {
          // console.log('scroll event', jso.data);

          const x = jso.data.x;
          const y = jso.data.y;
          visualDispatch({ type: 'scroll', x, y })
        } else if (jso.s3i && jso.s3i === 'debug') {
          //console.log('Webview debug message', jso.data);
        } else if (jso.s3i && jso.s3i === "click") {
          // console.log('webview clicked')
        }
      } catch (err) {
        /** squelch */
      }
    };

    if (webview) {
      const x = visualState.scrollX;
      const y = visualState.scrollY;
      // execute this section of code on the webview to set the scroll
      webview.executeJavaScript(`
      if ((window.scrollX !== ${x})|| (window.scrollY !== ${y})) {
        window.scrollTo(${x}, ${y});
      }`);
      webview.addEventListener('console-message', consoleMessage);
    }
    return () => {
      if (webview) {
        webview.removeEventListener('console-message', consoleMessage);
      }
    }
  }, [visualState.scrollX, visualState.scrollY, domReady])

  /**
   * Observes for Page Changes
   */
  useEffect(() => {
    if (!isElectron()) return;
    if (domReady === false) return;
    const webview = webviewNode.current;
    const currentUrl = addressState.history[addressState.historyIdx];

    if (webview) {
      injectScrollCodeIntoWebview(webview);
      if (webview.getURL() !== currentUrl) {
        try {
          webview.loadURL(currentUrl);
        } catch (e) {
          console.log(e)
        }
      }
    }

    /**
     * If a user changes the page by clicking/interacting a link on the webpage
     */
    const didNavigateInPage = (evt: any) => {
      // console.log('did-navigate-in-page', props.id, evt.url);
      addressDispatch({ type: "navigate", url: evt.url })
    };

    webview.addEventListener('did-navigate-in-page', didNavigateInPage);

    return () => {
      if (webview) {
        webview.removeEventListener('did-navigate-in-page', didNavigateInPage);
      }
    }

  }, [addressState.history, addressState.historyIdx, domReady])

  // Open a url in a new webview, should result from event new-window within webview component
  // Added here since there is access to more relevant information
  useEffect(() => {
    if (!isElectron()) return;
    if (domReady === false) return;
    const webview = webviewNode.current;
    const openUrlInNewWebviewApp = (url: string): void => {
      // Padding is for a small gap between the new window
      const padding = 15;
      act({
        type: 'create',
        appName: 'webview',
        id: '',
        position: {
          x: props.position.x + props.position.width + padding,
          y: props.position.y,
          width: props.position.width,
          height: props.position.height,
        },
        optionalData: {
          address: {
            history: [processContentURL(url)],
            historyIdx: 0,
          },
          visual: {
            zoom: 1.0, scrollX: 0, scrollY: 0,
          }
        },
      });
    };

    // When the webview tries to open a new window
    const newWindow = (event: any) => {
      // console.log('new-window', event);
      if (event.url.includes(window.location.hostname + ':8888')) {
        // Allow jupyter to stay within the same window
        addressDispatch({ type: "navigate", url: event.url })
      }
      // Open a new window
      else if (event.url !== "about:blank") {
        openUrlInNewWebviewApp(event.url);
      }
    };

    // Check if destination is a PDF document and open another webview if so
    const willNavigate = (event: any) => {
      // console.log('will-navigate', event);
      if (event.url && event.url.includes('.pdf')) {
        // Dont try to download a PDF
        event.preventDefault();
        webview.stop();
        openUrlInNewWebviewApp(event.url + '#toolbar=1&view=Fit');
      } else {
        addressDispatch({ type: "navigate", url: event.url });
      }
    };

    // Webview opened a new window
    webview.addEventListener('new-window', newWindow);
    // Check the url before navigating
    webview.addEventListener('will-navigate', willNavigate);

    return () => {
      if (webview) {
        webview.removeEventListener("new-window", newWindow);
        webview.removeEventListener("will-navigate", willNavigate);
      }
    }
  }, [props.position, domReady])

  const nodeStyle: CSSProperties = {
    width: props.position.width + 'px',
    height: props.position.height + 'px',
    objectFit: 'contain',
  };

  return (
    (isElectron()) ?
      <webview ref={setWebviewRef} style={nodeStyle} allowpopups={'true' as any}></webview>
      :
      <div style={{ width: props.position.width + 'px', height: props.position.height + 'px' }}>
        <Center w="100%" h="100%" bg="gray.700" >
          <Box p={4} >
            <Center>
              <Box as="span" color="white" fontSize="5xl" fontWeight="bold" p="2rem">
                Webviews are only supported with the SAGE3 Desktop Application.
              </Box>
            </Center>
            <br />
            <Center>
              <Box as="span" fontSize="6xl" fontWeight="bold" p="2rem">
                <a href="https://uofi.box.com/v/sage3-client-win" rel="noreferrer" target="_blank" style={{ color: "#13a89e" }}>Windows</a>
                &nbsp; <span style={{ color: "white" }}>|</span> &nbsp;
                <a href="https://uofi.box.com/v/sage3-client-mac" rel="noreferrer" target="_blank" style={{ color: "#13a89e" }}>Mac</a>
                &nbsp; <span style={{ color: "white" }}>|</span> &nbsp;
                <a href="https://uofi.box.com/v/sage3-client-linux" rel="noreferrer" target="_blank" style={{ color: "#13a89e" }}>Ubuntu 20.04</a>
              </Box>
            </Center>
            <br />
            <Center>
              <Box as="span" color="white" fontSize="5xl" fontWeight="bold" p="2rem">
                Current URL <a style={{ color: "#13a89e" }} href={addressState.history[addressState.historyIdx]} rel="noreferrer" target="_blank">
                  {addressState.history[addressState.historyIdx]} </a>
              </Box>
            </Center>
          </Box>
        </Center>
      </div>
  );
};

export default AppsWebview;

export function injectScrollCodeIntoWebview(webview: WebviewTag): void {

  webview.executeJavaScript(`
  document.addEventListener("scroll", () => {
    let waitTime = 100;
    if (window.s3i_scrollEventTimeout) {
      clearTimeout(window.s3i_scrollEventTimeout);
    }
    window.s3i_scrollEventTimeout = setTimeout(function() {
      console.log(JSON.stringify({
        s3i: "scrollEvent",
        data: {
          x: window.scrollX,
          y: window.scrollY,
        },
      }));
    }, waitTime);
  });
  document.addEventListener("click", () => {
    console.log(JSON.stringify({
      s3i: "click",
    }));
  });
  `);
}
