/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React and Chakra Imports
import { useEffect, useState } from 'react';
import { Box, Button, Divider, Text, useColorModeValue } from '@chakra-ui/react';
import { MdPerson } from 'react-icons/md';

// SAGE3 Imports
import { App } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';
import { useAppStore, useHexColor, useUIStore, useUser, useUsersStore } from '@sage3/frontend';

// Props for the ScreensharesMenu component
interface ScreensharesMenuProps {
  roomId: string;
  boardId: string;
}

/**
 * A Board UI Component that is a drop down list of available screenshares on the board.
 * Will show a list of users that are currently screensharing.
 * When a user is selected, the user's view will shift to the screenshare's location.
 * The user can also start and stop his own screenshare.
 */
export function ScreenshareMenu(props: ScreensharesMenuProps) {
  // Stores (Users, Apps, UI)
  const { user, accessId } = useUser();
  const uid = user?._id;
  const users = useUsersStore((state) => state.users);
  const apps = useAppStore((state) => state.apps);
  const deleteApp = useAppStore((state) => state.delete);
  const createApp = useAppStore((state) => state.create);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);
  const goToApp = useUIStore((state) => state.fitApps);

  // Local State
  const [screenshares, setScreenshares] = useState<App[]>([]);
  const [yourScreenshare, setYourScreenshare] = useState<App | null>(null);

  // Color
  const bgHoverColor = useColorModeValue('gray.100', 'gray.600');
  const bgHoverHexColor = useHexColor(bgHoverColor);

  // Use effect that tracks the lenght of the apps array and updates the screenshares state
  useEffect(() => {
    setScreenshares(apps.filter((app) => app.data.type === 'Screenshare'));
    const yourScreenshare = apps.find((app) => app.data.type === 'Screenshare' && app._createdBy === user?._id);
    yourScreenshare ? setYourScreenshare(yourScreenshare) : setYourScreenshare(null);
  }, [apps.length]);

  // Function that handles the user going to the specfied screenshare app
  const handleGoToApp = (selectedApp: App) => {
    const goToScreenshare = apps.find((app) => selectedApp._id == app._id);
    if (goToScreenshare) {
      goToApp([goToScreenshare]);
    }
  };

  // Stop your Screenshare
  const stopYourScreenshare = () => {
    if (yourScreenshare) {
      deleteApp(yourScreenshare?._id);
    }
  };

  // Start your screenshare
  const startYourScreenshare = () => {
    if (!user) return;
    const width = 1280;
    const height = 720;
    const size = { height, width, depth: 0 };
    const x = Math.floor(-boardPosition.x + window.innerWidth / 2 / scale - height / 2);
    const y = Math.floor(-boardPosition.y + window.innerHeight / 2 / scale - width / 2);
    const position = { x, y, z: 0 };
    createApp({
      title: 'Screenshare by ' + user.data.name,
      roomId: props.roomId,
      boardId: props.boardId,
      position,
      size,
      rotation: { x: 0, y: 0, z: 0 },
      type: 'Screenshare',
      state: { ...(initialValues['Screenshare'] as any), accessId },
      raised: true,
      dragging: false,
      pinned: false,
    });
  };

  // Handle starting and stopping your screenshare
  const handleStartStop = () => {
    if (yourScreenshare) {
      stopYourScreenshare();
    } else {
      startYourScreenshare();
    }
  };

  return (
    <Box maxHeight="60vh" overflowY={'auto'} overflowX="clip" width="200px">
      {screenshares.map((app) => {
        const user = users.find((u) => u._id === app._createdBy);
        if (!user) return null;
        const userName = user.data.name;
        const trimName = userName.substring(0, 14);
        const color = user.data.color;
        const yours = app._createdBy === uid;
        return (
          <Box
            display="flex"
            justifyContent="left"
            gap="2"
            my="1"
            key={app._id}
            onClick={() => handleGoToApp(app)}
            _hover={{ cursor: 'pointer', bg: bgHoverHexColor }}
            transition="background-color 0.4s"
            p="2"
            borderRadius="md"
            height="24px"
            alignItems={'center'}
          >
            <MdPerson size="16px" />
            <Text fontSize="14px">
              {trimName} {yours ? '(Yours)' : ''}
            </Text>
          </Box>
        );
      })}
      {screenshares.length === 0 && (
        <Text ml="6px" cursor="default">
          No Screenshares
        </Text>
      )}
      <Divider my="2" />
      <Button onClick={() => handleStartStop()} py="1px" m="0" width="100%" size="xs" colorScheme={yourScreenshare ? 'red' : 'green'}>
        {yourScreenshare == null ? 'Start' : 'Stop'} Sharing
      </Button>
    </Box>
  );
}
