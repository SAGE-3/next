/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore, useUIStore, useUser } from '@sage3/frontend';
import { Button, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { useCallback, useEffect, useRef, useState } from 'react';

import { LocalVideoTrack, LocalTrackOptions, createLocalVideoTrack, TrackPublication, Track, RemoteVideoTrack, createLocalTracks, CreateLocalTrackOptions, CreateLocalTracksOptions } from 'twilio-video';
import { useTwilioStore } from './store';
import { genId } from '@sage3/shared';





/* App component for Twilio */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // Current User
  const { user } = useUser();

  // Twilio Store
  const room = useTwilioStore(state => state.room);
  const joinRoom = useTwilioStore(state => state.joinRoom);
  const tracks = useTwilioStore(state => state.tracks);
  const twilioRoomName = props.data.boardId;

  // Video HTML Ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (user) {
      joinRoom(user?._id, twilioRoomName);
    }
  }, [user]);


  useEffect(() => {
    console.log('tracks', tracks);
    tracks.forEach(track => {
      console.log(track.name, s.videoId, s.audioId);
      if (track.name === s.videoId && videoRef.current) {
        track.attach(videoRef.current);
      }
      if (track.name === s.audioId && audioRef.current) {
        track.attach(audioRef.current);
      }
    });

    return () => {
      room?.localParticipant.tracks.forEach(track => {
        if (track.trackName === s.videoId || track.trackName === s.audioId) {
          console.log(track.trackName)
          track.unpublish();
        }
      });
    }
  }, [tracks, s.videoId, s.audioId])

  return (
    <AppWindow app={props}>
      <>
        <video ref={videoRef} className="video-container" width="100%" height="100%"></video>
        <audio ref={audioRef} className="audio-container"></audio>
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app Twilio */

function ToolbarComponent(props: App): JSX.Element {

  const updateState = useAppStore(state => state.updateState);

  // Current User
  const { user } = useUser();
  // Twilio Store
  const room = useTwilioStore(state => state.room);

  const [videoSources, setVideoSources] = useState<InputDeviceInfo[]>([]);
  const [audioSoruces, setAudioSources] = useState<InputDeviceInfo[]>([]);
  const [selectedVideoSource, setSelectedVideoSource] = useState<InputDeviceInfo>();
  const [selectedAudioSource, setSelectedAudioSource] = useState<InputDeviceInfo>();

  const handleSelectVideoSource = useCallback((source: InputDeviceInfo) => {
    setSelectedVideoSource(source);
    shareWebcam();
  }, [selectedVideoSource])

  const handleSelectAudioSource = useCallback((source: InputDeviceInfo) => {
    setSelectedAudioSource(source);
    shareWebcam();
  }, [setSelectedAudioSource])

  useEffect(() => {
    async function getDevices() {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter(d => d.kind === 'videoinput');
      const audios = devices.filter(d => d.kind === 'audioinput');
      setVideoSources(videos);
      setAudioSources(audios);
      setSelectedVideoSource(videos[0]);
      setSelectedAudioSource(audios[0]);
    }
    getDevices();
  }, [])

  const shareWebcam = useCallback(async () => {
    if (room && selectedAudioSource && selectedVideoSource) {
      const videoId = genId();
      const audioId = genId();

      await updateState(props._id, { videoId, audioId });

      const constraints = {
        audio: { deviceId: selectedAudioSource.deviceId, name: audioId },
        video: { deviceId: selectedVideoSource.deviceId, name: videoId }
      };
      // const stream = await createLocalVideoTrack({ ...constraints.video, name: id });
      const tracks = await createLocalTracks({ ...constraints } as CreateLocalTracksOptions);
      room.localParticipant.publishTracks(tracks);
    }
  }, [room, selectedAudioSource, selectedVideoSource])

  const shareScreen = useCallback(async () => {
    if (room) {
      const videoId = genId();
      await updateState(props._id, { videoId });
      room.localParticipant.tracks.forEach(track => console.log('track', track))
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 } });
      const screenTrack = new LocalVideoTrack(stream.getTracks()[0], { name: videoId, logLevel: 'off' });
      room.localParticipant.publishTrack(screenTrack);
    }
  }, [room, selectedAudioSource, selectedVideoSource])


  return (
    <>
      {user?._id === props._createdBy ?
        <>
          <Button colorScheme="green" onClick={shareWebcam} disabled={!room || !selectedAudioSource || !selectedVideoSource}>Share Webcam</Button>
          <Button colorScheme="green" onClick={shareScreen} disabled={!room}>Share Screen</Button>
          <Menu>
            <MenuButton as={Button}>
              Camera
            </MenuButton>
            <MenuList>
              {videoSources.map(source =>
                <MenuItem key={source.deviceId}
                  color={(source.deviceId === selectedVideoSource?.deviceId) ? 'green' : 'red'}
                  onClick={() => handleSelectVideoSource(source)}>
                  {source.label}
                </MenuItem>
              )}
            </MenuList>
          </Menu>
          <Menu>
            <MenuButton as={Button}>
              Microphone
            </MenuButton>
            <MenuList>
              {audioSoruces.map(source =>
                <MenuItem key={source.deviceId}
                  color={(source === selectedAudioSource) ? 'green' : 'red'}
                  onClick={() => handleSelectAudioSource(source)}>
                  {source.label}
                </MenuItem>
              )}
            </MenuList>
          </Menu>
        </> : null}
    </>
  );
}

export default { AppComponent, ToolbarComponent };
