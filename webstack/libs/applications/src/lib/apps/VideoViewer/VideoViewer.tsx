/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * VideoViewer — multi-user synchronized video player
 *
 * ── Sync model ────────────────────────────────────────────────────────────────
 * Three fields in shared state carry all the information needed:
 *
 *   currentTime     – video position (seconds) at the moment of the last action
 *   syncServerTime  – server epoch (ms)  at that same moment
 *   paused          – whether the video is paused
 *
 * When any client receives a state update it runs `apply()`:
 *   • paused  → pause + seek to currentTime
 *   • playing → elapsed = (now - syncServerTime) / 1000
 *               target  = currentTime + elapsed   (mod duration if looping)
 *               seek to target, then play()
 *
 * This means late joiners and rejoining users are handled by exactly the same
 * code path — no special-case retry logic is needed.
 *
 * ── "Act local first" principle ───────────────────────────────────────────────
 * Every action (play, pause, seek) immediately updates the LOCAL video element
 * before broadcasting the state change.  When the round-trip echo arrives
 * back from Redis, `apply()` sees the drift is < threshold and does nothing.
 * This eliminates the 1-2 second stutter that results from waiting for
 * the server round-trip before touching the video element.
 *
 * ── Clock offset ──────────────────────────────────────────────────────────────
 * `localServerEpoch()` fetches the server time ONCE on first call, computes
 * `offset = serverEpoch - Date.now()`, and caches it.  All subsequent calls
 * return `Date.now() + offset` with no HTTP request.  `clockOffsetMs()` is
 * the synchronous read of that cached value used inside tight loops / intervals.
 *
 * ── What was removed vs. the previous implementation ─────────────────────────
 * • The 1-second polling interval that called serverTime() per client → replaced
 *   by the 5-second drift-correction interval which is purely synchronous math.
 * • The 20-retry late-joiner loop with exponential backoff → handled by a single
 *   `loadedmetadata` { once: true } listener in `apply()`.
 * • `syncVideoTime` (redundant with `currentTime`).
 * • `isSettingTimeRef` race-condition guard → no longer needed because we only
 *   seek when drift exceeds a meaningful threshold.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router';
import {
  Box,
  Button,
  ButtonGroup,
  Tooltip,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  UnorderedList,
  ListItem,
  AspectRatio,
} from '@chakra-ui/react';
import {
  MdArrowRightAlt,
  MdFileDownload,
  MdGraphicEq,
  MdLoop,
  MdPause,
  MdPlayArrow,
  MdVolumeOff,
  MdVolumeUp,
  MdScreenshotMonitor,
  MdInfoOutline,
  MdMovie,
} from 'react-icons/md';
import { format as formatTime } from 'date-fns';

import { Asset, ExtraImageType, ExtraVideoType } from '@sage3/shared/types';
import {
  useAppStore,
  useAssetStore,
  downloadFile,
  useHexColor,
  useUIStore,
  localServerEpoch,
  clockOffsetMs,
} from '@sage3/frontend';

import { App, AppSchema, AppGroup } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { initialValues } from '../../initialValues';

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

/** Converts a duration in seconds to a mm:ss display string. */
function getDurationString(n: number): string {
  return formatTime(n * 1000, 'mm:ss');
}

/**
 * Calculates the position (seconds) a video should be at right now,
 * accounting for elapsed server time since the last sync point.
 *
 * @param currentTime  - video position (s) when the action was taken
 * @param syncServerTime - server epoch (ms) when the action was taken
 * @param duration     - total video duration (s), undefined if not yet loaded
 * @param loop         - whether the video is set to loop
 * @returns target position in seconds, clamped/wrapped to valid range
 */
function calcTarget(currentTime: number, syncServerTime: number, duration: number | undefined, loop: boolean): number {
  const elapsed = (Date.now() + clockOffsetMs() - syncServerTime) / 1000;
  const raw = Math.max(0, currentTime + elapsed);
  if (!duration) return raw;
  return loop ? raw % duration : Math.min(raw, duration);
}

// ─────────────────────────────────────────────────────────────────────────────
// AppComponent — renders the video element and owns the sync logic
// ─────────────────────────────────────────────────────────────────────────────

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const { roomId, boardId } = useParams();

  // Shared state write functions
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);

  // Read-only store subscriptions
  const assets = useAssetStore((state) => state.assets);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const boardDragging = useUIStore((state) => state.boardDragging);

  // Ref to the <video> element — used for direct DOM reads/writes (currentTime,
  // play(), pause()).  We never set state from timeupdate here; the toolbar
  // does that via its own listener so only the toolbar re-renders on tick.
  const videoRef = useRef<HTMLVideoElement>(null);

  // Ref to the wrapper <div> — receives keyboard events when the app is focused.
  const divRef = useRef<HTMLDivElement>(null);

  // Local display state — only re-renders AppComponent when asset changes.
  const [url, setUrl] = useState<string>();
  const [file, setFile] = useState<Asset>();
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  // ── Clock offset warm-up ───────────────────────────────────────────────────
  // The first call to localServerEpoch() does an HTTP round-trip to measure
  // the offset between Date.now() and the server clock, then caches it.
  // We kick that off at mount so the offset is ready before the first action.
  useEffect(() => {
    localServerEpoch();
  }, []);

  // ── Asset resolution ───────────────────────────────────────────────────────
  // When the assetid in state changes (or the asset list updates), look up
  // the video file, extract its metadata, and update the window title.
  useEffect(() => {
    const asset = assets.find((a) => a._id === s.assetid);
    if (!asset) return;

    setFile(asset);
    const extras = asset.data.derived as ExtraVideoType;
    setAspectRatio(extras.aspectRatio || 16 / 9);
    update(props._id, { title: asset.data.originalfilename });
    setUrl(extras.url);
  }, [s.assetid, assets]);

  // ── Loop attribute ─────────────────────────────────────────────────────────
  // Keep the native <video> loop attribute in sync with shared state.
  // The browser handles the actual looping; we just flip the flag.
  useEffect(() => {
    if (videoRef.current) videoRef.current.loop = s.loop;
  }, [s.loop]);

  // ── CORE SYNC ──────────────────────────────────────────────────────────────
  //
  // This is the entire synchronization mechanism — one effect, ~20 lines.
  //
  // Fires whenever paused, currentTime, or syncServerTime changes, which
  // covers every action any connected client can take (play, pause, seek).
  //
  // `apply()` is either called immediately (if metadata is already loaded)
  // or deferred via a one-shot 'loadedmetadata' listener.  This handles the
  // late-joiner / rejoin case with no retry logic: the browser calls apply()
  // exactly once as soon as it knows the video structure.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const apply = () => {
      if (s.paused) {
        // ── Paused ────────────────────────────────────────────────────────────
        video.pause();
        // Only seek if we're meaningfully off — avoids a needless seek when the
        // local client's own pause echo arrives back from the server.
        if (Math.abs(video.currentTime - s.currentTime) > 0.2) {
          video.currentTime = s.currentTime;
        }
      } else {
        // ── Playing ───────────────────────────────────────────────────────────
        // Calculate where the video *should* be right now based on how much
        // server time has elapsed since the last play/seek action.
        const target = s.syncServerTime
          ? calcTarget(s.currentTime, s.syncServerTime, video.duration, s.loop)
          : s.currentTime;

        // Only seek if drift exceeds 0.3 s — avoids a re-seek when the local
        // client's own play echo comes back with near-zero elapsed time.
        if (Math.abs(video.currentTime - target) > 0.3) {
          video.currentTime = target;
        }
        video.play().catch(console.error);
      }
    };

    // If the browser already has video metadata (duration, seekable ranges) we
    // can apply immediately.  Otherwise defer until 'loadedmetadata' fires —
    // this is the late-joiner path with no retries needed.
    if (video.readyState >= 1) {
      apply();
    } else {
      video.addEventListener('loadedmetadata', apply, { once: true });
    }
  }, [s.paused, s.currentTime, s.syncServerTime]);

  // ── DRIFT CORRECTION ───────────────────────────────────────────────────────
  //
  // Over time, playback on different clients can drift due to buffering stalls,
  // tab throttling, or system clock jitter.  This interval checks every 5 s
  // and re-syncs if drift exceeds 1 second.
  //
  // Key properties:
  //  • Purely synchronous math — uses the cached clockOffsetMs(), zero HTTP.
  //  • Only active while playing (interval is torn down on pause/seek).
  //  • Re-created whenever currentTime or syncServerTime change (seek resets it).
  //  • Uses modulo for loop mode so it never clamps a looped video to its end.
  useEffect(() => {
    if (s.paused || !s.syncServerTime) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused) return;

      const target = calcTarget(s.currentTime, s.syncServerTime!, video.duration, s.loop);
      if (Math.abs(video.currentTime - target) > 1.0) {
        video.currentTime = target;
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [s.paused, s.currentTime, s.syncServerTime, s.loop]);

  // ── Video end handler ──────────────────────────────────────────────────────
  // Only fires when loop = false (the browser suppresses 'ended' when looping).
  // Resets currentTime to 0 so the next play starts from the beginning.
  const handleEnd = useCallback(async () => {
    const epoch = await localServerEpoch();
    updateState(props._id, { paused: true, currentTime: 0, syncServerTime: epoch });
  }, [props._id]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  // Space / P  → toggle play/pause
  // D          → download the original file
  // C          → capture the current frame as an ImageViewer app
  // Escape     → deselect this app
  //
  // Uses "act local first": the video element is updated synchronously before
  // the async updateState broadcast so there is no perceptible delay.
  const handleKeyDown = useCallback(
    async (evt: KeyboardEvent) => {
      evt.stopPropagation();
      const video = videoRef.current;
      if (!video) return;

      switch (evt.code) {
        case 'Space':
        case 'KeyP': {
          const epoch = await localServerEpoch();
          if (s.paused) {
            video.play().catch(console.error);
            updateState(props._id, { paused: false, currentTime: video.currentTime, syncServerTime: epoch });
          } else {
            video.pause();
            updateState(props._id, { paused: true, currentTime: video.currentTime, syncServerTime: epoch });
          }
          break;
        }
        case 'KeyD': {
          if (file) {
            const extras = file.data.derived as ExtraImageType;
            downloadFile(extras.url, file.data.originalfilename);
          }
          break;
        }
        case 'KeyC': {
          const setup = await captureFrame(video);
          if (setup && roomId && boardId) {
            createApp({
              ...setup,
              roomId,
              boardId,
              position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
              size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
            } as AppSchema);
          }
          break;
        }
        case 'Escape': {
          setSelectedApp('');
          break;
        }
      }
    },
    [s.paused, file, props.data.position, props._id, roomId, boardId]
  );

  // Attach keyboard + focus/blur handlers to the wrapper div.
  // Mouse-enter focuses the div so keyboard events land here.
  // Mouse-leave blurs so global shortcuts still work elsewhere.
  useEffect(() => {
    const div = divRef.current;
    if (!div) return;
    const onLeave = () => div.blur();
    const onEnter = () => div.focus({ preventScroll: true });
    div.addEventListener('keydown', handleKeyDown);
    div.addEventListener('mouseleave', onLeave);
    div.addEventListener('mouseenter', onEnter);
    return () => {
      div.removeEventListener('keydown', handleKeyDown);
      div.removeEventListener('mouseleave', onLeave);
      div.removeEventListener('mouseenter', onEnter);
    };
  }, [handleKeyDown]);

  return (
    <AppWindow app={props} lockAspectRatio={aspectRatio} hideBackgroundIcon={MdMovie}>
      {/*
       * AspectRatio wrapper keeps the video correctly sized inside the app window.
       * tabIndex={1} is required for the div to be focusable (keyboard events).
       *
       * The video is hidden while the board is being dragged (boardDragging) to
       * avoid expensive paint work during pan/zoom gestures.
       *
       * preload="auto" tells the browser to start buffering immediately so that
       * seeking and late-joiner sync can happen without waiting for a download.
       *
       * muted={true} is required by browser autoplay policy — browsers block
       * autoplay of unmuted video without a user gesture.  Users can unmute via
       * the toolbar button (local state only, not synced).
       */}
      <AspectRatio width="100%" ratio={aspectRatio} ref={divRef} tabIndex={1}>
        <video
          ref={videoRef}
          id={`${props._id}-video`}
          src={url}
          muted={true}
          preload="auto"
          height="100%"
          width="100%"
          onEnded={handleEnd}
          style={{ display: boardDragging ? 'none' : 'block', objectFit: 'contain' }}
        />
      </AspectRatio>
    </AppWindow>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ToolbarComponent — controls rendered in the shared app toolbar bar
// ─────────────────────────────────────────────────────────────────────────────
//
// The toolbar accesses the <video> element by DOM id (rendered in AppComponent)
// rather than through React props.  This is intentional: it avoids lifting the
// video ref up through the app framework and keeps the two components decoupled.
//
// Every action that affects shared state follows the same pattern:
//   1. Update the local video element immediately (no round-trip delay).
//   2. Fetch the current server epoch (cached, no HTTP after first call).
//   3. Broadcast the new state via updateState.
//
// When the state echo arrives back from Redis, the core sync effect in
// AppComponent sees drift < threshold and does nothing — no double-seek.

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const { roomId, boardId } = useParams();

  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);
  const assets = useAssetStore((state) => state.assets);

  // Asset info for download + info popover
  const [file, setFile] = useState<Asset>();
  const [extras, setExtras] = useState<ExtraVideoType>();

  // currentTime drives the seek slider display.
  // sliderTime shadows it while the user is actively dragging the slider,
  // so the tooltip follows the thumb without broadcasting every pixel.
  const [currentTime, setCurrentTime] = useState(0);
  const [sliderTime, setSliderTime] = useState<number | null>(null);

  // Reference to the <video> element in AppComponent.
  // Obtained once on mount via getElementById, with a short retry in case
  // the video element hasn't rendered yet when the toolbar mounts.
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const teal = useHexColor('teal');

  // ── Video element reference ────────────────────────────────────────────────
  useEffect(() => {
    const get = () => {
      const v = document.getElementById(`${props._id}-video`) as HTMLVideoElement;
      if (v) videoRef.current = v;
    };
    get();
    // Short timeout in case AppComponent hasn't rendered the <video> yet
    const t = setTimeout(get, 500);
    return () => clearTimeout(t);
  }, [props._id]);

  // ── Time display ───────────────────────────────────────────────────────────
  // Listen to 'timeupdate' events from the video element to keep the slider
  // position accurate.  This is more efficient than polling via setInterval
  // and only causes the toolbar (not AppComponent) to re-render on each tick.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [props._id]);

  // ── Asset resolution ───────────────────────────────────────────────────────
  useEffect(() => {
    const asset = assets.find((a) => a._id === s.assetid);
    if (!asset) return;
    setFile(asset);
    setExtras(asset.data.derived as ExtraVideoType);
  }, [s.assetid, assets]);

  // ── Play ───────────────────────────────────────────────────────────────────
  // Start playback locally first, then broadcast.
  const handlePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(console.error);
    const epoch = await localServerEpoch();
    updateState(props._id, { paused: false, currentTime: video.currentTime, syncServerTime: epoch });
  };

  // ── Pause ──────────────────────────────────────────────────────────────────
  // Pause locally first, then broadcast.  Because the video is already paused
  // when the echo arrives, the core sync effect's drift check is a no-op.
  const handlePause = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    const epoch = await localServerEpoch();
    updateState(props._id, { paused: true, currentTime: video.currentTime, syncServerTime: epoch });
  };

  // ── Loop toggle ────────────────────────────────────────────────────────────
  // Flips the loop flag in shared state.  AppComponent's useEffect picks it up
  // and sets video.loop accordingly on all clients.
  const handleLoop = () => updateState(props._id, { loop: !s.loop });

  // ── Mute ───────────────────────────────────────────────────────────────────
  // Mute/unmute is intentionally LOCAL ONLY — each user controls their own
  // audio.  We do not sync this to avoid one user muting everyone else.
  const handleMute = () => {
    if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
  };

  // ── Download ───────────────────────────────────────────────────────────────
  // Triggers a browser download of the original uploaded file.
  const handleDownload = () => {
    if (file) {
      const derived = file.data.derived as ExtraImageType;
      downloadFile(derived.url, file.data.originalfilename);
    }
  };

  // ── Screenshot ─────────────────────────────────────────────────────────────
  // Captures the current video frame as a canvas image and opens it in a new
  // ImageViewer app next to this one.
  // If playing, we wait for the next decoded frame via requestVideoFrameCallback
  // so we capture a clean, fully-rendered frame rather than whatever happens
  // to be in the compositor at click time.
  const handleScreenshot = async () => {
    const video = videoRef.current;
    if (!video) return;
    const doCapture = async () => {
      const setup = await captureFrame(video);
      if (setup && roomId && boardId) {
        createApp({
          ...setup,
          roomId,
          boardId,
          position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
          size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
        } as AppSchema);
      }
    };
    if (s.paused) {
      doCapture();
    } else {
      video.requestVideoFrameCallback(doCapture);
    }
  };

  // ── Seek (drag) ────────────────────────────────────────────────────────────
  // While the user drags the slider we update only the LOCAL video position
  // and the slider tooltip.  We do NOT broadcast here — that would flood every
  // other client with seek commands on every pixel of drag movement.
  const seekChangeHandle = (value: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value;
      setSliderTime(value);
    }
  };

  // ── Seek (release) ─────────────────────────────────────────────────────────
  // When the user releases the slider we broadcast the final position.
  // We also update syncServerTime so other clients calculate elapsed time
  // from this new reference point (important if the video is playing).
  const seekEndHandle = async (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
    setSliderTime(null);
    const epoch = await localServerEpoch();
    // paused flag is unchanged — if it was playing it keeps playing from the
    // new position; if it was paused it stays paused at the new position.
    updateState(props._id, { currentTime: value, syncServerTime: epoch });
  };

  // The slider shows sliderTime while dragging, currentTime otherwise.
  const displayTime = sliderTime !== null ? sliderTime : currentTime;
  const duration = videoRef.current?.duration || 0;

  return (
    <>
      {/* ── Play / Pause ───────────────────────────────────────────────────── */}
      <ButtonGroup isAttached size="xs" colorScheme="teal" mr={1}>
        <Tooltip placement="top" hasArrow={true} label="Play" openDelay={400}>
          <Button onClick={handlePlay} isDisabled={!videoRef.current} size="xs" px={0}>
            <MdPlayArrow size="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label="Pause" openDelay={400}>
          <Button onClick={handlePause} isDisabled={!videoRef.current} size="xs" px={0}>
            <MdPause size="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>

      {/* ── Loop / Mute ────────────────────────────────────────────────────── */}
      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top" hasArrow={true} label="Loop" openDelay={400}>
          <Button onClick={handleLoop} isDisabled={!videoRef.current} size="xs" px={0}>
            {/* Show loop icon when looping, arrow icon when not */}
            {s.loop ? <MdLoop size="16px" /> : <MdArrowRightAlt size="16px" />}
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={videoRef.current?.muted ? 'Unmute' : 'Mute'} openDelay={400}>
          <Button onClick={handleMute} isDisabled={!videoRef.current} size="xs" px={0}>
            {videoRef.current?.muted ? <MdVolumeOff size="16px" /> : <MdVolumeUp size="16px" />}
          </Button>
        </Tooltip>
      </ButtonGroup>

      {/* ── Seek slider ────────────────────────────────────────────────────── */}
      {/*
       * onChange fires on every drag pixel → updates local video only.
       * onChangeEnd fires on mouse-up → broadcasts the final position.
       * focusThumbOnChange={false} prevents the thumb from stealing keyboard
       * focus away from the app window.
       */}
      <Slider
        aria-label="video-seek"
        value={displayTime}
        max={duration}
        width="200px"
        mx={4}
        onChange={seekChangeHandle}
        onChangeEnd={seekEndHandle}
        focusThumbOnChange={false}
      >
        <SliderTrack bg="gray.200">
          <SliderFilledTrack bg={teal} />
        </SliderTrack>
        {/* Start / end time labels fixed to the track edges */}
        <SliderMark value={0} fontSize="xs" mt="1.5" ml="-3">
          {getDurationString(0)}
        </SliderMark>
        <SliderMark value={duration} fontSize="xs" mt="1.5" ml="-5">
          {getDurationString(duration)}
        </SliderMark>
        {/* Floating tooltip above the thumb showing current position */}
        <SliderMark value={displayTime} textAlign="center" bg={teal} color="white" mt="-9" ml="-5" p="0.5" fontSize="xs" borderRadius="md">
          {getDurationString(displayTime)}
        </SliderMark>
        <SliderThumb boxSize={4}>
          <Box color="teal" as={MdGraphicEq} />
        </SliderThumb>
      </Slider>

      {/* ── Utility buttons ────────────────────────────────────────────────── */}
      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top" hasArrow={true} label="Download" openDelay={400}>
          <Button onClick={handleDownload} isDisabled={!videoRef.current} size="xs" px={0}>
            <MdFileDownload size="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label="Screenshot" openDelay={400}>
          <Button onClick={handleScreenshot} isDisabled={!videoRef.current} size="xs" px={0}>
            <MdScreenshotMonitor size="16px" />
          </Button>
        </Tooltip>

        {/* Info popover — shows technical metadata from exiftool */}
        <Popover placement="top" trigger="hover">
          <PopoverTrigger>
            <Button isDisabled={!videoRef.current} size="xs" px={0}>
              <MdInfoOutline size="16px" />
            </Button>
          </PopoverTrigger>
          <PopoverContent fontSize="sm">
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverHeader>File: {file?.data.originalfilename}</PopoverHeader>
            <PopoverBody>
              <UnorderedList>
                <ListItem>Resolution: {extras?.width} x {extras?.height}</ListItem>
                <ListItem>Duration: {extras?.duration}</ListItem>
                <ListItem>Bit Rate: {extras?.birate}</ListItem>
                <ListItem>Audio: {extras?.audioFormat}</ListItem>
                <ListItem>Video: {extras?.compressor}</ListItem>
                <ListItem>Framerate: {extras?.framerate}</ListItem>
                <ListItem>Rotation: {extras?.rotation}</ListItem>
              </UnorderedList>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </ButtonGroup>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GroupedToolbarComponent — shown when multiple apps are selected as a group
// Not implemented for VideoViewer.
// ─────────────────────────────────────────────────────────────────────────────

const GroupedToolbarComponent = (_props: { apps: AppGroup }) => null;

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

// ─────────────────────────────────────────────────────────────────────────────
// captureFrame — draws the current video frame to a canvas and returns the
// setup object needed to open it as an ImageViewer app.
// Resolution is capped at 1280 px wide (original resolution can be huge).
// ─────────────────────────────────────────────────────────────────────────────

async function captureFrame(video: HTMLVideoElement) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = canvas.width / (video.videoWidth / video.videoHeight);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/jpg');
    canvas.remove();
    return {
      title: 'Screenshot',
      rotation: { x: 0, y: 0, z: 0 },
      type: 'ImageViewer',
      state: { ...(initialValues['ImageViewer'] as AppState), assetid: image },
      raised: false,
    };
  }
  canvas.remove();
  return null;
}
