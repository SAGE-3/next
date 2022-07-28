/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore, useUIStore, useUser } from '@sage3/frontend';
import { Button } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { useCallback, useEffect, useRef, useState } from 'react';

import { connect, createLocalTracks, Room, LocalVideoTrack } from 'twilio-video';


async function fetchToken(userId: string, roomName: string) {
  const reponse = await fetch(`/twilio/token?identity=${userId}&room=${roomName}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const { token } = await reponse.json();
  return token;
}

/* App component for Twilio */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const twilioRoomName = props.data.boardId + '-' + props._createdBy;

  // Current User
  const { user } = useUser();

  // Token
  const [token, setToken] = useState<string | null>(null);

  // Twilio Room
  const [room, setRoom] = useState<Room | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  function shareWebcam() {
    if (token && room === null) {
      // Option 1
      navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      }).then((mediaStream) => {
        return connect(token, {
          name: twilioRoomName,
          tracks: mediaStream.getTracks()
        });
      }).then(room => {
        console.log(`Connected to Room: ${room.name}`);
        setRoom(room)
      }, error => {
        console.error(`Unable to connect to Room: ${error.message}`);
        setRoom(null);
      });
    }
  }

  function shareScreen() {
    if (token && room === null) {
      navigator.mediaDevices.getDisplayMedia().then(stream => {
        const screenTrack = new LocalVideoTrack(stream.getTracks()[0]);
        return connect(token, {
          name: twilioRoomName,
          tracks: [screenTrack]
        });
      }).then(room => {
        console.log(`Connected to Room: ${room.name}`);
        setRoom(room)
      }, error => {
        console.error(`Unable to connect to Room: ${error.message}`);
        setRoom(null);
      });
    }
  }

  function joinRoom() {
    if (token && room === null) {
      connect(token, { name: twilioRoomName }).then(room => {
        console.log(`Successfully joined a Room: ${room}`);
        // Log any Participants already connected to the Room
        room.participants.forEach(participant => {
          console.log(`Participant "${participant.identity}" is connected to the Room`);
          participant.tracks.forEach((publication: any) => {
            if (publication.track) {
              publication.track.attach(videoRef.current);
            }
          });

          participant.on('trackSubscribed', (track: any) => {
            track.attach(videoRef.current);
          });
        });

        // Log new Participants as they connect to the Room
        room.once('participantConnected', participant => {
          console.log(`Participant "${participant.identity}" has connected to the Room`);

          participant.tracks.forEach((publication: any) => {
            if (publication.isSubscribed) {
              const track = publication.track;
              publication.track.attach(videoRef.current);
            }
          });

          participant.on('trackSubscribed', (track: any) => {
            track.attach(videoRef.current);
          });
        });


        // Log Participants as they disconnect from the Room
        room.once('participantDisconnected', participant => {
          console.log(`Participant "${participant.identity}" has disconnected from the Room`);
        });
      }, error => {
        console.error(`Unable to connect to Room: ${error.message}`);
      });
    }
  }

  useEffect(() => {
    async function getToken(userId: string, roomName: string) {
      const token = await fetchToken(userId, roomName);
      setToken(token);
    }
    if (user && token === null) {
      getToken(user._id, twilioRoomName);
    }
  }, [token]);


  useEffect(() => {
    if (user && user._id !== props._createdBy && token !== null) {
      joinRoom();
    }
  }, [token]);

  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
        console.log('disconnected from room: ', room.name);
      }
    }
  }, [room]);

  return (
    <AppWindow app={props}>
      <>
        <video ref={videoRef} className="video-container"></video>
        {user?._id === props._createdBy ?
          <>
            <Button colorScheme="green" onClick={shareWebcam}>Share Webcam</Button>
            <Button colorScheme="green" onClick={shareScreen}>Share Screen</Button>
          </> : null}
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app Twilio */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
      <Button colorScheme="green">Action</Button>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
