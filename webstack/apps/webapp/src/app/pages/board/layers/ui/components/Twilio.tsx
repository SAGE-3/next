/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useTwilioStore, useUser } from '@sage3/frontend';
import { useEffect } from 'react';

export function Twilio(props: { roomName: string; connect: boolean }) {
  // User information
  const { user, accessId } = useUser();

  // Twilio Store to join and leave room when joining board
  const joinRoom = useTwilioStore((state) => state.joinRoom);
  const leaveRoom = useTwilioStore((state) => state.leaveRoom);

  // Handle joining and leaving twilio room when entering board
  useEffect(() => {
    // Join Twilio room
    if (user && props.connect) {
      joinRoom(user._id, accessId, props.roomName);
    }
    // Uncmounting
    return () => {
      // Leave twilio room
      leaveRoom();
    };
  }, []);

  // Handle joining and leaving twilio room when props.connect changes
  useEffect(() => {
    if (user && props.connect) {
      joinRoom(user?._id, accessId, props.roomName);
    } else {
      leaveRoom();
    }
  }, [props.connect]);

  return null;
}
