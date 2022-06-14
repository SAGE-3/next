/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, Select, Text, useDisclosure } from '@chakra-ui/react';

import { Applications, initialValues } from '@sage3/applications/apps';
import { AppName } from '@sage3/applications/schema';
import { useAppStore, useBoardStore, useUserStore, AssetModal } from '@sage3/frontend';
import { sageColorByName } from '@sage3/shared';

type LocationParams = {
  boardId: string;
  roomId: string;
}

export function BoardPage() {

  const location = useLocation();
  const locationState = location.state as LocationParams;
  const navigate = useNavigate();

  const apps = useAppStore((state) => state.apps);
  const createApp = useAppStore((state) => state.create);
  const subBoard = useAppStore((state) => state.subToBoard);
  const unsubBoard = useAppStore((state) => state.unsubToBoard);

  const user = useUserStore((state) => state.user);
  const boards = useBoardStore((state) => state.boards);
  const board = boards.find(el => el.id === locationState.boardId);

  // Asset manager button
  const { isOpen: assetIsOpen, onOpen: assetOnOpen, onClose: assetOnClose } = useDisclosure()

  useEffect(() => {
    subBoard(locationState.boardId);
    return () => {
      unsubBoard();
    }
  }, []);

  function handleHomeClick() {
    navigate('/home');
  }

  const handleNewApp = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const appName = event.target.value as AppName;
    if (!appName) return;
    createApp(
      appName,
      `${appName} - Description`,
      locationState.roomId,
      locationState.boardId,
      { x: 0, y: 0, z: 0 },
      { width: 300, height: 300, depth: 0 },
      { x: 0, y: 0, z: 0 },
      appName,
      initialValues[appName]);
  }

  return (
    <>

      {/* Asset dialog */}
      <AssetModal isOpen={assetIsOpen} onOpen={assetOnOpen} onClose={assetOnClose}></AssetModal>

      {/* Top bar */}
      <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
        <Button colorScheme="green" onClick={handleHomeClick}>Home</Button>
        <Text fontSize="3xl">{board?.name}</Text>
        <Avatar size='md' name={user?.name} backgroundColor={(user) ? sageColorByName(user.color) : ''} color="black" />
      </Box>

      {/* Apps */}
      {
        apps.map((app) => {
          const Component = Applications[app.type];
          return (
            <Component key={app.id} {...app}></Component>
          );
        })
      }


      {/* Bottom Bar */}
      <Box display="flex" justifyContent="left" alignItems="center" p={2} position="absolute" bottom="0">

        {/* App Create Menu */}
        <Select
          colorScheme="green"
          placeholder='Open Application'
          onChange={handleNewApp}
          width="200px"
          mx="1"
        >
          {Object.keys(Applications).map((appName) => <option key={appName} value={appName}>{appName}</option>)}
        </Select>
        <Button colorScheme="green" mx="1" onClick={assetOnOpen}>Asset Manager</Button>

      </Box>

    </>
  );
}
