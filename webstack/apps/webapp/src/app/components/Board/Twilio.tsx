/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Icon, Tooltip } from '@chakra-ui/react';
import { useAppStore, useTwilioStore, useUser } from '@sage3/frontend';
import { useEffect } from 'react';

import { SiTwilio } from 'react-icons/si';

export function Twilio(props: { roomName: string }) {
  
  // User information
  const { user } = useUser();

  // Twilio Store to join and leave room when joining board
  const room = useTwilioStore((state) => state.room);
  const joinTwilioRoom = useTwilioStore((state) => state.joinRoom);
  const leaveTwilioRoom = useTwilioStore((state) => state.leaveRoom);


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
  }, []); // Observe the length of the apps array

  return (
    <Tooltip pointerEvents={'all'} label={room ? 'Twilio Connected' : 'Twilio Connection Error'}>
      <Box pointerEvents={'all'} mx={1}>
        <Icon fontSize="2rem" color={room ? 'green' : 'red'} as={SiTwilio} />
      </Box>
    </Tooltip>
  );
}
