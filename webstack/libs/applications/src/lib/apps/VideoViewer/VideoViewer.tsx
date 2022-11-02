/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useRef, useState } from 'react';
import { Box, Button, ButtonGroup, Tooltip, Slider, SliderFilledTrack, SliderMark, SliderThumb, SliderTrack } from '@chakra-ui/react';
import {
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
} from 'react-icons/md';
// Time functions
import { format as formatTime } from 'date-fns';

import { Asset, ExtraImageType } from '@sage3/shared/types';
import { useAppStore, useAssetStore, useUser, downloadFile, useUIStore, usePresenceStore } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

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

  // App Store
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);

  // Current User
  const { user } = useUser();
  const yourController = user?._id === s.play.uid;

  // Assets
  const [url, setUrl] = useState<string>();
  const [file, setFile] = useState<Asset>();
  const assets = useAssetStore((state) => state.assets);

  // Aspect Ratio
  const [aspectRatio, setAspecRatio] = useState(16 / 9);

  // Html Ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const scale = useUIStore((state) => state.scale);

  // Used to detect if the controller disconnected or left board
  const presences = usePresenceStore((state) => state.presences);

  // Check if the controller left the board and pause the video if so
  useEffect(() => {
    const controllerId = s.play.uid;
    const controller = presences.find((p) => p._id === controllerId && p.data.boardId === props.data.boardId);
    if (!controller && presences.length > 0) {
      updateState(props._id, { play: { ...s.play, uid: '', paused: true } });
    }
  }, [JSON.stringify(presences)]);

  // Get Asset from store
  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.assetid);
    if (myasset) {
      setFile(myasset);
      const extras = myasset.data.derived as ExtraImageType;
      setAspecRatio(extras.aspectRatio || 1);
      // Update the app title
      update(props._id, { title: myasset?.data.originalfilename });
    }
  }, [s.assetid, assets]);

  // If the file is updated, update the url
  useEffect(() => {
    if (file) {
      const extras = file.data.derived as ExtraImageType;
      const video_url = extras.url;
      // save the url of the video
      setUrl(video_url);
    }
  }, [file]);

  // When the videoref is loaded, update the aspect ratio
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.addEventListener('loadedmetadata', (e: Event) => {
        if (e && videoRef.current) {
          // Diplay the video current time and duration
          const length = getDurationString(videoRef.current.duration);
          const time = getDurationString(videoRef.current.currentTime);
          update(props._id, { title: `${file?.data.originalfilename} - ${time} / ${length}` });
        }
      });
    }
  }, [file, videoRef]);

  // Set the initial time of the video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = s.play.currentTime;
    }
    return () => {
      // Remove your uid from the play state if you leave the page
      if (yourController && videoRef.current) {
        updateState(props._id, { play: { ...s.play, pause: true, currentTime: videoRef.current.currentTime, uid: '' } });
      }
    };
  }, []);

  // Match the curretTime of the video to the servers time
  useEffect(() => {
    if (videoRef.current && !yourController) {
      // The delta between the local video's time and the server's time
      const delta = Math.abs(videoRef.current.currentTime - s.play.currentTime);
      // If there is a 4 second delta, update the video's time
      if (delta > 4) {
        videoRef.current.currentTime = s.play.currentTime;
      }
    }
  }, [s.play.currentTime, videoRef.current]);

  // If play was updated, update the video
  useEffect(() => {
    // Setup an interval to update the current time if this user initiated the play
    let updateTimeInterval: null | NodeJS.Timeout = null;
    if (yourController) {
      // If the video is playing, update the current time
      if (!s.play.paused && videoRef.current) {
        updateTimeInterval = setInterval(() => {
          if (!videoRef.current) return;
          const currentTime = videoRef.current.currentTime;
          const duration = videoRef.current.duration;
          const paused = currentTime >= duration && !s.play.loop ? true : false;
          updateState(props._id, { play: { ...s.play, paused: paused, currentTime: currentTime ?? 0 } });
          // Convert time numbers to strings
          const length = getDurationString(duration);
          const time = getDurationString(currentTime);
          // Update the title
          update(props._id, { title: `${file?.data.originalfilename} - ${time} / ${length}` });
        }, 1000);
      }
    }

    async function playVideo() {
      if (videoRef.current) {
        const isPlaying = videoRef.current.readyState > 2;

        if (!s.play.paused && isPlaying) {
          videoRef.current.play();
        } else if (s.play.paused) {
          videoRef.current.pause();
        }
      }
    }

    // Play the video
    playVideo();

    return () => {
      // Clear interval if it exists
      if (updateTimeInterval) {
        clearInterval(updateTimeInterval);
      }
    };
  }, [s.play.paused, s.play.uid, s.play.loop, user, videoRef.current?.readyState]);

  return (
    <AppWindow app={props} lockAspectRatio={aspectRatio}>
      <div
        style={{
          position: 'relative',
          overflowY: 'hidden',
          height: props.data.size.width / aspectRatio,
          maxHeight: '100%',
          borderRadius: '0 0 6px 6px',
        }}
      >
        {/* Pause icon in bottom corner to show if video is paused. */}
        {s.play.paused ? (
          <Box
            color="white"
            position="absolute"
            left="0"
            bottom="0"
            fontSize="32px"
            backgroundColor="rgba(10,10,10,.75)"
            borderRadius="0 100% 0 0"
            width="50px"
            height="50px"
            display="flex"
            justifyContent="left"
            alignItems="center"
            transform={`scale(${Math.min(3, 1 / scale)})`}
            transformOrigin="bottom left"
          >
            <MdPause transform={'translate(5, 5)'} />
          </Box>
        ) : null}
        <video ref={videoRef} id={`${props._id}-video`} src={url} height="100%" width="100%" muted={true} loop={s.play.loop}></video>
      </div>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // User
  const { user } = useUser();
  // Stores
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const assets = useAssetStore((state) => state.assets);

  // React State
  const [videoRef] = useState<HTMLVideoElement>(document.getElementById(`${props._id}-video`) as HTMLVideoElement);
  const [duration, setDuration] = useState(videoRef ? videoRef.duration : 0);
  const [sliderTime, setSliderTime] = useState(s.play.currentTime);
  const [file, setFile] = useState<Asset>();

  const [seeking, setSeeking] = useState(false);

  // Detect if video is muted
  let isMute = true;
  if (videoRef) {
    isMute = videoRef.muted;
  }

  // Obtain the asset for download functionality
  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.assetid);
    if (myasset) {
      setFile(myasset);
    }
  }, [s.assetid, assets]);

  // Set the slider time if curretime or paused state change
  useEffect(() => {
    setSliderTime(s.play.currentTime);
  }, [s.play.currentTime, s.play.paused]);

  // Update duration of the slider
  useEffect(() => {
    if (videoRef) {
      setDuration(videoRef.duration);
    }
  }, [videoRef]);

  // Handle a play action
  const handlePlay = () => {
    if (user) {
      updateState(props._id, { play: { ...s.play, uid: user._id, paused: !s.play.paused, currentTime: videoRef.currentTime } });
      const time = getDurationString(videoRef.currentTime);
      const length = getDurationString(duration);
      update(props._id, { title: `${file?.data.originalfilename} - ${time} / ${length}` });
    }
  };

  // Handle a rewind action
  const handleRewind = () => {
    if (user) {
      const newTime = Math.max(0, videoRef.currentTime - 5);
      videoRef.currentTime = newTime;
      updateState(props._id, { play: { ...s.play, uid: user._id, currentTime: newTime } });
      const time = getDurationString(videoRef.currentTime);
      const length = getDurationString(duration);
      update(props._id, { title: `${file?.data.originalfilename} - ${time} / ${length}` });
    }
  };

  // Handle a forward action
  const handleForward = () => {
    if (user) {
      const newTime = Math.max(0, videoRef.currentTime + 5);
      videoRef.currentTime = newTime;
      updateState(props._id, { play: { ...s.play, uid: user._id, currentTime: newTime } });
      const time = getDurationString(videoRef.currentTime);
      const length = getDurationString(duration);
      update(props._id, { title: `${file?.data.originalfilename} - ${time} / ${length}` });
    }
  };

  // Handle a forward action
  const handleLoop = () => {
    if (user) {
      updateState(props._id, {
        play: { ...s.play, uid: user._id, loop: !s.play.loop },
      });
      const time = getDurationString(videoRef.currentTime);
      const length = getDurationString(duration);
      update(props._id, { title: `${file?.data.originalfilename} - ${time} / ${length}` });
    }
  };

  // Handle a mute action, local state only
  const handleMute = () => {
    videoRef.muted = !isMute;
  };

  // Download the file
  const handleDownload = () => {
    if (file) {
      // const url = file?.data.file;
      const filename = file.data.originalfilename;
      const extras = file.data.derived as ExtraImageType;
      const video_url = extras.url;
      downloadFile(video_url, filename);
    }
  };

  // Handle user moving slider
  const seekChangeHandle = (value: number) => {
    setSliderTime(value);
    videoRef.currentTime = value;
  };

  const seekStartHandle = () => {
    setSeeking(true);
  };

  const seekEndHandle = (value: number) => {
    setSeeking(false);
    videoRef.currentTime = value;
    if (user) {
      updateState(props._id, {
        play: { ...s.play, uid: user._id, currentTime: videoRef.currentTime },
      });
      const time = getDurationString(videoRef.currentTime);
      const length = getDurationString(duration);
      update(props._id, { title: `${file?.data.originalfilename} - ${time} / ${length}` });
    }
  };

  return (
    <>
      {/* App State with server */}
      <ButtonGroup isAttached size="xs" colorScheme="green" mr={2}>
        <Tooltip placement="top-start" hasArrow={true} label={'Rewind 10 Seconds'} openDelay={400}>
          <Button onClick={handleRewind} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
            <MdFastRewind />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={!s.play.paused ? 'Pause Video' : 'Play Video'} openDelay={400}>
          <Button onClick={handlePlay} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
            {s.play.paused ? <MdPlayArrow /> : <MdPause />}
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Forward 10 Seconds'} openDelay={400}>
          <Button onClick={handleForward} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
            <MdFastForward />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Loop'} openDelay={400}>
          <Button onClick={handleLoop} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
            {s.play.loop ? <MdLoop /> : <MdArrowRightAlt />}
          </Button>
        </Tooltip>
      </ButtonGroup>

      <Slider
        aria-label="slider-ex-4"
        value={sliderTime}
        max={duration}
        width="200px"
        mx={2}
        onChange={seekChangeHandle}
        onChangeStart={seekStartHandle}
        onChangeEnd={seekEndHandle}
      >
        <SliderTrack bg="green.100">
          <SliderFilledTrack bg="green.400" />
        </SliderTrack>
        <SliderMark value={0} fontSize="xs" mt="1.5" ml="-3">
          {' '}
          {getDurationString(0)}{' '}
        </SliderMark>
        <SliderMark value={duration} fontSize="xs" mt="1.5" ml="-5">
          {getDurationString(duration)}
        </SliderMark>
        <SliderMark
          value={sliderTime}
          textAlign="center"
          bg="green.500"
          color="white"
          mt="-9"
          ml="-5"
          p="0.5"
          fontSize="xs"
          borderRadius="md"
        >
          {getDurationString(sliderTime)}
        </SliderMark>
        <SliderThumb boxSize={4}>
          <Box
            color="green.500"
            as={MdGraphicEq}
            transition={'all 0.2s'}
            _hover={{ opacity: 0.7, transform: 'scaleY(1.3)', color: 'green.300' }}
          />
        </SliderThumb>
      </Slider>

      {/* Local State Buttons - Only Changes the video state for the local user */}
      <ButtonGroup isAttached size="xs" colorScheme={'teal'} ml={2}>
        <Tooltip placement="top-start" hasArrow={true} label={isMute ? 'Unmute' : 'Mute'} openDelay={400}>
          <Button onClick={handleMute} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
            {isMute ? <MdVolumeOff /> : <MdVolumeUp />}
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Download Video'} openDelay={400}>
          <Button onClick={handleDownload} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
