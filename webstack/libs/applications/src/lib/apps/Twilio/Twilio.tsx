/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';

// SAGE imports
import { useAppStore, useUser, useTwilioStore } from '@sage3/frontend';
import { genId } from '@sage3/shared';

// Chakra and React imports
import { Button, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import { useCallback, useEffect, useRef, useState } from 'react';

// Twilio Imports
import { LocalVideoTrack, LocalAudioTrack, createLocalTracks, CreateLocalTracksOptions, createLocalVideoTrack } from 'twilio-video';

// Icons
import { MdScreenShare, MdPhotoCamera, MdExpandMore, MdChevronRight } from 'react-icons/md';

/* App component for Twilio */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // Twilio Store
  const room = useTwilioStore((state) => state.room);
  const tracks = useTwilioStore((state) => state.tracks);
  const streams = useTwilioStore((state) => state.localVideoStreams);

  // Video and HTML Ref
  const videoRef = useRef<HTMLVideoElement>(null);

  // Current User
  const { user } = useUser();

  useEffect(() => {
    tracks.forEach((track) => {
      if (track.name === s.videoId && videoRef.current) {
        track.attach(videoRef.current);
      }
    });
  }, [tracks, s.videoId, s.audioId]);

  useEffect(() => {
    if (user?._id === props._createdBy) {
      streams.forEach(stream => {
        if (stream.id == s.videoId && videoRef.current) {
          videoRef.current.srcObject = stream.stream;
          videoRef.current.muted = true;
          try {
            videoRef.current.play();
          } catch (error) {
            console.log(error);
          }

        }
      });
    }

  }, [streams, s.videoId, videoRef]);

  return (
    <AppWindow app={props}>
      <>
        <video ref={videoRef} className="video-container" width="100%" height="100%"></video>
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app Twilio */

function ToolbarComponent(props: App): JSX.Element {
  const updateState = useAppStore((state) => state.updateState);

  // Current User
  const { user } = useUser();
  // Twilio Store
  const room = useTwilioStore((state) => state.room);

  const [videoSources, setVideoSources] = useState<InputDeviceInfo[]>([]);
  const [audioSoruces, setAudioSources] = useState<InputDeviceInfo[]>([]);
  const [selectedVideoSource, setSelectedVideoSource] = useState<InputDeviceInfo>();
  const [selectedAudioSource, setSelectedAudioSource] = useState<InputDeviceInfo>();

  const [videoType, setVideoType] = useState<'camera' | 'screen' | undefined>(undefined);

  const addStream = useTwilioStore((state) => state.addStream);
  const removeStream = useTwilioStore((state) => state.removeStream);

  const [mute, setMute] = useState(false);

  const handleMute = useCallback(() => {
    setMute(!mute);
    shareWebcam();
  }, [mute, setMute])

  const handleSelectVideoSource = useCallback(
    (source: InputDeviceInfo) => {
      setSelectedVideoSource(source);
      shareWebcam();
    },
    [setSelectedVideoSource, selectedVideoSource]
  );

  const handleSelectAudioSource = useCallback(
    (source: InputDeviceInfo) => {
      setSelectedAudioSource(source);
      shareWebcam();
    },
    [setSelectedAudioSource, selectedAudioSource]
  );

  useEffect(() => {
    async function getDevices() {
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log(devices);
      const videos = devices.filter((d) => d.kind === 'videoinput');
      const audios = devices.filter((d) => d.kind === 'audioinput');
      setVideoSources(videos);
      setAudioSources(audios);
      setSelectedVideoSource(videos[0]);
      setSelectedAudioSource(audios[0]);
    }
    getDevices();
  }, []);

  // Share webcam function
  const shareWebcam = useCallback(async () => {
    if (room && selectedAudioSource && selectedVideoSource) {
      const videoId = genId();
      const audioId = genId();
      await updateState(props._id, { videoId, audioId });
      const constraints = {
        video: { deviceId: selectedVideoSource.deviceId, name: videoId },
      } as any;
      if (!mute) {
        constraints.audio = { deviceId: selectedAudioSource.deviceId, name: audioId };
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      addStream(videoId, mediaStream);
      const tracks = mediaStream.getTracks().map(track =>
        track.kind === 'audio'
          ? new LocalAudioTrack(track, { name: audioId, logLevel: 'off' })
          : new LocalVideoTrack(track, { name: videoId, logLevel: 'off' })
      );
      room.localParticipant.publishTracks(tracks);
      setVideoType('camera');
    }
  }, [room, selectedAudioSource, selectedVideoSource, mute]);

  // Sharescreen function
  const shareScreen = useCallback(async () => {
    const videoId = genId();
    if (room) {
      await updateState(props._id, { videoId });
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 } });
      addStream(videoId, stream);
      const screenTrack = new LocalVideoTrack(stream.getTracks()[0], { name: videoId, logLevel: 'off' });
      room.localParticipant.publishTrack(screenTrack);
      setVideoType('screen');
    }
    return () => {
      removeStream(videoId)
    }
  }, [room, selectedAudioSource, selectedVideoSource]);

  return (
    <>
      {user?._id === props._createdBy ? (
        <>
          <Button colorScheme="green" onClick={shareWebcam} disabled={!room || !selectedAudioSource || !selectedVideoSource} mx={1} rightIcon={<MdPhotoCamera />}>
            Webcam
          </Button>
          {videoType === 'camera' ? (
            <>
              <Menu >
                <MenuButton as={Button} mx={1} colorScheme='blue' rightIcon={<MdExpandMore />}>Video Source</MenuButton>
                <MenuList>
                  {videoSources.map((source) => (
                    <MenuItem
                      key={source.deviceId}
                      icon={(source === selectedVideoSource) ? <MdChevronRight /> : undefined}
                      onClick={() => handleSelectVideoSource(source)}
                    >
                      {source.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
              <Menu >
                <MenuButton as={Button} mx={1} colorScheme='blue' rightIcon={<MdExpandMore />}>Audio Source</MenuButton>
                <MenuList>
                  {audioSoruces.map((source) => (
                    <MenuItem
                      key={source.deviceId}
                      icon={(source === selectedAudioSource) ? <MdChevronRight /> : undefined}
                      onClick={() => handleSelectAudioSource(source)}
                    >
                      {source.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
              <Button onClick={() => handleMute()}>Mute</Button>
            </>
          ) : null}

          <Button colorScheme="green" onClick={shareScreen} disabled={!room} mx={1} rightIcon={<MdScreenShare />}>
            Screenshare
          </Button>

        </>
      ) : null}
    </>
  );
}

export default { AppComponent, ToolbarComponent };
