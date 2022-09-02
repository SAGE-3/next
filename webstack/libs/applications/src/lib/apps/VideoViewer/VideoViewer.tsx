/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { isUUIDv4, useAppStore, useAssetStore, useUIStore, useUser } from '@sage3/frontend';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { CSSProperties, useEffect, useRef, useState } from 'react';
import { Asset } from '@sage3/shared/types';
import { Box, Button, ButtonGroup, Slider, SliderFilledTrack, SliderThumb, SliderTrack, Tooltip } from '@chakra-ui/react';
import { MdFastForward, MdFastRewind, MdGraphicEq, MdPause, MdPlayArrow } from 'react-icons/md';

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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = s.play.currentTime;
    }
  }, []);

  // Set the current time of the video
  useEffect(() => {
    if (videoRef.current) {
      const delta = Math.abs(videoRef.current.currentTime - s.play.currentTime);
      console.log(delta);
      if (delta > 2) {
        videoRef.current.currentTime = s.play.currentTime;
      }
    }
  }, [s.play.currentTime, user]);

  // If play was updated, update the video
  useEffect(() => {
    let interval: null | NodeJS.Timeout = null;
    if (s.play.uid === user?._id) {
      if (!s.play.paused) {
        interval = setInterval(() => {

          updateState(props._id, { play: { ...s.play, uid: user._id, currentTime: videoRef.current?.currentTime ?? 0 } });
        }, 1000);
      }
    }
    async function playVideo() {
      if (videoRef.current) {
        var isPlaying =
          videoRef.current.currentTime > 0 &&
          !videoRef.current.paused &&
          !videoRef.current.ended &&
          videoRef.current.readyState > videoRef.current.HAVE_CURRENT_DATA;

        !s.play.paused && !isPlaying ? await videoRef.current.play() : videoRef.current.pause();
      }
    }
    playVideo();
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [s.play.paused, s.play.uid, user]);

  const videoContainerStyle: CSSProperties = {
    position: 'relative',
    overflowY: 'hidden',
    height: props.data.size.width / aspectRatio,
    maxHeight: '100%',
  };
  const videoStyle: CSSProperties = { height: '100%', width: '100%' };

  return (
    <AppWindow app={props} lockAspectRatio={aspectRatio}>
      <div style={videoContainerStyle}>
        <video ref={videoRef} id={`${props._id}-video`} src={url} autoPlay={false} height="100%" width="100%"></video>
      </div>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const update = useAppStore((state) => state.updateState);
  const [videoRef] = useState<HTMLVideoElement>(document.getElementById(`${props._id}-video`) as HTMLVideoElement);

  const [duration, setDuration] = useState(10);

  const [sliderTime, setSliderTime] = useState(s.play.currentTime);

  const { user } = useUser();

  useEffect(() => {
    setSliderTime(s.play.currentTime);
  }, [s.play.currentTime, s.play]);

  useEffect(() => {
    if (videoRef) {
      setDuration(videoRef.duration);
    }
  }, [videoRef]);

  const handlePlay = () => {
    if (user) {
      update(props._id, { play: { uid: user._id, paused: !s.play.paused, currentTime: s.play.currentTime } });
    }
  };

  const handleRewind = () => {
    if (user) {
      update(props._id, { play: { uid: user._id, paused: s.play.paused, currentTime: Math.max(0, s.play.currentTime - 5) } });
    }
  };

  const handleForward = () => {
    if (user) {
      update(props._id, { play: { uid: user._id, paused: s.play.paused, currentTime: Math.min(videoRef.duration, s.play.currentTime + 5) } });
    }
  };
  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal" >
        <Tooltip placement="bottom" hasArrow={true} label={'Rewind 10 Seconds'} openDelay={400}>
          <Button onClick={handleRewind} colorScheme={'green'} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
            <MdFastRewind />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={!s.play.paused ? 'Pause Video' : 'Play Video'} openDelay={400}>
          <Button onClick={handlePlay} colorScheme={'green'} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
            {!s.play.paused ? <MdPause /> : <MdPlayArrow />}
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Forward 10 Seconds'} openDelay={400}>
          <Button onClick={handleForward} colorScheme={'green'} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
            <MdFastForward />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <Slider aria-label="slider-ex-4" value={sliderTime} max={duration} width="200px" mx={2}>
        <SliderTrack bg="green.100">
          <SliderFilledTrack bg="green.400" />
        </SliderTrack>
        <SliderThumb boxSize={6}>
          <Box
            color="green.500"
            as={MdGraphicEq}
            transition={'all 0.2s'}
            _hover={{ opacity: 0.7, transform: 'scaleY(1.3)', color: 'green.300' }}
          />
        </SliderThumb>
      </Slider>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
