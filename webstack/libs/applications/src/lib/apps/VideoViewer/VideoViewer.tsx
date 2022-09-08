/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { CSSProperties, useEffect, useRef, useState } from 'react';
import {
  Box, Button, ButtonGroup, Tooltip,
  Slider, SliderFilledTrack, SliderMark, SliderThumb, SliderTrack,
} from '@chakra-ui/react';
import {
  MdArrowRightAlt, MdFastForward, MdFastRewind, MdFileDownload,
  MdGraphicEq, MdLoop, MdPause, MdPlayArrow,
  MdVolumeOff, MdVolumeUp,
} from 'react-icons/md';

import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

import { Asset } from '@sage3/shared/types';
import { useAppStore, useAssetStore, useUser, downloadFile } from '@sage3/frontend';

export function getStaticAssetUrl(filename: string): string {
  return `api/assets/static/${filename}`;
}

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // App Store
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);

  // Current User
  const { user } = useUser();

  // Assets
  const [url, setUrl] = useState<string>();
  const [file, setFile] = useState<Asset>();
  const assets = useAssetStore((state) => state.assets);

  // Aspect Ratio
  const [aspectRatio, setAspecRatio] = useState(16 / 9);

  // Html Ref
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get Asset from store
  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.vid);
    if (myasset) {
      setFile(myasset);
      // Update the app title
      update(props._id, { description: 'VideoViewer> ' + myasset?.data.originalfilename });
    }
  }, [s.vid, assets]);

  // If the file is updated, update the url
  useEffect(() => {
    if (file) {
      // save the url of the video
      setUrl(getStaticAssetUrl(file.data.file));
    }
  }, [file]);

  // When the videoref is loaded, update the aspect ratio
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.addEventListener('loadedmetadata', (e: Event) => {
        if (e) {
          const w = videoRef.current?.videoWidth ?? 16;
          const h = videoRef.current?.videoHeight ?? 9;
          const ar = w / h;
          setAspecRatio(ar);
        }
      });
    }
  }, [videoRef]);

  // Set the current time of the video
  useEffect(() => {
    if (videoRef.current) {
      // The delta between the local video's time and the server's time
      const delta = Math.abs(videoRef.current.currentTime - s.play.currentTime);
      // If there is a 4 second delta, update the video's time
      if (delta > 4) {
        videoRef.current.currentTime = s.play.currentTime;
      }
    }
  }, [s.play.currentTime, videoRef.current]);

  // Set the initial time of the video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = s.play.currentTime;
    }
    return () => {
      if (s.play.uid === user?._id) {
        updateState(props._id, { play: { ...s.play, uid: '' } });
      }
    };
  }, []);

  // If play was updated, update the video
  useEffect(() => {
    // Setup an interval to update the current time if this user initiated the play
    let updateTimeInterval: null | NodeJS.Timeout = null;
    if (s.play.uid === user?._id) {
      // If the video is playing, update the current time
      if (!s.play.paused) {
        updateTimeInterval = setInterval(() => {
          updateState(props._id, { play: { ...s.play, currentTime: videoRef.current?.currentTime ?? 0 } });
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

  const videoContainerStyle: CSSProperties = {
    position: 'relative',
    overflowY: 'hidden',
    height: props.data.size.width / aspectRatio,
    maxHeight: '100%',
  };

  return (
    <AppWindow app={props} lockAspectRatio={aspectRatio}>
      <div style={videoContainerStyle}>
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
  const update = useAppStore((state) => state.updateState);
  const assets = useAssetStore((state) => state.assets);

  // React State
  const [videoRef] = useState<HTMLVideoElement>(document.getElementById(`${props._id}-video`) as HTMLVideoElement);
  const [duration, setDuration] = useState(videoRef.duration);
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
    const myasset = assets.find((a) => a._id === s.vid);
    if (myasset) {
      setFile(myasset);
    }
  }, [s.vid, assets]);

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
      update(props._id, { play: { ...s.play, uid: user._id, paused: !s.play.paused, currentTime: videoRef.currentTime } });
    }
  };

  // Handle a rewind action
  const handleRewind = () => {
    if (user) {
      update(props._id, { play: { ...s.play, uid: user._id, currentTime: Math.max(0, videoRef.currentTime - 5) } });
    }
  };

  // Handle a forward action
  const handleForward = () => {
    if (user) {
      update(props._id, {
        play: { ...s.play, uid: user._id, currentTime: Math.max(0, videoRef.currentTime + 5) },
      });
    }
  };

  // Handle a forward action
  const handleLoop = () => {
    if (user) {
      update(props._id, {
        play: { ...s.play, uid: user._id, loop: !s.play.loop },
      });
    }
  };

  // Handle a mute action, local state only
  const handleMute = () => {
    videoRef.muted = !isMute;
  };

  // Download the file
  const handleDownload = () => {
    if (file) {
      const url = file?.data.file;
      const filename = file?.data.originalfilename;
      downloadFile(getStaticAssetUrl(url), filename);
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

  const seekEndHandle = () => {
    setSeeking(false);
    if (user) {
      update(props._id, {
        play: { ...s.play, uid: user._id, currentTime: videoRef.currentTime },
      });
    }
  };

  return (
    <>
      {/* App State with server */}
      <ButtonGroup isAttached size="xs" colorScheme="green" mr={2}>
        <Tooltip placement="bottom" hasArrow={true} label={'Rewind 10 Seconds'} openDelay={400}>
          <Button onClick={handleRewind} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
            <MdFastRewind />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={!s.play.paused ? 'Pause Video' : 'Play Video'} openDelay={400}>
          <Button onClick={handlePlay} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
            {s.play.paused ? <MdPlayArrow /> : <MdPause />}
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Forward 10 Seconds'} openDelay={400}>
          <Button onClick={handleForward} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
            <MdFastForward />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Loop'} openDelay={400}>
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
          {new Date(0).toISOString().substring(14, 19)}
        </SliderMark>
        <SliderMark value={duration} fontSize="xs" mt="1.5" ml="-5">
          {new Date(duration * 1000).toISOString().substring(14, 19)}
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
          {new Date(sliderTime * 1000).toISOString().substring(14, 19)}
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
        <Tooltip placement="bottom" hasArrow={true} label={isMute ? 'Unmute' : 'Mute'} openDelay={400}>
          <Button onClick={handleMute} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
            {isMute ? <MdVolumeOff /> : <MdVolumeUp />}
          </Button>
        </Tooltip>
        <Tooltip placement="bottom" hasArrow={true} label={'Download Video'} openDelay={400}>
          <Button onClick={handleDownload} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
