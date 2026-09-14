/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Chakra and React imports
import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, ButtonGroup, Text, Tooltip, useToast, ToastId } from '@chakra-ui/react';

// SAGE imports
import { useAppStore, useUser, useScreenshareStore, useHexColor, useUIStore, apiUrls } from '@sage3/frontend';

// App
import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { MdScreenShare, MdSpeed } from 'react-icons/md';
import { create } from 'zustand';

// Debug overlay showing which simulcast layer a share actually sends/receives.
// Toggled per share from the toolbar; ?sharestats=1 in the URL starts it on.
// The toggle is per browser and never leaves it: nobody else's view changes.
const STATS_ON_BY_DEFAULT = typeof window !== 'undefined' && /[?&]sharestats=1/.test(window.location.href);

interface StatsStore {
  show: { [appId: string]: boolean };
  toggle: (appId: string) => void;
}
const useStatsStore = create<StatsStore>()((set) => ({
  show: {},
  toggle: (appId: string) => set((state) => ({ show: { ...state.show, [appId]: !(state.show[appId] ?? STATS_ON_BY_DEFAULT) } })),
}));

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

  // Screenshare Store (LiveKit)
  const tracks = useScreenshareStore((state) => state.tracks);
  const localStreams = useScreenshareStore((state) => state.localStreams);
  const connectionState = useScreenshareStore((state) => state.connectionState);
  const shareTimeLimit = useScreenshareStore((state) => state.shareTimeLimit);
  const room = useScreenshareStore((state) => state.room);

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
  // Whether this screenshare has already been announced to this viewer
  const announcedRef = useRef(false);

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
    aspect > 1 ? (h = w / aspect) : (w = h * aspect);
    updateState(props._id, { aspectRatio: aspect });
    update(props._id, { size: { width: w, height: h, depth: props.data.size.depth } });
  };

  // Publisher: show the local capture as preview.
  // The title is set once when the share is created (it carries the label that
  // tells a user's simultaneous shares apart), so it is not overwritten here.
  useEffect(() => {
    if (yours && localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
      videoRef.current.play();
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
    if (!named || !videoRef.current) return;
    named.track.attach(videoRef.current);
    // Announce this screenshare once. `tracks` changes whenever anyone on the board
    // starts or stops sharing, so every mounted screenshare re-runs this effect —
    // announcing again here is what stacked one toast per existing share.
    if (announcedRef.current) return;
    announcedRef.current = true;
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

  // Debug: report which simulcast layers are in play (toggled from the toolbar)
  const showStats = useStatsStore((state) => state.show[props._id] ?? STATS_ON_BY_DEFAULT);
  const [shareStats, setShareStats] = useState<string[]>([]);
  // Previous byte counters per layer, so bandwidth is a rate and not a running total
  const prevBytesRef = useRef<Record<string, { bytes: number; timestamp: number }>>({});
  // Bits/s between two samples, formatted; blank on the first sample
  const rate = (key: string, bytes: number | undefined, timestamp: number) => {
    const prev = prevBytesRef.current[key];
    prevBytesRef.current[key] = { bytes: bytes ?? 0, timestamp };
    if (!prev || timestamp <= prev.timestamp) return '';
    const mbps = (((bytes ?? 0) - prev.bytes) * 8) / (timestamp - prev.timestamp) / 1000;
    return `  ${mbps.toFixed(2)}Mbps`;
  };
  useEffect(() => {
    if (!showStats) return;
    const sample = async () => {
      try {
        if (yours) {
          // Publisher: one entry per simulcast layer, with why a layer is being throttled
          const publication = room
            ? Array.from(room.localParticipant.trackPublications.values()).find((p) => p.trackName === props._id)
            : undefined;
          const track = publication?.videoTrack;
          if (!track) return setShareStats(['sending: no publication']);
          const layers = await track.getSenderStats();
          setShareStats([
            `sending ${layers.length} layer${layers.length === 1 ? '' : 's'}`,
            ...layers.map((l) => {
              const limit = l.qualityLimitationReason && l.qualityLimitationReason !== 'none' ? `  LIMIT:${l.qualityLimitationReason}` : '';
              return `  ${l.rid || '-'}  ${l.frameWidth}x${l.frameHeight}  ${Math.round(l.framesPerSecond || 0)}fps${rate(
                l.rid || '-',
                l.bytesSent,
                l.timestamp
              )}${limit}`;
            }),
          ]);
        } else {
          // Viewer: received dimensions say which layer arrived; quality is what we asked for
          const named = tracks.find((t) => t.name === props._id);
          if (!named) return setShareStats(['receiving: no track']);
          const stats = await (named.track as any).getReceiverStats?.();
          let quality: string | undefined;
          room?.remoteParticipants.forEach((participant) => {
            participant.trackPublications.forEach((publication) => {
              if (publication.trackName === props._id) quality = publication.videoQuality?.toString();
            });
          });
          setShareStats(
            stats
              ? [
                  `receiving ${stats.frameWidth ?? '?'}x${stats.frameHeight ?? '?'}${quality !== undefined ? `  layer ${quality}` : ''}`,
                  `  decoded ${stats.framesDecoded ?? 0}  dropped ${stats.framesDropped ?? 0}${rate(
                    'rx',
                    stats.bytesReceived,
                    stats.timestamp
                  )}`,
                  `  ${stats.decoderImplementation ?? ''} ${named.track.isMuted ? '(paused)' : ''}`.trimEnd(),
                ]
              : ['receiving: no stats']
          );
        }
      } catch (err) {
        setShareStats(['stats error']);
      }
    };
    sample();
    const interval = setInterval(sample, 2000);
    return () => clearInterval(interval);
  }, [showStats, yours, room, tracks, props._id]);

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

        {showStats && shareStats.length > 0 && (
          <Box position="absolute" left={0} top={0} m={2} px={3} py={2} borderRadius="md" backgroundColor="blackAlpha.700">
            {shareStats.map((line, i) => (
              <Text key={i} fontSize="20px" lineHeight="1.4" fontFamily="monospace" fontWeight="bold" color="white" whiteSpace="pre">
                {line}
              </Text>
            ))}
          </Box>
        )}

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

  // Debug overlay toggle (local to this browser)
  const showStats = useStatsStore((state) => state.show[props._id] ?? STATS_ON_BY_DEFAULT);
  const toggleStats = useStatsStore((state) => state.toggle);

  return (
    <ButtonGroup>
      <Tooltip placement="top" hasArrow label="Show stream metrics" openDelay={400}>
        <Button onClick={() => toggleStats(props._id)} colorScheme={showStats ? 'teal' : 'gray'} size="xs" mr="1">
          <MdSpeed />
        </Button>
      </Tooltip>
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
