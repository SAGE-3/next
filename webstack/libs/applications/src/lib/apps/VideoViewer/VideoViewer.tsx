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
  MdAccessTime,
  MdArrowRightAlt,
  MdFastForward,
  MdFastRewind,
  MdFileDownload,
  MdGraphicEq,
  MdLoop,
  MdPause,
  MdPlayArrow,
  MdSync,
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
import create from 'zustand';
// Yjs Imports
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

/**
 * Return a string for a duration
 *
 * @param {number} n duration in seconds
 * @returns {string} formatted duration
 */
function getDurationString(n: number): string {
  return formatTime(n * 1000, 'mm:ss');
}

// Viewviewer store
export const useStore = create((set: any) => ({
  ydocs: {} as { [key: string]: Y.Map<any> },
  setYDoc: (id: string, doc: Y.Map<any>) => set((s: any) => ({ editor: { ...s.editor, ...{ [id]: doc } } })),
}));

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const update = useAppStore((state) => state.update);
  // Assets
  const [url, setUrl] = useState<string>();
  const [file, setFile] = useState<Asset>();
  const assets = useAssetStore((state) => state.assets);

  // Aspect Ratio
  const [aspectRatio, setAspecRatio] = useState(16 / 9);

  // YJS
  const setYDoc = useStore((s: any) => s.setYDoc);

  // Local State
  const [paused, setPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [loop, setLoop] = useState(false);

  // Html Ref
  const videoRef = useRef<HTMLVideoElement>(null);

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
  }, [file, videoRef]);

  useEffect(() => {
    // Setup Yjs stuff
    let provider: WebsocketProvider | null = null;
    let ydoc: Y.Doc | null = null;
    // A Yjs document holds the shared data
    ydoc = new Y.Doc();

    // WS Provider
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    provider = new WebsocketProvider(`${protocol}://${window.location.host}/yjs`, props._id, ydoc);

    // Define a shared text type on the document
    const videoDoc = ydoc.getMap<any>('video');

    videoDoc.observe((ymapEvent) => {
      // Find out what changed:
      // Option 1: A set of keys that changed
      ymapEvent.keysChanged; // => Set<strings>
      // Option 2: Compute the differences
      ymapEvent.changes.keys; // => Map<string, { action: 'add'|'update'|'delete', oldValue: any}>

      // sample code.
      ymapEvent.changes.keys.forEach((change, key) => {
        if (change.action === 'update') {
          if (key === 'paused') {
            setPaused(videoDoc.get('paused'));
          }
          if (key === 'currentTime') {
            setCurrentTime(videoDoc.get('currentTime'));
          }
          if (key === 'loop') {
            setLoop(videoDoc.get('loop'));
          }
        }
      });
    });

    // Save the instance for the toolbar
    setYDoc(props._id, videoDoc);

    // Sync state with sage when a user connects and is the only one present
    provider.on('sync', () => {
      if (provider) {
        const users = provider.awareness.getStates();
        const count = users.size;

        // Get Yjs state
        const p = videoDoc.get('paused');
        const ct = videoDoc.get('currentTime');
        const l = videoDoc.get('loop');

        // If only user present, sync state with sagebase
        if (count === 1 && videoDoc) {
          videoDoc.set('currentTime', s.currentTime);
          videoDoc.set('paused', s.paused);
          videoDoc.set('loop', s.loop);
          setCurrentTime(s.currentTime);
          setPaused(s.paused);
          setLoop(s.loop);
        } else {
          // If not the only one present, sync with YDoc
          setCurrentTime(ct);
          setPaused(p);
          setLoop(l);
        }
      }
    });

    return () => {
      // Remove the bindings and disconnect the provider
      if (ydoc) ydoc.destroy();
      if (provider) provider.disconnect();
    };
  }, []);

  // Set pause state of the video
  useEffect(() => {
    if (videoRef.current) {
      if (paused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [paused]);

  // Set time of video
  useEffect(() => {
    if (videoRef.current) {
      if (Math.abs(videoRef.current.currentTime - currentTime) > 4) {
        videoRef.current.currentTime = currentTime;
      }
    }
  }, [currentTime]);

  // Set loop state of video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.loop = loop;
    }
  }, [loop]);

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
        <video ref={videoRef} id={`${props._id}-video`} src={url} height="100%" width="100%" muted={true}></video>
      </div>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const videoDoc: Y.Map<any> = useStore((state: any) => state.editor[props._id]);
  const updateState = useAppStore((state) => state.updateState);

  // Stores
  const assets = useAssetStore((state) => state.assets);

  // React State
  const [videoRef, setVideoRef] = useState<HTMLVideoElement>();
  const [file, setFile] = useState<Asset>();
  const [sliderTime, setSliderTime] = useState<number | null>(null);

  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timer | null = null;
    const obtainVideoRef = () => {
      const video = document.getElementById(`${props._id}-video`) as HTMLVideoElement;
      if (video) {
        setVideoRef(video);
        if (interval) clearInterval(interval);
      }
    };
    interval = setInterval(obtainVideoRef, 500);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timer | null = null;
    const setTime = () => {
      if (videoRef) {
        setCurrentTime(videoRef.currentTime);
      }
    };
    interval = setInterval(setTime, 500);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [videoRef]);

  // Obtain the asset for download functionality
  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.assetid);
    if (myasset) {
      setFile(myasset);
    }
  }, [s.assetid, assets]);

  // Handle a play action
  const handlePlay = () => {
    if (videoRef) {
      const paused = !videoDoc.get('paused');
      const time = videoRef.currentTime;
      videoDoc.set('paused', paused);
      videoDoc.set('currentTime', time);
      updateState(props._id, { currentTime: time });
      updateState(props._id, { paused: paused });
    }
  };

  // Handle a rewind action
  const handleRewind = () => {
    if (videoRef) {
      const time = Math.min(videoRef.duration, videoRef.currentTime - 5);
      videoDoc.set('currentTime', time);
      updateState(props._id, { currentTime: time });
    }
  };

  // Handle a forward action
  const handleForward = () => {
    if (videoRef) {
      const time = Math.min(videoRef.duration, videoRef.currentTime + 5);
      videoDoc.set('currentTime', time);
      updateState(props._id, { currentTime: time });
    }
  };

  // Handle a forward action
  const handleLoop = () => {
    if (videoRef) {
      const loop = !videoDoc.get('loop');
      videoDoc.set('loop', loop);
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
      // const url = file?.data.file;
      const filename = file.data.originalfilename;
      const extras = file.data.derived as ExtraImageType;
      const video_url = extras.url;
      downloadFile(video_url, filename);
    }
  };

  // Handle user moving slider
  const seekStartHandle = (value: number) => {
    if (videoRef) {
      videoRef.currentTime = value;
      setSliderTime(value);
    }
  };
  // Handle user moving slider
  const seekChangeHandle = (value: number) => {
    if (videoRef) {
      videoRef.currentTime = value;
      setSliderTime(value);
    }
  };

  // Handle user moving slider
  const seekEndHandle = (value: number) => {
    if (videoRef) {
      videoRef.currentTime = value;
      videoDoc.set('currentTime', value);
      updateState(props._id, { currentTime: value });
      setCurrentTime(value);
      setSliderTime(null);
    }
  };

  const handleSync = () => {
    if (videoRef) {
      videoDoc.set('currentTime', videoRef.currentTime);
      videoDoc.set('paused', videoRef.paused);
      videoDoc.set('loop', videoRef.loop);
    }
  };

  return (
    <>
      {!videoRef ? (
        <>Loading...</>
      ) : (
        <>
          {/* App State with server */}
          <ButtonGroup isAttached size="xs" colorScheme="green" mr={1}>
            <Tooltip placement="top-start" hasArrow={true} label={'Rewind 5 Seconds'} openDelay={400}>
              <Button onClick={handleRewind} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
                <MdFastRewind />
              </Button>
            </Tooltip>

            <Tooltip placement="top-start" hasArrow={true} label={videoRef.paused ? 'Play Video' : 'Pause Video'} openDelay={400}>
              <Button onClick={handlePlay} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
                {videoRef.paused ? <MdPlayArrow /> : <MdPause />}
              </Button>
            </Tooltip>

            <Tooltip placement="top-start" hasArrow={true} label={'Forward 5 Seconds'} openDelay={400}>
              <Button onClick={handleForward} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
                <MdFastForward />
              </Button>
            </Tooltip>
          </ButtonGroup>

          <ButtonGroup isAttached size="xs" colorScheme="green" mx={1}>
            <Tooltip placement="top-start" hasArrow={true} label={'Loop'} openDelay={400}>
              <Button onClick={handleLoop} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
                {videoRef.loop ? <MdLoop /> : <MdArrowRightAlt />}
              </Button>
            </Tooltip>
            <Tooltip placement="top-start" hasArrow={true} label={'Resync'} openDelay={400}>
              <Button onClick={handleSync} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
                <MdAccessTime />
              </Button>
            </Tooltip>
          </ButtonGroup>

          <Slider
            aria-label="slider-ex-4"
            value={sliderTime ? sliderTime : currentTime}
            max={videoRef.duration}
            width="150px"
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
            <SliderMark value={videoRef.duration} fontSize="xs" mt="1.5" ml="-5">
              {getDurationString(videoRef.duration)}
            </SliderMark>
            <SliderMark
              value={sliderTime ? sliderTime : currentTime}
              textAlign="center"
              bg="green.500"
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
              <Box
                color="green.500"
                as={MdGraphicEq}
                transition={'all 0.2s'}
                _hover={{ opacity: 0.7, transform: 'scaleY(1.3)', color: 'green.300' }}
              />
            </SliderThumb>
          </Slider>

          {/* Local State Buttons - Only Changes the video state for the local user */}
          <ButtonGroup isAttached size="xs" colorScheme={'teal'} mx={1}>
            <Tooltip placement="top-start" hasArrow={true} label={videoRef.muted ? 'Unmute' : 'Mute'} openDelay={400}>
              <Button onClick={handleMute} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
                {videoRef.muted ? <MdVolumeOff /> : <MdVolumeUp />}
              </Button>
            </Tooltip>
            <Tooltip placement="top-start" hasArrow={true} label={'Download Video'} openDelay={400}>
              <Button onClick={handleDownload} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} disabled={!videoRef}>
                <MdFileDownload />
              </Button>
            </Tooltip>
          </ButtonGroup>
        </>
      )}
    </>
  );
}

export default { AppComponent, ToolbarComponent };
