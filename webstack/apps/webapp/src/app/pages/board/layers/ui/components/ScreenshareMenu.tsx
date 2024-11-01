/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React and Chakra Imports
import { useEffect, useState } from 'react';
import { Badge, Button, Menu, MenuButton, MenuGroup, MenuItem, MenuList, Text, Tooltip } from '@chakra-ui/react';
import { MdPerson, MdPlayArrow, MdStop } from 'react-icons/md';

// SAGE3 Imports
import { initialValues } from '@sage3/applications/initialValues';
import { App } from '@sage3/applications/schema';
import { useAppStore, useUIStore, useUser, useUsersStore } from '@sage3/frontend';

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
  const startScreenshare = () => {
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

  return (
    <Menu>
      <Tooltip label="List of current screenshares" aria-label="Screenshares" placement="top" hasArrow={true} openDelay={400}>
        <MenuButton
          as={Button} size="sm"
          maxWidth="150px"
          variant={'solid'}
          colorScheme='gray'
          sx={{
            _dark: {
              bg: 'gray.600', // 'inherit' didnt seem to work
            },
          }}
        >
          Screenshares
          <Badge ml="1" colorScheme={screenshares.length > 0 ? user!.data.color : 'gray'}>
            {screenshares.length}
          </Badge>
        </MenuButton>
      </Tooltip>
      <MenuList maxHeight="60vh" overflowY={'auto'} overflowX="clip" width={'100%'} p="2px" m="0">
        <MenuGroup title="Screenshares" cursor="default" p="0" m="1">
          {screenshares.map((app) => {
            const userName = users.find((u) => u._id === app._createdBy)?.data.name;
            const yours = app._createdBy === user?._id;
            return yours ? (
              <MenuItem py="1px" m="0" icon={<MdPerson size="24px" />} justifyContent="right"
                key={app._id} onClick={() => handleGoToApp(app)} >
                {userName} (Yours)
              </MenuItem>
            ) : (
              <MenuItem py="1px" m="0" icon={<MdPerson size="24px" />} justifyContent="right"
                key={app._id} onClick={() => handleGoToApp(app)} >
                {userName}
              </MenuItem>
            );
          })}
          {screenshares.length === 0 && (
            <Text ml="18px" cursor="default">
              No Screenshares
            </Text>
          )}
        </MenuGroup>
        <MenuGroup title="Actions" cursor="default" m="1">
          {/* py="1px" m="0"> */}
          <MenuItem onClick={() => startScreenshare()} icon={<MdPlayArrow fontSize="24px" />} isDisabled={yourScreenshare !== null} py="1px" m="0">
            Start Sharing
          </MenuItem>
          <MenuItem onClick={() => stopYourScreenshare()} icon={<MdStop fontSize="24px" />} isDisabled={yourScreenshare == null} py="1px" m="0">
            Stop Sharing
          </MenuItem>
        </MenuGroup>
      </MenuList>
    </Menu >
  );
}
