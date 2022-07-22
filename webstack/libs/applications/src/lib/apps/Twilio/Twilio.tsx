/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore, useUser } from '@sage3/frontend';
import { Button, getToken } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { useCallback, useEffect, useRef, useState } from 'react';

import { connect, createLocalTracks } from 'twilio-video';

/* App component for Twilio */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);
  const { user } = useUser();

  const [localToken, setToken] = useState(s.twilioRoomId);

  const [tracks, setTracks] = useState<any[]>([]);

  const [room, setRoom] = useState<any>();
  const [track, setTrack] = useState<any>();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function getToken() {
      const roomname = 'room-1';
      const reponse = await fetch(`/twilio/token?identity=${user?._id}&room=${roomname}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      const { token } = await reponse.json();
      setToken(token);

      if (user && props._updatedBy === user._id) {
        connect(token, {
          audio: true,
          name: roomname,
          video: { width: 640 },
        }).then((room) => {
          console.log(`Owner Connected to Room: ${room.name}`);
        });
      } else {
        connect(token, {
          audio: false,
          name: roomname,
        }).then((room) => {
          console.log(`Viewer Connected to Room: ${room.name}`);

          // Attach the Participant's Media to a <div> element.
          room.on('participantConnected', (participant) => {
            console.log(`Participant "${participant.identity}" connected`);

            participant.tracks.forEach((publication: any) => {
              if (publication.isSubscribed) {
                const track = publication.track;
                if (track) {
                  track.attach(videoRef.current);
                }
              }
            });

            participant.on('trackSubscribed', (track: any) => {
              if (track) {
                track.attach(videoRef.current);
              }
            });
          });

          room.participants.forEach((participant) => {
            participant.tracks.forEach((publication: any) => {
              if (publication.track) {
                publication.track.attach(videoRef.current);
              }
            });

            participant.on('trackSubscribed', (track: any) => {
              if (track) {
                track.attach(videoRef.current);
              }
            });
          });
        });
      }
    }
    getToken();
  }, []);

  return (
    <AppWindow app={props}>
      <>
        <video ref={videoRef} className="video-container"></video>
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
