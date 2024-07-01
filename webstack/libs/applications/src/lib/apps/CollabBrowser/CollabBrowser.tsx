/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ButtonGroup, Button, DarkMode, useColorMode, Tooltip, CircularProgress, Spinner } from '@chakra-ui/react';
import { App, AppGroup } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
// Styling
import './styling.css';
import { Component, useEffect, useRef, useState } from 'react';
import { userInfo } from 'os';
import { useAppStore, useUser, useUIStore } from '@sage3/frontend';
import { VncScreen, RFB } from '@sage3/frontend';
import { FaFirefoxBrowser } from 'react-icons/fa';
import { TbMouse, TbMouseOff } from "react-icons/tb";


const fetchWS = async (vmId: string="allocate", theme: number=0, callback?: (jsonData: any) => void) => {
  try {
    const response = await fetch(`/vm/any/${vmId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        vm: "vnc-x11-firefox",
        env: {
          FIREFOX_THEME: theme
        },
      }),
    });
    if (!response.ok) {
      throw new Error('Request failed');
    }
    const jsonData = await response.json();
    if (callback) { callback(jsonData); }
  } catch (error) {
    console.log(error);
  }
};

const fetchWSIfExists = async (vmId: string="allocate", callback?: (jsonData: any) => void) => {
  try {
    const response = await fetch(`/vm/ws/${vmId}`);
    if (!response.ok) {
      throw new Error('Request failed');
    }
    const jsonData = await response.json();
    if (callback) { callback(jsonData); }
  } catch (error) {
    console.log(error);
  }
};

/* App component for CollabBrowser */

function AppComponent(props: App): JSX.Element {
  const { toggleColorMode, colorMode } = useColorMode();
  const theme = colorMode === 'light' ? 1 : 0
  
  const s = props.data.state as AppState;
  const [ wsUrl, setWsUrl ] = useState<string | undefined>(undefined);
  const [ viewOnly, setViewOnly ] = useState<boolean>(true);
  const [ connected, setVncConnected ] = useState<boolean>(false);

  const { user } = useUser();
  const updateState = useAppStore((state) => state.updateState);
  const vncScreenRef = useRef<React.ElementRef<typeof VncScreen>>(null);
  const audioRef = useRef(null);

  const selectedId = useUIStore((state) => state.selectedAppId);
  const isSelected = props._id == selectedId;

  // If you want to start when user joins room or when user selects app
  const startVmOnLoad = false;
  const appIsMountingRef = useRef(true);

  // keyboard grabbing on refresh on vnc load & on app selection
  useEffect(() => {
    if (isSelected) {
      vncScreenRef.current?.focus()
      vncScreenRef.current?.rfb?._keyboard.grab();
    }
    else {
      vncScreenRef.current?.rfb?._keyboard.ungrab();
      vncScreenRef.current?.blur()
    }
  }, [isSelected, connected, s.nonOwnerViewOnly]);


  useEffect(() => {
    // Save Screenshot on deselect, set to timer instead maybe more ideal...
    if (!isSelected) {
      if (vncScreenRef.current?.rfb) {
        const dataUrl = vncScreenRef.current?.rfb?._canvas.toDataURL()
        updateState(props._id, { lastImage: dataUrl })
      }
    }
    // Start Container on user selecting app; this is the alternative to autostarting the container
    if (isSelected && s.vmId && !vncScreenRef.current) {
      fetchWS(s.vmId, theme, (jsonData) => {
        if ("url" in jsonData) { setWsUrl(jsonData["url"]); updateState(props._id, { refreshSeed: Math.random() }) }
      })  
    }
  }, [isSelected]);

  // Get Websocket URL if vmId exists
  useEffect(() => {
    if (s.vmId) {
      // Send request to start container or recieve websocket if running
      if ((startVmOnLoad && appIsMountingRef.current) || (!appIsMountingRef.current)) {
        fetchWS(s.vmId, theme, (jsonData) => {
          if ("url" in jsonData) { setWsUrl(jsonData["url"]); }
        })  
      }
      // Send request to check if container is running or not, do not issue start command on first load
      else if (appIsMountingRef.current) {
        fetchWSIfExists(s.vmId, (jsonData) => {
          if ("url" in jsonData) { setWsUrl(jsonData["url"]); }
        })
      }
    }
  }, [s.vmId, s.refreshSeed]);

  // Setting View Only Hook
  useEffect(() => {
    if (props._createdBy === user?._id) {
      setViewOnly(false)
    }
    else {
      setViewOnly(s.nonOwnerViewOnly)
    }
    
  }, [s.nonOwnerViewOnly]);


  // Owner Only
  // First instantiation; auto allocated if check if browser is not instanced
  useEffect(() => {
    appIsMountingRef.current = false;
    if (s.vmId == undefined && props._createdBy === user?._id) {
      console.log("EFFECT TRIGGERED")
      fetchWS("allocate", theme, (jsonData) => {
        if ("url" in jsonData && "uid" in jsonData) 
          { 
            updateState(props._id, { vmId: jsonData["uid"] })
          }
      });
    }
  }, []);

  // // Paste Interception
  // useEffect(() => {
  //   const handlePaste = (event: ClipboardEvent) => {
  //     if (isSelected && wsUrl && connected) {
  //       event.preventDefault(); // Prevent the default paste behavior
  //       const pastedData = event.clipboardData?.getData('text/plain');
  //       if (pastedData) {
  //         vncScreenRef.current?.clipboardPaste(pastedData);
  //       }
  //     }
  //   };

  //   // Attach the event listener to the document
  //   document.addEventListener('paste', handlePaste);

  //   // Clean up the event listener on component unmount
  //   return () => {
  //     document.removeEventListener('paste', handlePaste);
  //   };
  // }, []);

  // Paste Interception
  // Hacky way to get paste to work, but user must be aware the mouse must hover the app
  // It should be feasible to create a fullscreen (absolute, w:100%, h:100%, index: 99) div to capture the mouse
  const handleMouseEnter = async() => {
    try {
      const clipboardData = await navigator.clipboard.readText();
      if (clipboardData) {
        vncScreenRef.current?.clipboardPaste(clipboardData);
      }
    } catch (error) {
      // console.error('Failed to read clipboard:', error);
    }
  };


  return (
    <AppWindow app={props} hideBackgroundColor={"orange"} hideBordercolor={"orange"} hideBackgroundIcon={FaFirefoxBrowser}>
      <>
        {!wsUrl && (
         s.lastImage ? (
          <img src={s.lastImage} alt="Displayed Image"/>
         ) : (
          s.vmId ? <div>Select App to Start</div> : 
          <div>
            {/* <CircularProgress isIndeterminate color='orange'/> */}
            <Spinner
              thickness='4px'
              speed='1.5s'
              emptyColor='gray.200'
              color='orange'
              size='xl'
            />
          </div>
         )
        )}
        {wsUrl && (
        <div
          style={{
            width: '100%',
            height: '100%',
          }}
          onMouseEnter={handleMouseEnter}
          // onMouseLeave={handleMouseLeave}
        >
          <VncScreen
            url={wsUrl + "/vnc"}
            viewOnly={viewOnly}
            focusOnClick={false}
            // scaleViewport
            resizeSession
            qualityLevel={6} //8
            compressionLevel={4} //2

            // Dynamically Scaling Quality Level?
            // qualityLevel={Math.min(Math.max(Math.round((1-((props.data.size.width + 400)/5000)) * 9), 0), 9)}
            // compressionLevel={Math.min(Math.max(Math.round(((props.data.size.width + 400)/5000) * 9), 0), 9)}

            autoConnect={true}
            retryDuration={100}
            debug={true}
            background="#000000"
            style={{
              width: '100%',
              height: '100%',
            }}
            ref={vncScreenRef}
            screenSizeWidth={props.data.size.width}
            screenSizeHeight={props.data.size.height}
            // selected={isSelected}
            // loadingUI={(<>LOADING</>)}
            onConnect={(rfb: RFB) => {
              console.log(rfb);
              setVncConnected(true);
            }}
            onDisconnect={(rfb: RFB) => {console.log(rfb)}}
            onDesktopName={(e:any) => {console.log(e)}}
            onCapabilities={(e:any) => {console.log(e)}}
            onClipboard={async(e:any) => {
              try {
                // console.log(e.detail.selected)
                // if (e.selected) {
                await navigator.clipboard.writeText(e.detail.text);
                console.log('Text copied to clipboard:', e.detail.text);
                // }
              } catch (error) {
                // console.error('Failed to copy text to clipboard:', error);
              }
              // console.log(e)
            }}
          />
        </div>)}
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app CollabBrowser */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const { user } = useUser();

  return (
    <>
      {/* {s.vmId} */}
      {props._createdBy === user?._id && (
      <>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mr="1">
      <Tooltip label={s.nonOwnerViewOnly ? "Click to Allow Shared Controls" : "Click to Stop Sharing Controls"} openDelay={400} hasArrow placement="top">
          <Button colorScheme={s.nonOwnerViewOnly ? "red" : "green" } onClick={
            () => {
              updateState(props._id, { nonOwnerViewOnly: !s.nonOwnerViewOnly }) 
            }
          }>{s.nonOwnerViewOnly ? <TbMouseOff/> : <TbMouse/>}</Button>
        </Tooltip>
      </ButtonGroup>


      </>
    )}
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
