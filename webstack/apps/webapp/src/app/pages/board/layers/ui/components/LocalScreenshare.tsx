/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useScreenshareStore, useUser } from '@sage3/frontend';
import { useEffect } from 'react';

export function LocalScreenshare(props: { roomName: string; connect: boolean }) {
  // User information
  const { user, accessId } = useUser();

  // Screenshare Store to join and leave the LiveKit room when joining board
  const joinRoom = useScreenshareStore((state) => state.joinRoom);
  const leaveRoom = useScreenshareStore((state) => state.leaveRoom);

  // Handle joining and leaving the room when entering board
  useEffect(() => {
    // Join LiveKit room (the server derives the identity from the session; only the accessId is sent)
    if (user && props.connect) {
      joinRoom(accessId, props.roomName);
    }
    // Unmounting
    return () => {
      // Leave LiveKit room
      leaveRoom();
    };
  }, []);

  // Handle joining and leaving the room when props.connect changes
  useEffect(() => {
    if (user && props.connect) {
      joinRoom(accessId, props.roomName);
    } else {
      leaveRoom();
    }
  }, [props.connect]);

  return null;
}
