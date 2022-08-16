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
import { Box, Button } from '@chakra-ui/react';
import { useEffect, useRef } from 'react';

// Twilio Imports
import { LocalVideoTrack } from 'twilio-video';

// Icons
import { MdScreenShare } from 'react-icons/md';


/* App component for Twilio */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // Current User
  const { user } = useUser();

  // Twilio Store
  const room = useTwilioStore((state) => state.room);
  const tracks = useTwilioStore((state) => state.tracks);

  // App Store
  const updateState = useAppStore((state) => state.updateState);

  // Video and HTML Ref
  const videoRef = useRef<HTMLVideoElement>(null);

  const shareScreen = async () => {
    stopStream();
    if (room && videoRef.current) {
      
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 } });
      videoRef.current.srcObject = stream;
      videoRef.current.play();

      const videoId = genId();
      const screenTrack = new LocalVideoTrack(stream.getTracks()[0], { name: videoId, logLevel: 'off' });
      room.localParticipant.publishTrack(screenTrack);
      await updateState(props._id, { videoId });
    }
  }

  const stopStream = () => {
    if (room) {
      const videoId = s.videoId;
      console.log(room.localParticipant.tracks);
      const track = Array.from(room.localParticipant.videoTracks.values()).find(el => el.trackName === videoId);
      console.log(track)
      track?.unpublish();
      track?.track.stop();
      updateState(props._id, { videoId: '' });
    }
    if ( videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => {
        console.log('STOP:', track);
        track.stop();
      });
      videoRef.current.srcObject = null;
    }
  }

  useEffect(() => {
    if (user?._id === props._createdBy) return;
    tracks.forEach((track) => {
      if (track.name === s.videoId && videoRef.current) {
        track.attach(videoRef.current);
      }
    });
  }, [tracks, s.videoId]);

  useEffect(() => {
    stopStream();
    return () => {
      stopStream();
    }
  }, [])

  return (
    <AppWindow app={props}>
      <>
        <Box display="flex" flexDir="column">
          <Box backgroundColor="black" height={props.data.size.height - 50 + 'px'}>
            <video ref={videoRef} className="video-container" width="100%" height="100%"></video>
          </Box>

          <Box backgroundColor="gray" display="flex" justifyContent="center" height="50px" p="5px">
            {user?._id === props._createdBy ? (
                <Button 
                colorScheme={(videoRef.current?.srcObject) ? 'red' : 'green'} 
                onClick={(videoRef.current?.srcObject) ? stopStream : shareScreen} 
                disabled={!room} 
                mx={1} 
                rightIcon={<MdScreenShare />}
                >
                  {videoRef.current?.srcObject ? 'Stop Sharing' : 'Share Screen'}
                </Button>         
            ) : (
              <p>
                {props._createdBy} - {s.videoId}
              </p>
            )}
          </Box>
        </Box>
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app Twilio */

function ToolbarComponent(props: App): JSX.Element {
  return <></>;
}

export default { AppComponent, ToolbarComponent };
