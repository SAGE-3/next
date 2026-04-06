/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
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
  MdAccessTime,
  MdArrowRightAlt,
  MdFastForward,
  MdFastRewind,
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
// Time functions
import { format as formatTime } from 'date-fns';

import { Asset, ExtraImageType, ExtraVideoType } from '@sage3/shared/types';
import { useAppStore, useAssetStore, downloadFile, useHexColor, useUIStore, serverTime } from '@sage3/frontend';

import { App, AppSchema, AppGroup } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { initialValues } from '../../initialValues';
import { throttle } from 'throttle-debounce';

/**
 * Return a string for a duration
 *
 * @param {number} n duration in seconds
 * @returns {string} formatted duration
 */
function getDurationString(n: number): string {
  return formatTime(n * 1000, 'mm:ss');
}

/**
 * Calculate expected video time based on server time sync
 * @param syncServerTime Server timestamp (ms) when sync started
 * @param syncVideoTime Video time (seconds) when sync started
 * @param currentServerTime Current server timestamp
 * @param videoDuration Video duration in seconds
 * @param loop Whether video is looping
 * @returns Expected video time in seconds, or null if stale/invalid
 */
function calculateExpectedTime(
  syncServerTime: number,
  syncVideoTime: number,
  currentServerTime: number,
  videoDuration: number | undefined,
  loop: boolean
): number | null {
  const elapsedServerTime = (currentServerTime - syncServerTime) / 1000;
  
  // Validate that the syncServerTime is recent (within last 5 minutes)
  if (elapsedServerTime < 0 || elapsedServerTime > 300) {
    return null; // Stale state
  }
  
  let expectedTime = syncVideoTime + elapsedServerTime;
  
  // Handle looping
  if (loop && videoDuration) {
    expectedTime = expectedTime % videoDuration;
  } else if (videoDuration) {
    expectedTime = Math.min(expectedTime, videoDuration);
  }
  
  return expectedTime;
}

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // Navigation and routing
  const { roomId, boardId } = useParams();
  // App store
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);
  // Assets
  const [url, setUrl] = useState<string>();
  const [file, setFile] = useState<Asset>();
  const assets = useAssetStore((state) => state.assets);
  // Aspect Ratio
  const [aspectRatio, setAspecRatio] = useState(16 / 9);
  // Html Ref
  const videoRef = useRef<HTMLVideoElement>(null);
  // Div around the pages to capture events
  const divRef = useRef<HTMLDivElement>(null);
  // Ref to prevent race conditions when setting currentTime
  const isSettingTimeRef = useRef(false);
  // Used to deselect the app
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const boardDragging = useUIStore((state) => state.boardDragging);

  // Get Asset from store
  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.assetid);
    if (myasset) {
      setFile(myasset);
      const extras = myasset.data.derived as ExtraVideoType;
      setAspecRatio(extras.aspectRatio || 1);
      // Update the app title
      update(props._id, { title: myasset?.data.originalfilename });
    }
  }, [s.assetid, assets]);

  // If the file is updated, update the url
  useEffect(() => {
    if (file) {
      const extras = file.data.derived as ExtraVideoType;
      const video_url = extras.url;
      setUrl(video_url);
    }
  }, [file]);

  // Set pause/play state and handle time sync (fallback for manual control)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isSettingTimeRef.current) return;

    // Handle play/pause
    if (s.paused) {
      video.pause();
    } else {
      video.play().catch(console.error);
    }

    // Only set currentTime if we don't have sync markers (manual control)
    // Server-time sync handles time when syncServerTime exists
    // IMPORTANT: Don't set currentTime if video is at 0 and not paused - this indicates
    // a late joiner scenario where we should wait for sync markers to arrive
    if (!s.syncServerTime || !s.syncVideoTime) {
      // If video is at 0 and we're trying to play, wait for sync markers (late joiner)
      // Only sync if video has already started playing (not a fresh load)
      if (video.currentTime === 0 && !s.paused && video.readyState >= 1) {
        // This is likely a late joiner - wait a bit for sync markers to arrive
        // The late joiner useEffect will handle syncing
        return;
      }
      
      const drift = Math.abs(video.currentTime - s.currentTime);
      if (drift > 3) {
        isSettingTimeRef.current = true;
        video.currentTime = s.currentTime;
        setTimeout(() => {
          isSettingTimeRef.current = false;
        }, 100);
      }
    }
  }, [s.paused, s.currentTime, s.syncServerTime, s.syncVideoTime]);

  // Shared sync function: Calculate expected time and sync if needed
  const performSync = useCallback(async (shouldPlay: boolean = false) => {
    const video = videoRef.current;
    if (!video || !s.syncServerTime || !s.syncVideoTime || isSettingTimeRef.current) return false;

    // Wait for video to have metadata loaded (need duration for sync calculations)
    if (video.readyState < 1) return false;

    // Check if video is buffering (for continuous sync only, not late joiners)
    if (!shouldPlay && video.readyState < 3) return false;

    try {
      const serverTimeData = await serverTime();
      const expectedTime = calculateExpectedTime(
        s.syncServerTime,
        s.syncVideoTime,
        serverTimeData.epoch,
        video.duration,
        s.loop
      );

      if (expectedTime === null) return false; // Stale state

      const actualTime = video.currentTime;
      const drift = Math.abs(expectedTime - actualTime);

      // For late joiners (shouldPlay=true), be more aggressive - sync if drift > 0.1 seconds
      // For continuous sync, use 0.5 second threshold
      const threshold = shouldPlay ? 0.1 : 0.5;
      
      if (drift > threshold) {
        isSettingTimeRef.current = true;
        video.currentTime = expectedTime;
        
        if (shouldPlay && !s.paused) {
          video.play().catch(console.error);
        }
        
        setTimeout(() => {
          isSettingTimeRef.current = false;
        }, 100);
        return true;
      }
    } catch (error) {
      console.error('VideoViewer> Error syncing with server time:', error);
    }
    return false;
  }, [s.syncServerTime, s.syncVideoTime, s.paused, s.loop]);

  // Server-time-based continuous sync: Calculate expected time and correct drift
  useEffect(() => {
    if (!s.syncServerTime || !s.syncVideoTime || s.paused) return;

    const syncInterval = setInterval(() => {
      performSync(false);
    }, 1000); // Check every second

    return () => clearInterval(syncInterval);
  }, [s.syncServerTime, s.syncVideoTime, s.paused, performSync]);


  // Set loop state of video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.loop = s.loop;
    }
  }, [s.loop, videoRef]);

  // Track when video element becomes available (triggers re-render)
  const [videoReady, setVideoReady] = useState(false);
  
  // Monitor when video element becomes available
  useEffect(() => {
    if (videoRef.current && !videoReady) {
      setVideoReady(true);
    }
  }, [url, videoReady]); // Re-check when URL changes

  // Late joiner handling: Sync when video loads or state changes
  useEffect(() => {
    // Early return if we don't have the required state
    if (!s.syncServerTime || !s.syncVideoTime) return;
    
    // Wait for video element to be available
    if (!videoRef.current) {
      // Video not ready yet - will retry when videoReady becomes true
      return;
    }

    const video = videoRef.current;
    let retryCount = 0;
    const maxRetries = 20; // Try for up to ~5 seconds (20 * 250ms)
    let retryTimeoutId: NodeJS.Timeout | null = null;
    let isCleanedUp = false;

    const attemptSync = async () => {
      if (isCleanedUp || !videoRef.current) return;
      
      const synced = await performSync(true);
      
      // If sync succeeded or we've tried enough times, stop
      if (synced || retryCount >= maxRetries) {
        return;
      }
      
      // Retry with exponential backoff (starts at 100ms, max 500ms)
      retryCount++;
      const delay = Math.min(100 * Math.pow(1.2, retryCount), 500);
      retryTimeoutId = setTimeout(attemptSync, delay);
    };

    // Try to sync on video loading events
    const events = ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'];
    events.forEach((event) => {
      video.addEventListener(event, attemptSync);
    });

    // Start sync attempts immediately
    attemptSync();

    return () => {
      isCleanedUp = true;
      events.forEach((event) => {
        video.removeEventListener(event, attemptSync);
      });
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
    };
  }, [s.syncServerTime, s.syncVideoTime, s.paused, s.loop, videoReady, performSync]);

  // Handle a play action
  const handlePlay = async () => {
    if (videoRef.current) {
      const paused = !s.paused;
      // Ensure we get the actual current time, defaulting to 0 if not available
      const time = videoRef.current.currentTime || 0;

      // Get server time and set sync markers for synchronization
      try {
        const serverTimeData = await serverTime();
        updateState(props._id, {
          currentTime: time,
          paused: paused,
          syncServerTime: serverTimeData.epoch,
          syncVideoTime: time,
        });
      } catch (error) {
        console.error('VideoViewer> Error getting server time:', error);
        // Fallback to old behavior if server time fails
        updateState(props._id, { currentTime: time, paused: paused });
      }
    }
  };

  // Event handler
  const handleUserKeyPress = useCallback(
    async (evt: KeyboardEvent) => {
      evt.stopPropagation();
      switch (evt.code) {
        case 'Space':
        case 'KeyP': {
          handlePlay();
          break;
        }
        case 'KeyD': {
          // Trigger a download
          if (file) {
            const filename = file.data.originalfilename;
            const extras = file.data.derived as ExtraImageType;
            const video_url = extras.url;
            downloadFile(video_url, filename);
          }
          break;
        }
        case 'KeyC': {
          // Capture a screenshot
          if (videoRef.current) {
            const setup = await captureFrame(videoRef.current);
            if (setup && roomId && boardId) {
              createApp({
                ...setup,
                roomId: roomId,
                boardId: boardId,
                position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
                size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
              } as AppSchema);
            }
          }
          break;
        }
        case 'Escape': {
          // Deselect the app
          setSelectedApp('');
        }
      }
    },
    [s, file, props.data.position]
  );

  // Attach/detach event handler from the div
  useEffect(() => {
    const div = divRef.current;
    if (div) {
      div.addEventListener('keydown', handleUserKeyPress);
      div.addEventListener('mouseleave', () => {
        // remove focus onto div
        div.blur();
      });
      div.addEventListener('mouseenter', () => {
        // Focus on the div for keyboard events
        div.focus({ preventScroll: true });
      });
    }
    return () => {
      if (div) div.removeEventListener('keydown', handleUserKeyPress);
    };
  }, [divRef, handleUserKeyPress]);

  // Event handler for video end
  function onVideoEnd() {
    // Clear sync markers when video ends and set final currentTime
    const finalTime = videoRef.current?.currentTime || 0;
    updateState(props._id, {
      currentTime: finalTime,
      paused: true,
      syncServerTime: undefined,
      syncVideoTime: undefined,
    });
  }

  // Handle video looping - reset sync markers when video loops
  useEffect(() => {
    if (!videoRef.current || !s.loop || !s.syncServerTime || !s.syncVideoTime) return;

    const handleTimeUpdate = () => {
      if (!videoRef.current || !s.syncServerTime || !s.syncVideoTime) return;
      
      // If video loops back to start (currentTime < 0.5 and we were past the start)
      if (videoRef.current.currentTime < 0.5 && s.syncVideoTime > 1) {
        // Video has looped, reset the sync markers (include currentTime for consistency)
        const loopTime = videoRef.current.currentTime || 0;
        serverTime()
          .then((serverTimeData) => {
            updateState(props._id, {
              currentTime: loopTime,
              syncServerTime: serverTimeData.epoch,
              syncVideoTime: loopTime,
            });
          })
          .catch(console.error);
      }
    };

    const video = videoRef.current;
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoRef, s.loop, s.syncServerTime, s.syncVideoTime]);

  return (
    <AppWindow app={props} lockAspectRatio={aspectRatio} hideBackgroundIcon={MdMovie}>
      <AspectRatio width={"100%"} ratio={aspectRatio} ref={divRef} tabIndex={1}>
        <video
          ref={videoRef}
          id={`${props._id}-video`}
          src={url}
          muted={true}
          height="100%"
          width="100%"
          onEnded={onVideoEnd}
          style={{ display: boardDragging ? 'none' : 'block', objectFit: 'contain' }}
        ></video>
      </AspectRatio>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // Navigation and routing
  const { roomId, boardId } = useParams();

  // Appstore
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);

  // Stores
  const assets = useAssetStore((state) => state.assets);

  // React State
  const [file, setFile] = useState<Asset>();
  const [extras, setExtras] = useState<ExtraVideoType>();

  // Local State
  const [sliderTime, setSliderTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Use ref for video element (more efficient than state)
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Color
  const teal = useHexColor('teal');

  // Get video element once when component mounts
  useEffect(() => {
    const video = document.getElementById(`${props._id}-video`) as HTMLVideoElement;
    if (video) {
      videoRef.current = video;
    }
    // Also check after a short delay in case video loads later
    const timeoutId = setTimeout(() => {
      const videoDelayed = document.getElementById(`${props._id}-video`) as HTMLVideoElement;
      if (videoDelayed) {
        videoRef.current = videoDelayed;
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [props._id]);

  // Use timeupdate event listener instead of polling (more efficient)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    setCurrentTime(video.currentTime);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [props._id]); // Re-run when component ID changes

  // Obtain the asset for download functionality
  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.assetid);
    if (myasset) {
      setFile(myasset);
      setExtras(myasset.data.derived as ExtraVideoType);
    }
  }, [s.assetid, assets]);

  // Handle a play action
  const handlePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure video has metadata loaded before getting currentTime
    // This is critical for first play when video might not be ready
    if (video.readyState < 1) {
      // Wait for metadata to load
      await new Promise<void>((resolve) => {
        const onLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          resolve();
        };
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        // Fallback timeout in case event never fires
        setTimeout(resolve, 1000);
      });
    }

    let time = video.currentTime;
    // Ensure we have a valid time (not NaN)
    if (isNaN(time) || time < 0) {
      time = 0;
    }

    // Check if time of video is at the end
    if (video.duration && time >= video.duration) {
      time = 0.0;
      video.currentTime = 0.0;
    }

    // Start playing the video BEFORE setting sync markers
    // This ensures the video is actually playing when we capture the time
    await video.play().catch(console.error);

    // Get server time and set ALL sync values in ONE atomic update
    // Use the actual currentTime after play() to ensure accuracy
    const finalTime = video.currentTime || time || 0;
    try {
      const serverTimeData = await serverTime();
      updateState(props._id, {
        currentTime: finalTime,
        paused: false,
        syncServerTime: serverTimeData.epoch,
        syncVideoTime: finalTime,
      });
    } catch (error) {
      console.error('VideoViewer> Error getting server time:', error);
      // Fallback: set currentTime and paused if server time fails
      updateState(props._id, { currentTime: finalTime, paused: false });
    }
  };

  // Handle a pause action
  const handlePause = () => {
    const video = videoRef.current;
    if (!video) return;

    updateState(props._id, {
      currentTime: video.currentTime,
      paused: true,
      syncServerTime: undefined,
      syncVideoTime: undefined,
    });
  };


  // Handle a loop action
  const handleLoop = () => {
    updateState(props._id, { loop: !s.loop });
  };

  // Handle a mute action, local state only
  const handleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
    }
  };

  // Download the file
  const handleDownload = () => {
    if (file) {
      const filename = file.data.originalfilename;
      const extras = file.data.derived as ExtraImageType;
      const video_url = extras.url;
      downloadFile(video_url, filename);
    }
  };

  // Screenshot the video and open an image viewer
  const handleScreenshot = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (s.paused) {
      // Just capture now
      const setup = await captureFrame(video);
      if (setup && roomId && boardId) {
        createApp({
          ...setup,
          roomId: roomId,
          boardId: boardId,
          position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
          size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
        } as AppSchema);
      }
    } else {
      // Next frame, then capture
      video.requestVideoFrameCallback(async () => {
        const setup = await captureFrame(video);
        if (setup && roomId && boardId) {
          createApp({
            ...setup,
            roomId: roomId,
            boardId: boardId,
            position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
            size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
          } as AppSchema);
        }
      });
    }
  };

  // When the user is seeking, throttle the updates
  const throttleSeek = throttle(1000, (value) => {
    updateState(props._id, { currentTime: value });
  });

  // Keep a copy of the function
  const throttleSeekFunc = useRef(throttleSeek);

  // Handle user moving slider
  const seekChangeHandle = (value: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = value;
      setSliderTime(value);
      throttleSeekFunc.current(value);
    }
  };

  // Handle user moving slider
  const seekEndHandle = async (value: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = value;
    setCurrentTime(value);
    setSliderTime(null);

    // If playing, reset sync markers after seek (all in one atomic update)
    if (!s.paused) {
      try {
        const serverTimeData = await serverTime();
        updateState(props._id, {
          currentTime: value,
          syncServerTime: serverTimeData.epoch,
          syncVideoTime: value,
        });
      } catch (error) {
        console.error('VideoViewer> Error getting server time:', error);
        // Fallback: set currentTime only if server time fails
        updateState(props._id, { currentTime: value });
      }
    } else {
      // If paused, just update currentTime (no sync markers needed)
      updateState(props._id, { currentTime: value });
    }
  };


  return (
    <>
      {/* App State with server */}
      <ButtonGroup isAttached size="xs" colorScheme="teal" mr={1}>

        <Tooltip placement="top" hasArrow={true} label={'Play Video'} openDelay={400}>
          <Button onClick={handlePlay} isDisabled={!videoRef.current} size="xs" px={0}>
            <MdPlayArrow size="16px" />
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Pause Video'} openDelay={400}>
          <Button onClick={handlePause} isDisabled={!videoRef.current} size="xs" px={0}>
            <MdPause size="16px" />
          </Button>
        </Tooltip>

      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top" hasArrow={true} label={'Loop'} openDelay={400}>
          <Button onClick={handleLoop} isDisabled={!videoRef.current} size="xs" px={0}>
            {videoRef.current?.loop ? <MdLoop size="16px" /> : <MdArrowRightAlt size="16px" />}
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={videoRef.current?.muted ? 'Unmute' : 'Mute'} openDelay={400}>
          <Button onClick={handleMute} isDisabled={!videoRef.current} size="xs" px={0}>
            {videoRef.current?.muted ? <MdVolumeOff size="16px" /> : <MdVolumeUp size="16px" />}
          </Button>
        </Tooltip>
      </ButtonGroup>

      <Slider
        aria-label="slider-ex-4"
        value={sliderTime !== null ? sliderTime : currentTime}
        max={videoRef.current?.duration}
        width="200px"
        mx={4}
        onChange={seekChangeHandle}
        onChangeEnd={seekEndHandle}
        focusThumbOnChange={false}
      >
        <SliderTrack bg={'gray.200'}>
          <SliderFilledTrack bg={teal} />
        </SliderTrack>
        <SliderMark value={0} fontSize="xs" mt="1.5" ml="-3">
          {getDurationString(0)}
        </SliderMark>
        <SliderMark value={videoRef.current?.duration || 0} fontSize="xs" mt="1.5" ml="-5">
          {getDurationString(videoRef.current?.duration || 0)}
        </SliderMark>
        <SliderMark
          value={sliderTime !== null ? sliderTime : currentTime}
          textAlign="center"
          bg={teal}
          color="white"
          mt="-9"
          ml="-5"
          p="0.5"
          fontSize="xs"
          borderRadius="md"
        >
          {getDurationString(sliderTime !== null ? sliderTime : currentTime)}
        </SliderMark>
        <SliderThumb boxSize={4}>
          <Box color="teal" as={MdGraphicEq} transition={'all 0.2s'} _hover={{ color: teal }} />
        </SliderThumb>
      </Slider>

      {/* Local State Buttons - Only Changes the video state for the local user */}
      <ButtonGroup isAttached size="xs" colorScheme={'teal'} mx={1}>

        <Tooltip placement="top" hasArrow={true} label={'Download Video'} openDelay={400}>
          <Button onClick={handleDownload} isDisabled={!videoRef.current} size="xs" px={0}>
            <MdFileDownload size="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Screenshot'} openDelay={400}>
          <Button onClick={handleScreenshot} isDisabled={!videoRef.current} size="xs" px={0}>
            <MdScreenshotMonitor size="16px" />
          </Button>
        </Tooltip>
        <Popover placement="top" trigger="hover">
          <PopoverTrigger>
                <Button isDisabled={!videoRef.current} size="xs" px={0}>
              <MdInfoOutline size="16px" />
            </Button>
          </PopoverTrigger>
          <PopoverContent fontSize={'sm'}>
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverHeader>File: {file?.data.originalfilename}</PopoverHeader>
            <PopoverBody>
              <UnorderedList>
                <ListItem>
                  Resolution: {extras?.width} x {extras?.height}
                </ListItem>
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

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
 return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

/**
 * Draw a video into a canvas and return the image
 * @param video: HTMLVideoElement
 * @returns a Partial of AppSchema for an ImageViewer or null
 */
async function captureFrame(video: HTMLVideoElement) {
  if (video) {
    // Create a canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1280; // video.videoWidth;
    canvas.height = canvas.width / (video.videoWidth / video.videoHeight);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw the video into the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Get the image from the canvas
      const image = await canvas.toDataURL('image/jpg');
      canvas.remove();
      // Return app setup
      const init = { assetid: image };
      return {
        title: 'Screenshot',
        rotation: { x: 0, y: 0, z: 0 },
        type: 'ImageViewer',
        state: { ...(initialValues['ImageViewer'] as AppState), ...init },
        raised: false,
      };
    }
  }
  return null;
}
