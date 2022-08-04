/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore, useTwilioStore, useUser } from '@sage3/frontend';
import { useEffect } from 'react';

export function Twilio(props: { roomName: string }) {
  // User information
  const { user } = useUser();
  const apps = useAppStore((state) => state.apps);
  const twilioApps = apps.filter((el) => el.data.type === 'Webcam' || el.data.type === 'Screenshare');

  // Twilio Store to join and leave room when joining board
  const joinTwilioRoom = useTwilioStore((state) => state.joinRoom);
  const leaveTwilioRoom = useTwilioStore((state) => state.leaveRoom);
  const room = useTwilioStore((state) => state.room);

  //TWILIO STUFF
  // I need to do it out here to detect if an app closes to close the stream attached to it.
  // It kinda of a hacky way to do it, but it works.
  const userStreamIds: string[] = [];
  twilioApps.forEach((el) => {
    if (el._createdBy === user?._id) {
      const s = el.data.state as any;
      userStreamIds.push(s.videoId, s.audioId);
    }
  });

  useEffect(() => {
    return () => {
      // Remove track so user's video doesn't continuosly play
      room?.localParticipant.tracks.forEach((publication: any) => {
        if (userStreamIds.indexOf(publication.trackName) === -1) {
          publication.unpublish();
          publication.track.stop();
        }
      });
    };
  }, [userStreamIds, room]);

  // Handle joining and leaving twilio room when entering board
  useEffect(() => {
    // Join Twilio room
    if (user) {
      joinTwilioRoom(user?._id, props.roomName);
    }

    // Uncmounting
    return () => {
      // Leave twilio room
      leaveTwilioRoom();
    };
  }, [twilioApps.length]);

  return null;
}
