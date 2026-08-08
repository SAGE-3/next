/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Chakra and React imports
import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, ButtonGroup, Text, useToast, ToastId } from '@chakra-ui/react';

// SAGE imports
import { useAppStore, useUser, useScreenshareStore, useHexColor, useUIStore, apiUrls } from '@sage3/frontend';

// App
import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { MdScreenShare } from 'react-icons/md';

/* App component for Screenshare
 *
 * The capture is started by the ScreenshareMenu (the only place a screenshare
 * can be created): it captures the screen, creates this app, and hands the
 * stream to the screenshare store keyed by this app's id. The published track
 * is also named after the app id, so viewers match tracks without any state
 * round-trip. The session holding the capture is the owner; a reloaded page
 * cannot resume a share, and the server deletes the app when its track is gone.
 */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // Current User
  const { user } = useUser();

  // Screenshare Store (LiveKit)
  const tracks = useScreenshareStore((state) => state.tracks);
  const localStreams = useScreenshareStore((state) => state.localStreams);
  const connectionState = useScreenshareStore((state) => state.connectionState);
  const shareTimeLimit = useScreenshareStore((state) => state.shareTimeLimit);

  // This session owns the share if it holds the capture for this app
  const localStream = localStreams[props._id];
  const yours = Boolean(localStream);

  // App Store
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);

  // Video and HTML Ref
  const videoRef = useRef<HTMLVideoElement>(null);

  // UI
  const red = useHexColor('red');
  const fitAppsById = useUIStore((state) => state.fitAppsById);
  const boardLocked = useUIStore((state) => state.boardLocked);

  // State of the current time
  const [serverTimeDifference, setServerTimeDifference] = useState(0);
  const [expirationTime, setExpirationTime] = useState<string>('Checking Time...');

  // Toasts
  const toast = useToast();
  const toastIdRef = useRef<ToastId>();

  // Close the toast
  function closeToast() {
    if (toastIdRef.current) {
      toast.close(toastIdRef.current);
    }
  }

  // Resize the app to match the dimensions of the shared screen
  const fitToDimensions = (width: number, height: number) => {
    const aspect = width / height;
    let w = props.data.size.width;
    let h = props.data.size.height;
    aspect > 1 ? (h = w / aspect) : (w = h / aspect);
    updateState(props._id, { aspectRatio: aspect });
    update(props._id, { size: { width: w, height: h, depth: props.data.size.depth } });
  };

  // Publisher: show the local capture as preview
  useEffect(() => {
    if (yours && localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
      videoRef.current.play();
      update(props._id, { title: `${user?.data.name}` });
    }
  }, [yours, localStream]);

  // Publisher: stop the capture when the app is deleted
  useEffect(() => {
    return () => {
      const store = useScreenshareStore.getState();
      if (store.localStreams[props._id]) {
        store.stopShare(props._id);
        toast({
          title: 'Your screenshare has ended',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    };
  }, []);

  // Publisher: if the user resizes the shared window, resize the app.
  // The preview video element fires 'resize' when the source dimensions change.
  useEffect(() => {
    const video = videoRef.current;
    if (!yours || !video) return;
    const updateDimensions = () => {
      if (video.videoWidth && video.videoHeight) {
        fitToDimensions(video.videoWidth, video.videoHeight);
      }
    };
    video.addEventListener('resize', updateDimensions);
    return () => {
      video.removeEventListener('resize', updateDimensions);
    };
  }, [yours, props.data.size.width, props.data.size.height]);

  // Viewer: attach the remote track named after this app
  useEffect(() => {
    if (yours) return;
    const named = tracks.find((t) => t.name === props._id);
    if (named && videoRef.current) {
      named.track.attach(videoRef.current);
      // Close other toasts by this app
      closeToast();
      // Show a notification
      toastIdRef.current = toast({
        title: `${props.data.title} started a screenshare`,
        description: (
          <Box>
            <Button size="md" colorScheme="orange" my="1" variant="solid" width="100%" onClick={goToScreenshare}>
              Focus on their screen?
            </Button>
          </Box>
        ),
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [tracks]);

  const goToScreenshare = useCallback(() => {
    if (!boardLocked) {
      // Close the popups
      closeToast();
      // Zoom in
      fitAppsById([props._id]);
    }
  }, [props, boardLocked]);

  // Get server time
  useEffect(() => {
    async function getServerTime() {
      const response = await fetch(apiUrls.misc.getTime);
      const time = await response.json();
      setServerTimeDifference(Date.now() - time.epoch);
    }
    getServerTime();
    return () => closeToast();
  }, []);

  // Update the remaining time label periodically
  useEffect(() => {
    const updateExpirationTime = () => {
      const now = Date.now() + serverTimeDifference;
      const timeLeft = shareTimeLimit - (now - props._createdAt);
      const minutes = Math.floor(timeLeft / 1000 / 60);
      setExpirationTime(minutes + 'm');
    };
    updateExpirationTime();
    const interval = setInterval(updateExpirationTime, 30000);
    return () => clearInterval(interval);
  }, [serverTimeDifference, shareTimeLimit]);

  return (
    <AppWindow app={props} lockAspectRatio={s.aspectRatio} hideBackgroundIcon={MdScreenShare}>
      <>
        <Box backgroundColor="black" width="100%" height="100%">
          <video ref={videoRef} muted autoPlay playsInline className="video-container" width="100%" height="100%"></video>
        </Box>

        <Text position="absolute" left={0} bottom={0} m={1} size="sm" fontWeight={'bold'} color={red}>
          {expirationTime}
        </Text>

        {connectionState === 'reconnecting' && (
          <Text position="absolute" left={0} top={0} m={1} size="sm" fontWeight={'bold'} color={red}>
            Reconnecting...
          </Text>
        )}
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app Screenshare */

function ToolbarComponent(props: App): JSX.Element {
  // Current User
  const { user } = useUser();
  const yours = user?._id === props._createdBy;

  // App Store
  const deleteApp = useAppStore((state) => state.delete);

  return (
    <ButtonGroup>
      {yours ? (
        <Button onClick={() => deleteApp(props._id)} colorScheme="red" size="xs">
          Stop Stream
        </Button>
      ) : null}
    </ButtonGroup>
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
