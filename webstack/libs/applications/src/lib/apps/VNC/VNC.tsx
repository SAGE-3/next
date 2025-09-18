/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useEffect, useRef, useState } from 'react';

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

import { useAppStore, useUIStore, useUser } from '@sage3/frontend';
import { VncScreen, RFB } from '@sage3/frontend';
import { state as AppState } from './index';
import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { FaClipboard } from 'react-icons/fa';
import { MdVolumeOff } from 'react-icons/md';
import { TbMouseOff, TbMouse } from 'react-icons/tb';
import { VscRemoteExplorer } from 'react-icons/vsc';

import { VmsAPI } from '@sage3/frontend';

function AppComponent(props: App): JSX.Element {
  const { colorMode } = useColorMode();
  const theme = colorMode === 'light' ? 1 : 0;

  const s = props.data.state as AppState;
  const [wsUrl, setWsUrl] = useState<string | undefined>(undefined);
  const [viewOnly, setViewOnly] = useState<boolean>(true);
  const [connected, setVncConnected] = useState<boolean>(false);
  const [connectionFailed, setVncConnectionFailed] = useState<boolean>(false);
  const [rejoinSpinner, setRejoinSpinner] = useState<boolean>(false);

  // Do not update app state until user hits connect
  const [cachedIP, setCachedIP] = useState<string>('');
  const [cachedPort, setCachedPort] = useState<string>('');
  const [cachedPassword, setCachedPassword] = useState<string>('');
  // const [connectErrorMsg, setConnectErrorMsg] = useState<string>('');

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
    // setTimeout(() => {
    //   if (vncScreenRef.current?.rfb) {
    //     const dataUrl = vncScreenRef.current?.rfb?._canvas.toDataURL();
    //     updateState(props._id, { lastImage: dataUrl });
    //   }
    // }, delay);
    setTimeout(() => {
      if (vncScreenRef.current?.rfb) {
        const originalCanvas = vncScreenRef.current?.rfb?._canvas;
        if (!originalCanvas) return;

        // Create a smaller canvas
        const scaledCanvas = document.createElement('canvas');
        const scaleFactor = 0.5; // Adjust this to control the resolution (e.g., 0.5 for 50% size)
        scaledCanvas.width = originalCanvas.width * scaleFactor;
        scaledCanvas.height = originalCanvas.height * scaleFactor;

        const ctx = scaledCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(originalCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        }

        // Get the base64 URL from the scaled canvas
        const dataUrl = scaledCanvas.toDataURL('image/jpeg', 0.7); // Adjust quality (0.0 - 1.0)
        updateState(props._id, { lastImage: dataUrl });
      }
    }, delay);
  };

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
    if (isSelected && vmId && !vncScreenRef.current && s.ip && s.port) {
      setRejoinSpinner(true);
      VmsAPI.initalize(vmId, 'vnc-connect', { TARGET_IP: s.ip, TARGET_PORT: s.port }).then((jsonData) => {
        if ('url' in jsonData) {
          setWsUrl(jsonData['url']);
          setRejoinSpinner(false);
          updateState(props._id, { refreshSeed: Math.random() });
        }
      });
    }
  }, [isSelected]);

  // Get Websocket URL if vmId exists
  useEffect(() => {
    if (s.ip && s.port) {
      // Send request to start container or recieve websocket if running
      if ((startVmOnLoad && appIsMountingRef.current) || !appIsMountingRef.current) {
        VmsAPI.initalize(vmId, 'vnc-connect', { TARGET_IP: s.ip, TARGET_PORT: s.port }).then((jsonData) => {
          if ('url' in jsonData) {
            setWsUrl(jsonData['url']);
            setRejoinSpinner(false);
          }
        });
      }
      // Send request to check if container is running or not, do not issue start command on first load
      else if (appIsMountingRef.current) {
        VmsAPI.getVmIfExists(vmId).then((jsonData) => {
          if ('url' in jsonData) {
            setWsUrl(jsonData['url']);
            setRejoinSpinner(false);
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

  useEffect(() => {
    if (s.clipboard) {
      vncScreenRef.current?.clipboardPaste(s.clipboard);
    }
  }, [s.clipboard]);

  return (
    <AppWindow app={props} hideBackgroundColor={'blue'} hideBordercolor={'blue'} hideBackgroundIcon={VscRemoteExplorer}>
      <>
        {/* loading connection spinner */}
        {(wsUrl && !connected) ||
          (rejoinSpinner && (
            <Box
              // w="100%"
              h="100%"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {/* <CircularProgress isIndeterminate color='orange'/> */}
              <Spinner thickness="4px" speed="1.5s" emptyColor="gray.200" color="blue" size="xl" />
            </Box>
          ))}

        {/* Its a mess! consider row of repetative if else statements or hashmap of render elements instead */}
        {!wsUrl &&
          (connectionFailed ? (
            <>Connection Failed! Select App to Reconnect</>
          ) : props._createdBy === user?._id ? (
            !s.ip && !s.port ? (
              <>
                <Input placeholder="ip" onChange={(e) => setCachedIP(e.target.value.replace(/\s+/g, ''))}></Input>
                <Input placeholder="port" onChange={(e) => setCachedPort(e.target.value.replace(/\s+/g, ''))}></Input>
                <Input placeholder="password (optional)" onChange={(e) => setCachedPassword(e.target.value)}></Input>
                <Button
                  onClick={() => {
                    if (props._createdBy === user?._id && cachedIP && cachedPort) {
                      // updateState(props._id, { ip: cachedIP, port: cachedPort });
                      setRejoinSpinner(true);
                      VmsAPI.initalize(vmId, 'vnc-connect', { TARGET_IP: cachedIP, TARGET_PORT: cachedPort }).then((jsonData) => {
                        updateState(props._id, { ip: cachedIP, port: cachedPort, password: cachedPassword, refreshSeed: Math.random() });
                      });
                    }
                  }}
                >
                  Connect
                </Button>
                <Text>Only app creator may start the connection</Text>
                <Text>Remember that the Sage3 Server must be able to access the ip:port, not the client (user)</Text>
              </>
            ) : (
              // <>Click me to reconnect</>
              <ImageWithOverlay src={s.lastImage} text="Select App to Reconnect" />
            )
          ) : !s.ip && !s.port ? (
            <>Wait for app owner to start connect</>
          ) : (
            // <>Select App to Reconnect</>
            // <Image src={s.lastImage} style={{ width: '100%', height: '100%' }} alt="Displayed Image" />
            <ImageWithOverlay src={s.lastImage} text="Select App to Reconnect" />
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
              scaleViewport={true} // NEED TO HAVE LIVE UPDATING!!!
              // scaleViewport?: boolean;
              // resizeSession?: boolean;
              // screenSizeWidth: number;
              // screenSizeHeight: number;

              rfbOptions={{
                credentials: { password: s.password ?? '' },
              }}
              onConnect={(rfb: RFB) => {
                console.log(rfb);
                setVncConnected(true);
                updateScreenshot(200);
              }}
              onDisconnect={(rfb: RFB) => {
                // console.log(rfb);
                setWsUrl('');
                setVncConnected(false);
                setVncConnectionFailed(true);
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
          </div>
        )}
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app VNC */
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
      <Tooltip label="" openDelay={400} hasArrow placement="top">
        <Input
          disabled
          size="xs"
          ml="1"
          variant="subtle"
          placeholder={`${s.ip}:${s.port}`}
          color="white"
          _placeholder={{ color: 'inherit' }}
        ></Input>
      </Tooltip>

      {/* <Text size="xs" ml="1">
        {s.ip}:{s.port}
      </Text> */}

      {/* If we want changable ip:port in the future */}
      {/* {props._createdBy === user?._id ? (
        <Input size="xs" ml="1" placeholder={`${s.ip}:${s.port}`} onChange={(e) => e.target.value}></Input>
      ) : (
        <Text size="xs" ml="1">
          {s.ip}:{s.port}
        </Text>
      )} */}

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
      <Tooltip label="Audio is currently not supported" openDelay={400} hasArrow placement="top">
        <Button size="xs" ml="1" colorScheme="gray" onClick={() => {}}>
          <MdVolumeOff />
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

interface ImageWithOverlayProps {
  src: string;
  text?: string; // Optional text for reusability
}

const ImageWithOverlay: React.FC<ImageWithOverlayProps> = ({ src, text = 'Click me to reconnect' }) => {
  return (
    <Box position="relative" width="100%" height="100%">
      {/* Image */}
      <Image src={src} alt="Displayed Image" objectFit="cover" width="100%" height="100%" />

      {/* Overlay */}
      <Box
        position="absolute"
        top="0"
        left="0"
        width="100%"
        height="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="rgba(0, 0, 0, 0.5)"
        color="white"
        fontSize="xl"
        fontWeight="bold"
        cursor="pointer"
        textAlign="center"
        _hover={{ bg: 'rgba(0, 0, 0, 0.7)' }} // Darkens on hover
      >
        <Text>{text}</Text>
      </Box>
    </Box>
  );
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
