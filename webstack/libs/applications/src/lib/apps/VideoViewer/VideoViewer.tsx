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
import { useAppStore, useAssetStore, downloadFile, useHexColor, useUIStore } from '@sage3/frontend';

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
      // save the url of the video
      setUrl(video_url);
    }
  }, [file, videoRef]);

  // Set pause state of the video
  useEffect(() => {
    if (videoRef.current) {
      if (s.paused) {
        videoRef.current.pause();
        videoRef.current.currentTime = s.currentTime;
      } else {
        videoRef.current.play();
        videoRef.current.currentTime = s.currentTime;
      }
    }
  }, [s.paused, videoRef]);

  // Set time of video
  useEffect(() => {
    if (videoRef.current) {
      if (Math.abs(videoRef.current.currentTime - s.currentTime) > 4) {
        videoRef.current.currentTime = s.currentTime;
      }
    }
  }, [s.currentTime, videoRef]);

  // Set loop state of video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.loop = s.loop;
    }
  }, [s.loop, videoRef]);

  // Handle a play action
  const handlePlay = () => {
    if (videoRef.current) {
      const paused = !s.paused;
      const time = videoRef.current.currentTime;
      updateState(props._id, { currentTime: time, paused: paused });
    }
  };

  // Event handler
  const handleUserKeyPress = useCallback(
    async (evt: KeyboardEvent) => {
      evt.stopPropagation();
      switch (evt.code) {
        case 'Space': {
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
    updateState(props._id, { paused: true });
  }

  return (
    <AppWindow app={props} lockAspectRatio={aspectRatio} hideBackgroundIcon={MdMovie}>
      <div
        style={{
          position: 'relative',
          overflowY: 'hidden',
          height: props.data.size.width / aspectRatio,
          maxHeight: '100%',
          borderRadius: '0 0 6px 6px',
          background: '#004225',
        }}
        // setting for keyboard handler
        ref={divRef}
        tabIndex={1}
      >
        <video
          ref={videoRef}
          id={`${props._id}-video`}
          src={url}
          muted={true}
          height="100%"
          width="100%"
          onEnded={onVideoEnd}
          style={{ display: boardDragging ? 'none' : 'block' }}
        ></video>
      </div>
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
  const [videoRef, setVideoRef] = useState<HTMLVideoElement>();
  const [file, setFile] = useState<Asset>();
  const [extras, setExtras] = useState<ExtraVideoType>();

  // Local State
  const [sliderTime, setSliderTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Color
  const teal = useHexColor('teal');

  useEffect(() => {
    let interval: number | null = null;
    const obtainVideoRef = () => {
      const video = document.getElementById(`${props._id}-video`) as HTMLVideoElement;
      if (video) {
        setVideoRef(video);
        if (interval) window.clearInterval(interval);
      }
    };
    interval = window.setInterval(obtainVideoRef, 500);
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let interval: number | null = null;
    const setTime = () => {
      if (videoRef) {
        setCurrentTime(videoRef.currentTime);
      }
    };
    interval = window.setInterval(setTime, 500);
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [videoRef]);

  // Obtain the asset for download functionality
  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.assetid);
    if (myasset) {
      setFile(myasset);
      setExtras(myasset.data.derived as ExtraVideoType);
    }
  }, [s.assetid, assets]);

  // Handle a play action
  const handlePlay = () => {
    if (videoRef) {
      const v = videoRef;
      let time = v.currentTime;
      // Check if time of video is at the end
      if (time === videoRef.duration) {
        time = 0.0;
        v.currentTime = 0.0;
        v.play();
      }
      updateState(props._id, { currentTime: time, paused: false });
    }
  };

  // Handle a pause action
  const handlePause = () => {
    if (videoRef) {
      updateState(props._id, { currentTime: videoRef.currentTime, paused: true });
    }
  };

  // Handle a rewind action
  const handleRewind = () => {
    if (videoRef) {
      const time = Math.min(videoRef.duration, videoRef.currentTime - 5);
      updateState(props._id, { currentTime: time });
    }
  };

  // Handle a forward action
  const handleForward = () => {
    if (videoRef) {
      const time = Math.min(videoRef.duration, videoRef.currentTime + 5);
      updateState(props._id, { currentTime: time });
    }
  };

  // Handle a forward action
  const handleLoop = () => {
    if (videoRef) {
      const loop = !s.loop;
      updateState(props._id, { loop: loop });
    }
  };

  // Handle a mute action, local state only
  const handleMute = () => {
    if (videoRef) {
      videoRef.muted = !videoRef.muted;
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
    if (videoRef) {
      if (s.paused) {
        // Just capture now
        const setup = await captureFrame(videoRef);
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
        videoRef.requestVideoFrameCallback(async () => {
          // params to requestVideoFrameCallback: (now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata)
          const setup = await captureFrame(videoRef);
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
    if (videoRef) {
      videoRef.currentTime = value;
      setSliderTime(value);
      throttleSeekFunc.current(value);
    }
  };

  // Handle user moving slider
  const seekEndHandle = (value: number) => {
    if (videoRef) {
      videoRef.currentTime = value;
      updateState(props._id, { currentTime: value });
      setCurrentTime(value);
      setSliderTime(null);
    }
  };

  const handleSyncOnMe = () => {
    if (videoRef) {
      updateState(props._id, { currentTime: videoRef.currentTime, loop: videoRef.loop, paused: videoRef.paused });
    }
  };

  return (
    <>
      {/* App State with server */}
      <ButtonGroup isAttached size="xs" colorScheme="teal" mr={1}>
        <Tooltip placement="top-start" hasArrow={true} label={'Rewind 5 Seconds'} openDelay={400}>
          <Button onClick={handleRewind} isDisabled={!videoRef}>
            <MdFastRewind />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Play Video'} openDelay={400}>
          <Button onClick={handlePlay} isDisabled={!videoRef}>
            <MdPlayArrow />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Pause Video'} openDelay={400}>
          <Button onClick={handlePause} isDisabled={!videoRef}>
            <MdPause />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Forward 5 Seconds'} openDelay={400}>
          <Button onClick={handleForward} isDisabled={!videoRef}>
            <MdFastForward />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top-start" hasArrow={true} label={'Loop'} openDelay={400}>
          <Button onClick={handleLoop} isDisabled={!videoRef}>
            {videoRef?.loop ? <MdLoop /> : <MdArrowRightAlt />}
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Sync on me'} openDelay={400}>
          <Button onClick={handleSyncOnMe} isDisabled={!videoRef}>
            <MdAccessTime />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <Slider
        aria-label="slider-ex-4"
        value={sliderTime ? sliderTime : currentTime}
        max={videoRef?.duration}
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
        <SliderMark value={videoRef?.duration || 0} fontSize="xs" mt="1.5" ml="-5">
          {getDurationString(videoRef?.duration || 0)}
        </SliderMark>
        <SliderMark
          value={sliderTime ? sliderTime : currentTime}
          textAlign="center"
          bg={teal}
          color="white"
          mt="-9"
          ml="-5"
          p="0.5"
          fontSize="xs"
          borderRadius="md"
        >
          {getDurationString(sliderTime ? sliderTime : currentTime)}
        </SliderMark>
        <SliderThumb boxSize={4}>
          <Box color="teal" as={MdGraphicEq} transition={'all 0.2s'} _hover={{ color: teal }} />
        </SliderThumb>
      </Slider>

      {/* Local State Buttons - Only Changes the video state for the local user */}
      <ButtonGroup isAttached size="xs" colorScheme={'teal'} mx={1}>
        <Tooltip placement="top-start" hasArrow={true} label={videoRef?.muted ? 'Unmute' : 'Mute'} openDelay={400}>
          <Button onClick={handleMute} isDisabled={!videoRef}>
            {videoRef?.muted ? <MdVolumeOff /> : <MdVolumeUp />}
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Download Video'} openDelay={400}>
          <Button onClick={handleDownload} isDisabled={!videoRef}>
            <MdFileDownload />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Screenshot'} openDelay={400}>
          <Button onClick={handleScreenshot} isDisabled={!videoRef}>
            <MdScreenshotMonitor />
          </Button>
        </Tooltip>
        <Popover placement="top-start" trigger="hover">
          <PopoverTrigger>
            <Button isDisabled={!videoRef}>
              <MdInfoOutline />
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
  const updateStateBatch = useAppStore((state) => state.updateStateBatch);

  const handleRewind = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    // Iterate through all the selected apps
    props.apps.forEach((app) => {
      ps.push({ id: app._id, updates: { currentTime: 0.0, paused: true } });
      const v = document.getElementById(`${app._id}-video`) as HTMLVideoElement;
      if (v) {
        v.pause();
        v.currentTime = 0.0;
        v.load();
      }
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  const handlePlay = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    // Iterate through all the selected apps
    props.apps.forEach((app) => {
      const v = document.getElementById(`${app._id}-video`) as HTMLVideoElement;
      if (v) {
        // Check if time of video is at the end
        if (v.currentTime === v.duration) {
          v.currentTime = 0.0;
        }
        v.play();
        ps.push({ id: app._id, updates: { paused: false, currentTime: v.currentTime } });
      }
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  const handleStop = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      const v = document.getElementById(`${app._id}-video`) as HTMLVideoElement;
      if (v) {
        v.pause();
        ps.push({ id: app._id, updates: { paused: true, currentTime: v.currentTime } });
      }
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  const handleLoop = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      ps.push({ id: app._id, updates: { loop: true } });
      const v = document.getElementById(`${app._id}-video`) as HTMLVideoElement;
      if (v) v.loop = true;
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  const handleNoLoop = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      ps.push({ id: app._id, updates: { loop: false } });
      const v = document.getElementById(`${app._id}-video`) as HTMLVideoElement;
      if (v) v.loop = false;
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  const handleSyncOnMe = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      const v = document.getElementById(`${app._id}-video`) as HTMLVideoElement;
      if (v) {
        ps.push({ id: app._id, updates: { currentTime: v.currentTime, loop: v.loop, paused: v.paused } });
      }
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  return (
    <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
      <Tooltip placement="top-start" hasArrow={true} label={'Rewind To Begining'} openDelay={400}>
        <Button onClick={handleRewind}>
          <MdFastRewind />
        </Button>
      </Tooltip>

      <Tooltip placement="top-start" hasArrow={true} label={'Play Videos'} openDelay={400}>
        <Button onClick={handlePlay}>
          <MdPlayArrow />
        </Button>
      </Tooltip>

      <Tooltip placement="top-start" hasArrow={true} label={'Pause Videos'} openDelay={400}>
        <Button onClick={handleStop}>
          <MdPause />
        </Button>
      </Tooltip>

      <Tooltip placement="top-start" hasArrow={true} label={'Loop'} openDelay={400}>
        <Button onClick={handleLoop}>
          <MdLoop />
        </Button>
      </Tooltip>

      <Tooltip placement="top-start" hasArrow={true} label={'No Loop'} openDelay={400}>
        <Button onClick={handleNoLoop}>
          <MdArrowRightAlt />
        </Button>
      </Tooltip>

      <Tooltip placement="top-start" hasArrow={true} label={'Sync on me'} openDelay={400}>
        <Button onClick={handleSyncOnMe}>
          <MdAccessTime />
        </Button>
      </Tooltip>
    </ButtonGroup>
  );
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
