/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorMode, Spinner, Box, Image, Text, VStack, Icon } from '@chakra-ui/react';
import { FaFirefoxBrowser } from 'react-icons/fa';
import { App } from '../../schema';

import { useEffect, useRef, useState, memo } from 'react';
import { useAppStore, useUser } from '@sage3/frontend';

import { VncScreen, RFB } from '../../components/VNC/react-vnc';
import { ContainerAPI as VmsAPI } from '../../components/VNC/API';
import { AudioVncService } from '../../components/VNC/AudioVncService';

export interface NoVncProps {
  veoUrl: string;
  container: string;
  envs: {};
  props: App;
  sAudio: boolean;
  sNonOwnerViewOnly: boolean;
  sLastImage: string | undefined;
  sClipboard: string;
  sInit: boolean;
  sRefreshSeed: number;
  isSelected: boolean;
}

const VNCAudioWrapperComponent = ({
  veoUrl,
  container,
  envs,
  props,
  sAudio,
  sNonOwnerViewOnly,
  sLastImage,
  sClipboard,
  sInit,
  sRefreshSeed,
  isSelected,
}: NoVncProps): JSX.Element => {
  const { colorMode } = useColorMode();
  const theme = colorMode === 'light' ? 1 : 0;

  const [wsUrl, setWsUrl] = useState<string | undefined>(undefined);
  const [viewOnly, setViewOnly] = useState<boolean>(true);
  const [connected, setVncConnected] = useState<boolean>(false);
  const [rejoinSpinner, setRejoinSpinner] = useState<boolean>(false);
  const [audioAutoPlay, setAudioAutoPlay] = useState<boolean>(false);

  const { user } = useUser();
  const updateState = useAppStore((state) => state.updateState);
  const vncScreenRef = useRef<React.ElementRef<typeof VncScreen>>(null);

  // Defer autostart until first load completes — avoids double-init
  const startVmOnLoad = false;
  const appIsMountingRef = useRef(true);
  const vmId = props._id;

  // Gate audio autoplay on a user gesture (browser autoplay policy)
  useEffect(() => {
    if (audioAutoPlay) return;

    const handleUserGesture = () => setAudioAutoPlay(true);
    const events = ['click', 'keydown', 'touchstart', 'mousedown'];
    events.forEach((event) => window.addEventListener(event, handleUserGesture, { once: true }));

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleUserGesture));
    };
  }, [audioAutoPlay]);

  // Grab/release keyboard focus when app selection changes
  useEffect(() => {
    if (isSelected) {
      vncScreenRef.current?.focus();
      vncScreenRef.current?.rfb?._keyboard.grab();
    } else {
      vncScreenRef.current?.rfb?._keyboard.ungrab();
      vncScreenRef.current?.blur();
    }
  }, [isSelected, connected, sNonOwnerViewOnly]);

  // Reconnect to VNC when app is selected but VncScreen has unmounted
  useEffect(() => {
    if (isSelected && vmId && !vncScreenRef.current) {
      setRejoinSpinner(true);
      VmsAPI.init(veoUrl, vmId, container, envs).then((jsonData) => {
        if ('url' in jsonData) {
          setWsUrl(jsonData['url']);
          setRejoinSpinner(false);
          updateState(props._id, {
            refreshSeed: Math.random(),
            lastImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
          });
        }
      });
    }
  }, [isSelected]);

  // Fetch WebSocket URL whenever refreshSeed changes (triggered by owner actions)
  useEffect(() => {
    if (sInit) {
      if ((startVmOnLoad && appIsMountingRef.current) || !appIsMountingRef.current) {
        // Start container or retrieve WS URL if already running
        VmsAPI.init(veoUrl, vmId, container, envs).then((jsonData) => {
          if ('url' in jsonData) {
            setWsUrl(jsonData['url']);
          }
        });
      } else if (appIsMountingRef.current) {
        // On first mount: only check if container is already running — don't auto-start
        VmsAPI.check(veoUrl, vmId).then((jsonData) => {
          if ('url' in jsonData) {
            setWsUrl(jsonData['url']);
          }
        });
      }
    }
  }, [sRefreshSeed]);

  // Sync view-only state: owner always has control; non-owners follow the shared flag
  useEffect(() => {
    if (props._createdBy === user?._id) {
      setViewOnly(false);
    } else {
      setViewOnly(sNonOwnerViewOnly);
    }
  }, [sNonOwnerViewOnly]);

  // Owner only: start VEO container on first open and mark init in shared state
  useEffect(() => {
    appIsMountingRef.current = false;
    if (!sInit && props._createdBy === user?._id) {
      VmsAPI.init(veoUrl, vmId, 'firefox-audio', { FIREFOX_THEME: theme }).then((_jsonData) => {
        updateState(props._id, {
          refreshSeed: Math.random(),
          init: true,
          lastImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
        });
      });
    }
  }, []);

  // Forward toolbar clipboard paste into the VNC session
  useEffect(() => {
    if (sClipboard) {
      vncScreenRef.current?.clipboardPaste(sClipboard);
    }
  }, [sClipboard]);

  return (
    <>
      {!wsUrl &&
        (sLastImage ? (
          <Box position="relative" width="100%" height="100%">
            {rejoinSpinner ? (
              <>
                <Image style={{ filter: 'blur(4px)', width: '100%', height: '100%' }} src={sLastImage} alt="Displayed Image" />
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
              <>
                <Image src={sLastImage} style={{ width: '100%', height: '100%' }} alt="Displayed Image" />
                <Box
                  position="absolute"
                  top="0"
                  left="0"
                  width="100%"
                  height="100%"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bg="blackAlpha.500"
                >
                  <VStack spacing={3}>
                    <Icon as={FaFirefoxBrowser} boxSize={24} color="orange.300" />
                    <Text fontSize="2xl" fontWeight="bold" color="white" alignItems="center" gap={1}>
                       Click on this app to start Firefox
                    </Text>
                  </VStack>
                </Box>
              </>
            )}
          </Box>
        ) : (
          <Box h="100%" display="flex" alignItems="center" justifyContent="center">
            <Spinner thickness="4px" speed="1.5s" emptyColor="gray.200" color="orange" size="xl" />
          </Box>
        ))}
      {wsUrl && (
        <div style={{ width: '100%', height: '100%' }}>
          <VncScreen
            url={`${veoUrl}${wsUrl}/vnc`}
            viewOnly={viewOnly}
            focusOnClick={false}
            resizeSession
            qualityLevel={2}
            compressionLevel={8}
            autoConnect={true}
            retryDuration={100}
            debug={false}
            background="#000000"
            style={{ width: '100%', height: '100%' }}
            ref={vncScreenRef}
            screenSizeWidth={props.data.size.width}
            screenSizeHeight={props.data.size.height}
            onConnect={(_rfb: RFB) => {
              setVncConnected(true);
            }}
            onDisconnect={(_rfb: RFB) => {}}
            onDesktopName={(_e: any) => {}}
            onCapabilities={(_e: any) => {}}
            onClipboard={async (e: any) => {
              try {
                await navigator.clipboard.writeText(e.detail.text);
              } catch {
                // Clipboard write can fail if permission is denied — silently ignore
              }
            }}
          />
          {audioAutoPlay && sAudio && (
            <AudioVncService
              // Remount on selection change to fix audio desync
              key={`audio-${props._id}-${isSelected ? 'selected' : 'deselected'}`}
              wsUrl={`${veoUrl}${wsUrl}/audio`}
              enabled={true}
            />
          )}
        </div>
      )}
    </>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const VNCAudioWrapper = memo(VNCAudioWrapperComponent, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render), false if different (re-render)
  return (
    prevProps.veoUrl === nextProps.veoUrl &&
    prevProps.container === nextProps.container &&
    prevProps.sAudio === nextProps.sAudio &&
    prevProps.sNonOwnerViewOnly === nextProps.sNonOwnerViewOnly &&
    prevProps.sLastImage === nextProps.sLastImage &&
    prevProps.sClipboard === nextProps.sClipboard &&
    prevProps.sInit === nextProps.sInit &&
    prevProps.sRefreshSeed === nextProps.sRefreshSeed &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.props._id === nextProps.props._id &&
    prevProps.props._createdBy === nextProps.props._createdBy &&
    prevProps.props.data.size.width === nextProps.props.data.size.width &&
    prevProps.props.data.size.height === nextProps.props.data.size.height &&
    JSON.stringify(prevProps.envs) === JSON.stringify(nextProps.envs)
  );
});
