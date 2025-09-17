/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  ButtonGroup,
  Button,
  DarkMode,
  useColorMode,
  Tooltip,
  CircularProgress,
  Spinner,
  Box,
  Input,
  useColorModeValue,
  Text,
  ListItem,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  UnorderedList,
  useDisclosure,
  Link,
  Image,
} from '@chakra-ui/react';
import { App, AppGroup } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
// Styling
import './styling.css';
import { Component, useEffect, useRef, useState } from 'react';
import { userInfo } from 'os';
import { useAppStore, useUser, useUIStore } from '@sage3/frontend';
import { VncScreen, RFB } from '@sage3/frontend';
import { FaFirefoxBrowser, FaClipboard } from 'react-icons/fa';
import { MdVolumeOff, MdVolumeUp } from 'react-icons/md'; // MdVolumeUp
import { TbMouse, TbMouseOff } from 'react-icons/tb';
import { PiTabs } from 'react-icons/pi';

import { VmsAPI } from '@sage3/frontend';
import { AudioVncService } from './AudioVNCService';

// const fetchWS = async (vmId: string = 'allocate', theme: number = 0, urls: string[], id: string): Promise<any> => {
//   const getUrl = () => {
//     const protocol = window.location.protocol;
//     const hostname = window.location.hostname;
//     const port = window.location.port;

//     // let fullUrl = `${protocol}//${hostname}`;
//     let fullUrl = `${protocol}//host.docker.internal`;

//     if (port) {
//       fullUrl += `:${port}`;
//     }

//     return fullUrl;
//   };

//   return fetch(`/vm/any/${vmId}`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       vm: 'sage3-firefox',
//       env: {
//         FIREFOX_URLS: urls,
//         FIREFOX_THEME: theme,
//         // CALLBACK_URL_BASE: `${getUrl()}`,
//         CALLBACK_ID: `${id}`,
//       },
//     }),
//   })
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error('Request failed');
//       }
//       return response.json();
//     })
//     .catch((error) => {
//       console.log(error);
//       throw error;
//     });
// };

// const fetchWSIfExists = (vmId: string = 'allocate'): Promise<any> => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       const response = await fetch(`/vm/ws/${vmId}`);
//       if (!response.ok) {
//         throw new Error('Request failed');
//       }
//       const jsonData = await response.json();
//       resolve(jsonData);
//     } catch (error) {
//       console.log(error);
//       reject(error);
//     }
//   });
// };

/* App component for CollabBrowser */

function AppComponent(props: App): JSX.Element {
  const { colorMode } = useColorMode();
  const theme = colorMode === 'light' ? 1 : 0;

  const s = props.data.state as AppState;
  const [wsUrl, setWsUrl] = useState<string | undefined>(undefined);
  const [viewOnly, setViewOnly] = useState<boolean>(true);
  const [connected, setVncConnected] = useState<boolean>(false);
  const [rejoinSpinner, setRejoinSpinner] = useState<boolean>(false);
  const [audioAutoPlay, setAudioAutoPlay] = useState<boolean>(false);

  const { user } = useUser();
  const updateState = useAppStore((state) => state.updateState);
  const vncScreenRef = useRef<React.ElementRef<typeof VncScreen>>(null);
  const audioRef = useRef(null);

  const selectedId = useUIStore((state) => state.selectedAppId);
  const isSelected = props._id == selectedId;

  // If you want to start when user joins room or when user selects app
  const startVmOnLoad = false;
  const appIsMountingRef = useRef(true);
  const vmId = props._id;

  const updateScreenshot = (delay: number = 0) => {
    setTimeout(() => {
      if (vncScreenRef.current?.rfb) {
        const dataUrl = vncScreenRef.current?.rfb?._canvas.toDataURL();
        updateState(props._id, { lastImage: dataUrl });
      }
    }, delay);
  };

  // Audio Autoplay Service
  useEffect(() => {
    if (audioAutoPlay) return; // Already received gesture, no need to listen

    const handleUserGesture = () => {
      setAudioAutoPlay(true);
    };

    // Listen for various user interaction events
    const events = ['click', 'keydown', 'touchstart', 'mousedown'];
    events.forEach((event) => {
      window.addEventListener(event, handleUserGesture, { once: true });
    });

    // Cleanup listeners if component unmounts before gesture
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserGesture);
      });
    };
  }, [audioAutoPlay]);

  // keyboard grabbing on refresh on vnc load & on app selection
  useEffect(() => {
    if (isSelected) {
      vncScreenRef.current?.focus();
      vncScreenRef.current?.rfb?._keyboard.grab();
    } else {
      vncScreenRef.current?.rfb?._keyboard.ungrab();
      vncScreenRef.current?.blur();
    }
  }, [isSelected, connected, s.nonOwnerViewOnly]);

  useEffect(() => {
    // Save Screenshot on deselect, set to timer instead maybe more ideal...
    // Save screenshot can be used for AI context
    if (!isSelected) {
      updateScreenshot();
    }
    // Start Container on user selecting app; this is the alternative to autostarting the container
    if (isSelected && vmId && !vncScreenRef.current) {
      setRejoinSpinner(true);
      VmsAPI.initalize(vmId, 'sage3-firefox', { FIREFOX_URLS: s.urls, FIREFOX_THEME: theme, CALLBACK_ID: `${props._id}` }).then(
        (jsonData) => {
          if ('url' in jsonData) {
            setWsUrl(jsonData['url']);
            setRejoinSpinner(false);
            updateState(props._id, { refreshSeed: Math.random() });
          }
        },
      );
    }
  }, [isSelected]);

  // Get Websocket URL if vmId exists
  useEffect(() => {
    if (s.init) {
      // Send request to start container or recieve websocket if running
      if ((startVmOnLoad && appIsMountingRef.current) || !appIsMountingRef.current) {
        VmsAPI.initalize(vmId, 'sage3-firefox', { FIREFOX_URLS: s.urls, FIREFOX_THEME: theme, CALLBACK_ID: `${props._id}` }).then(
          (jsonData) => {
            if ('url' in jsonData) {
              setWsUrl(jsonData['url']);
            }
          },
        );
      }
      // Send request to check if container is running or not, do not issue start command on first load
      else if (appIsMountingRef.current) {
        VmsAPI.getVmIfExists(vmId).then((jsonData) => {
          if ('url' in jsonData) {
            setWsUrl(jsonData['url']);
          }
        });
      }
    }
  }, [s.refreshSeed]);

  // Setting View Only Hook
  useEffect(() => {
    if (props._createdBy === user?._id) {
      setViewOnly(false);
    } else {
      setViewOnly(s.nonOwnerViewOnly);
    }
  }, [s.nonOwnerViewOnly]);

  // Owner Only
  // First instantiation; auto allocated if check if browser is not instanced
  useEffect(() => {
    appIsMountingRef.current = false;
    if (!s.init && props._createdBy === user?._id) {
      VmsAPI.initalize(vmId, 'sage3-firefox', { FIREFOX_URLS: s.urls, FIREFOX_THEME: theme, CALLBACK_ID: `${props._id}` }).then(
        (jsonData) => {
          updateState(props._id, { refreshSeed: Math.random(), init: true, urls: ['about:page'] });
        },
      );
    }
  }, []);

  // Paste Interception
  // Hacky way to get paste to work, but user must be aware the mouse must hover the app
  // It should be feasible to create a fullscreen (absolute, w:100%, h:100%, index: 99) div to capture the mouse
  // const handleMouseEnter = async () => {
  //   try {
  //     const clipboardData = await navigator.clipboard.readText();
  //     if (clipboardData) {
  //       vncScreenRef.current?.clipboardPaste(clipboardData);
  //     }
  //   } catch (error) {
  //     // console.error('Failed to read clipboard:', error);
  //   }gi
  // };
  // Less privacy invasive solution to paste grabbing
  useEffect(() => {
    if (s.clipboard) {
      vncScreenRef.current?.clipboardPaste(s.clipboard);
    }
  }, [s.clipboard]);

  return (
    <AppWindow app={props} hideBackgroundColor={'orange'} hideBordercolor={'orange'} hideBackgroundIcon={FaFirefoxBrowser}>
      <>
        {!wsUrl &&
          (s.lastImage ? (
            <Box position="relative" width="100%" height="100%">
              {rejoinSpinner ? (
                <>
                  <Image style={{ filter: 'blur(4px)', width: '100%', height: '100%' }} src={s.lastImage} alt="Displayed Image" />

                  <Box
                    position="absolute"
                    top="0"
                    left="0"
                    width="100%"
                    height="100%"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Spinner thickness="4px" speed="1.5s" emptyColor="gray.200" color="orange" size="xl" />
                  </Box>
                </>
              ) : (
                <Image src={s.lastImage} style={{ width: '100%', height: '100%' }} alt="Displayed Image" />
              )}
            </Box>
          ) : (
            // vmId ? <div>Select App to Start</div> :
            <Box
              // w="100%"
              h="100%"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {/* <CircularProgress isIndeterminate color='orange'/> */}
              <Spinner thickness="4px" speed="1.5s" emptyColor="gray.200" color="orange" size="xl" />
            </Box>
          ))}
        {wsUrl && (
          <div
            style={{
              width: '100%',
              height: '100%',
            }}
            // onMouseEnter={handleMouseEnter}
            // onMouseLeave={handleMouseLeave}
          >
            <VncScreen
              url={wsUrl + '/vnc'}
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
                // console.log(rfb);
                setVncConnected(true);
                updateScreenshot(200);
              }}
              onDisconnect={(rfb: RFB) => {
                // console.log(rfb);
              }}
              onDesktopName={(e: any) => {
                // console.log(e);
              }}
              onCapabilities={(e: any) => {
                // console.log(e);
              }}
              onClipboard={async (e: any) => {
                try {
                  // console.log(e.detail.selected)
                  // if (e.selected) {
                  await navigator.clipboard.writeText(e.detail.text);
                  // console.log('Text copied to clipboard:', e.detail.text);
                  // }
                } catch (error) {
                  // console.error('Failed to copy text to clipboard:', error);
                }
                // console.log(e)
              }}
            />
            {audioAutoPlay && s.audio && (
              <AudioVncService
                wsUrl={`${wsUrl}/audio}`}
                enabled={true}
                // onConnectionChange?: (connected: boolean) => void;
              />
            )}
          </div>
        )}
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
      {/* {vmId} */}
      {props._createdBy === user?._id && (
        <>
          {/* <ButtonGroup isAttached size="xs" colorScheme="teal" mr="1"> */}
          <Tooltip
            label={s.nonOwnerViewOnly ? 'Controls are not being shared' : 'Controls are being shared'}
            openDelay={400}
            hasArrow
            placement="top"
          >
            <Button
              size="xs"
              colorScheme={s.nonOwnerViewOnly ? 'red' : 'green'}
              onClick={() => {
                updateState(props._id, { nonOwnerViewOnly: !s.nonOwnerViewOnly });
              }}
            >
              {s.nonOwnerViewOnly ? <TbMouseOff /> : <TbMouse />}
            </Button>
          </Tooltip>
          {/* </ButtonGroup> */}
        </>
      )}
      <Popover trigger="hover">
        {() => (
          <>
            <PopoverTrigger>
              <Button size="xs" colorScheme="teal" ml="1" mr="0" p={0}>
                {/* FaLink */}
                <PiTabs />
              </Button>
            </PopoverTrigger>
            <PopoverContent fontSize={'sm'} width={'375px'}>
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverHeader>Urls</PopoverHeader>
              <PopoverBody userSelect={'text'}>
                <UnorderedList>
                  {s.urls.map((url) => (
                    <ListItem key={url} wordBreak="break-all">
                      {/* <Button wordBreak="break-all"> */}
                      <Link target="_blank" href={url} wordBreak="break-all">
                        {url}
                      </Link>
                      {/* </Button> */}
                    </ListItem>
                  ))}
                </UnorderedList>
              </PopoverBody>
            </PopoverContent>
          </>
        )}
      </Popover>
      <Tooltip label="Click to paste" openDelay={400} hasArrow placement="top">
        <Button
          size="xs"
          ml="1"
          colorScheme="teal"
          onClick={async () => {
            try {
              const clipboardData = await navigator.clipboard.readText();
              if (clipboardData) {
                updateState(props._id, { clipboard: clipboardData });
              }
            } catch (error) {
              // console.error('Failed to read clipboard:', error);
            }
          }}
        >
          <FaClipboard />
        </Button>
      </Tooltip>
      <Tooltip label="Toggle Audio" openDelay={400} hasArrow placement="top">
        <Button
          size="xs"
          ml="1"
          colorScheme="teal"
          onClick={() => {
            updateState(props._id, { audio: !s.audio });
          }}
        >
          {s.audio ? <MdVolumeUp /> : <MdVolumeOff />}
        </Button>
      </Tooltip>
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
