/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Button, Text, Avatar } from '@chakra-ui/react';
import { useUser, initials, useAppStore } from '@sage3/frontend';
import { useNavigate } from 'react-router';
import { sageColorByName } from '@sage3/shared';
import { AvatarGroup } from './AvatarGroup';
import { Twilio } from './Twilio';

type HeaderProps = {
  boardId: string;
  boardName: string;
};

/**
 * Header component
 *
 * @export
 * @param {HeaderProps} props
 * @returns
 */
export function BoardHeader(props: HeaderProps) {
  // User information
  const { user } = useUser();
  const navigate = useNavigate();

  // Redirect the user back to the homepage when he clicks the green button in the top left corner
  function handleHomeClick() {
    navigate('/home');
  }

  // Apps
  const apps = useAppStore((state) => state.apps);
  const twilioConnect = apps.filter(el => el.data.type === 'Screenshare').length > 0;

  return (
    <Box
      display="flex"
      pointerEvents={'none'}
      justifyContent="space-between"
      alignItems="center"
      p={2}
      position="absolute"
      top="0"
      width="100%"
    >
      <Box display="flex" alignItems="center">
        {/* Home Button */}
        <Button pointerEvents={'all'} colorScheme="green" onClick={handleHomeClick}>
          Home
        </Button>
        {/*Twilio*/}
        <Twilio roomName={props.boardId} connect={twilioConnect}/>
      </Box>

      {/* Board Name */}
      <Text fontSize="2xl" background="teal" px={6} borderRadius="4" color="white">
        {props.boardName}
      </Text>

      <Box display="flex" alignItems="center">
        {/* Avatar Group */}
        <AvatarGroup boardId={props.boardId} />

        {/* User Avatar */}
        <Avatar
          size="md"
          pointerEvents={'all'}
          name={user?.data.name}
          getInitials={initials}
          backgroundColor={user ? sageColorByName(user.data.color) : ''}
          color="white"
          mx={1}
        />
      </Box>
    </Box>
  );
}
