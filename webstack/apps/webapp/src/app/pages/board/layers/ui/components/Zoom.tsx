/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useUser, useZoomStore } from '@sage3/frontend';
import { useEffect } from 'react';

export function Zoom(props: { sessionId: string; connect: boolean }) {
  // User information
  const { user, accessId } = useUser();

  // Twilio Store to join and leave room when joining board
  const { joinRoom, leaveRoom } = useZoomStore((state) => state);

  // Handle joining and leaving Zoom room when entering board
  useEffect(() => {
    // Join Twilio room
    if (user && props.connect) {
      joinRoom(user._id, props.sessionId);
    }
    // Uncmounting
    return () => {
      // Leave Zoom room
      leaveRoom();
    };
  }, []);

  // Handle joining and leaving Zoom room when props.connect changes
  useEffect(() => {
    if (user && props.connect) {
      joinRoom(user?._id, props.sessionId);
    } else {
      leaveRoom();
    }
  }, [props.connect]);

  return null;
}
