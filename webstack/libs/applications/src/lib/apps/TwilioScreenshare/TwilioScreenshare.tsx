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

// SAGE imports
import { useAppStore, useUser, useTwilioStore } from '@sage3/frontend';
import { genId } from '@sage3/shared';

// Chakra and React imports
import { Button } from '@chakra-ui/react';
import { useCallback, useEffect, useRef } from 'react';

// Twilio Imports
import { LocalVideoTrack } from 'twilio-video';

// Icons
import { MdScreenShare } from 'react-icons/md';

/* App component for Twilio */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // Twilio Store
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
  }, [tracks, s.videoId]);

  useEffect(() => {
    if (user?._id === props._createdBy) {
      streams.forEach((stream) => {
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

  const addStream = useTwilioStore((state) => state.addStream);
  const removeStream = useTwilioStore((state) => state.removeStream);

  // Sharescreen function
  const shareScreen = useCallback(async () => {
    const videoId = genId();
    if (room) {
      await updateState(props._id, { videoId });
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 } });
      addStream(videoId, stream);
      const screenTrack = new LocalVideoTrack(stream.getTracks()[0], { name: videoId, logLevel: 'off' });
      room.localParticipant.publishTrack(screenTrack);
    }
    return () => {
      removeStream(videoId);
    };
  }, [room]);

  return (
    <>
      {user?._id === props._createdBy ? (
        <>
          <Button colorScheme="green" onClick={shareScreen} disabled={!room} mx={1} rightIcon={<MdScreenShare />}>
            Share
          </Button>
        </>
      ) : null}
    </>
  );
}

export default { AppComponent, ToolbarComponent };
