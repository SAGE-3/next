/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, Select, Text, useDisclosure } from '@chakra-ui/react';

import { Applications, initialValues } from '@sage3/applications/apps';
import { AppName } from '@sage3/applications/schema';

import { useAppStore, useBoardStore, useUserStore } from '@sage3/frontend';
import { AssetModal, UploadModal } from '@sage3/frontend';

import { sageColorByName } from '@sage3/shared';
import { DraggableData, Rnd } from 'react-rnd';

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
  const { isOpen: assetIsOpen, onOpen: assetOnOpen, onClose: assetOnClose } = useDisclosure();
  // Upload modal
  const { isOpen: uploadIsOpen, onOpen: uploadOnOpen, onClose: uploadOnClose } = useDisclosure();

  // Board current position
  const [boardPos, setBoardPos] = useState({ x: 0, y: 0 });

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
    const width = 300;
    const height = 300;
    const x = boardPos.x + (window.innerWidth / 2) - (width / 2);
    const y = boardPos.y + (window.innerHeight / 2) - (height / 2);
    createApp(
      appName,
      `${appName} - Description`,
      locationState.roomId,
      locationState.boardId,
      { x, y, z: 0 },
      { width, height, depth: 0 },
      { x: 0, y: 0, z: 0 },
      appName,
      initialValues[appName]);
  }

  function handleDragStop(event: any, data: DraggableData) {
    setBoardPos({ x: -data.x, y: -data.y });
  }

  return (
    <>

      {/* Asset dialog */}
      <AssetModal isOpen={assetIsOpen} onOpen={assetOnOpen} onClose={assetOnClose}></AssetModal>

      {/* Upload dialog */}
      <UploadModal isOpen={uploadIsOpen} onOpen={uploadOnOpen} onClose={uploadOnClose}></UploadModal>

      {/* Board */}
      <Rnd
        default={{
          x: 0,
          y: 0,
          width: 5000,
          height: 5000,
        }}
        onDragStop={handleDragStop}
        enableResizing={false}
        dragHandleClassName={'board-handle'}>
        {/* Apps */}
        {
          apps.map((app) => {
            const Component = Applications[app.type];
            return (
              <Component key={app.id} {...app}></Component>
            );
          })
        }
        {/* Draggable Background */}
        < Box
          className="board-handle"
          width={5000}
          height={5000}
          backgroundSize={`50px 50px`}
          backgroundImage={
            `linear-gradient(to right, grey 1px, transparent 1px),
             linear-gradient(to bottom, grey 1px, transparent 1px);`
          }
        ></Box>
      </Rnd>

      {/* Top bar */}
      <Box display="flex" justifyContent="space-between" alignItems="center" p={2}
        position="absolute"
        top="0"
        width="100%">
        <Button colorScheme="green" onClick={handleHomeClick}>Home</Button>
        <Text
          fontSize="3xl"
          background="teal"
          px={6}
          borderRadius="16"
          color="white">
          {board?.name}
        </Text>
        <Avatar size='md' name={user?.name} backgroundColor={(user) ? sageColorByName(user.color) : ''} color="black" />
      </Box>

      {/* Bottom Bar */}
      <Box
        display="flex"
        justifyContent="left"
        alignItems="center"
        p={2}
        position="absolute"
        bottom="0">

        {/* App Create Menu */}
        <Select
          colorScheme="green"
          placeholder='Open Application'
          onChange={handleNewApp}
          width="200px"
          mx="1"
          background="darkgray"
        >
          {Object.keys(Applications).map((appName) => <option key={appName} value={appName}>{appName}</option>)}
        </Select>

        <Button colorScheme="green" mx="1" onClick={assetOnOpen}>Asset Manager</Button>

        <Button colorScheme="blue" mx="1" onClick={uploadOnOpen}>Upload</Button>

      </Box>

    </>
  );
}
