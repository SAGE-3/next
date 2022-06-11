/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { Box, Button } from '@chakra-ui/react';
import { Applications, initialValues } from '@sage3/applications/apps';
import { useAppStore } from '@sage3/frontend';

import { useEffect } from 'react';
import Draggable from 'react-draggable';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const subToBoard = useAppStore((state) => state.subscribeByBoardId);
  const unsubToApp = useAppStore((state) => state.unsub);

  useEffect(() => {
    subToBoard(locationState.boardId);
    return () => {
      unsubToApp();
    }
  }, []);

  function handleHomeClick() {
    navigate('/home');
  }

  function handleNoteClick() {
    createApp(
      'Note',
      'Note Description',
      locationState.roomId,
      locationState.boardId,
      { x: 0, y: 0, z: 0 },
      { width: 300, height: 300, depth: 0 },
      { x: 0, y: 0, z: 0 },
      'Note',
      initialValues['Note']);
  }

  function handleCounterClick() {
    createApp(
      'Counter',
      'Counter Description',
      locationState.roomId,
      locationState.boardId,
      { x: 0, y: 0, z: 0 },
      { width: 300, height: 300, depth: 0 },
      { x: 0, y: 0, z: 0 },
      'Counter',
      initialValues['Counter']);
  }

  function handleImageClick() {
    createApp(
      'Image',
      'Image Description',
      locationState.roomId,
      locationState.boardId,
      { x: 0, y: 0, z: 0 },
      { width: 300, height: 300, depth: 0 },
      { x: 0, y: 0, z: 0 },
      'Image',
      initialValues['Image']);
  }

  function handleSliderClick() {
    createApp(
      'Slider',
      'Slider Description',
      locationState.roomId,
      locationState.boardId,
      { x: 0, y: 0, z: 0 },
      { width: 300, height: 300, depth: 0 },
      { x: 0, y: 0, z: 0 },
      'Slider',
      initialValues['Slider']);
  }

  function handleLinkerClick() {
    createApp(
      'Linker',
      'Linker Description',
      locationState.roomId,
      locationState.boardId,
      { x: 0, y: 0, z: 0 },
      { width: 300, height: 300, depth: 0 },
      { x: 0, y: 0, z: 0 },
      'Linker',
      initialValues['Linker']);
  }

  return (
    <>
      <Button colorScheme="green" onClick={handleHomeClick}>Home</Button>
      <Button onClick={handleNoteClick}>Note App</Button>
      <Button onClick={handleCounterClick}>Counter App</Button>
      <Button onClick={handleImageClick}>Image App</Button>
      <Button onClick={handleSliderClick}>Slider App</Button>
      <Button onClick={handleLinkerClick}>Linker App</Button>


      {apps.map((app) => {
        const Component = Applications[app.type];
        return (
          <Component key={app.id} {...app}></Component>
        );
      })}

    </>
  );
}
