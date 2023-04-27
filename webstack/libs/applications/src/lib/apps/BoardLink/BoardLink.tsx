/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { EnterBoardModal, useAppStore } from '@sage3/frontend';
import { Box, Button, useDisclosure } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { Board } from '@sage3/shared/types';
import { useState, useEffect } from 'react';

/* App component for BoardLink */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const [board, setBoard] = useState<undefined | Board>(undefined);
  const boardId = s.url.split('/')[s.url.split('/').length - 1];

  useEffect(() => {
    async function fetchUrl() {
      const res = await fetch(`/api/boards/${boardId}`);
      const data = await res.json();
      if (data.success) {
        setBoard(data.data[0]);
      }
    }
    fetchUrl();
    // Get board info
  }, [s.url]);

  return (
    <AppWindow app={props} processing={!board}>
      <Box width="100%" height="100%" display="flex" flexDir="column" justifyContent={'center'} alignItems={'center'}>
        <h1>{board?.data.name}</h1>
        <h1>{board?.data.description}</h1>
        <h1>{board?.data.isPrivate ? 'LOCKED' : 'UNLOCKED'}</h1>
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app BoardLink */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const [board, setBoard] = useState<undefined | Board>(undefined);
  const { isOpen: enterBoardIsOpen, onOpen: enterBoardOnOpen, onClose: enterBoardOnClose } = useDisclosure();

  const boardId = s.url.split('/')[s.url.split('/').length - 1];
  useEffect(() => {
    async function fetchUrl() {
      const res = await fetch(`/api/boards/${boardId}`);
      const data = await res.json();
      if (data.success) {
        setBoard(data.data[0]);
      }
    }
    fetchUrl();
    // Get board info
  }, [s.url]);

  const goToBoardFinish = () => {
    enterBoardOnClose();
  };

  return (
    <>
      {board && <EnterBoardModal board={board} isOpen={enterBoardIsOpen} onClose={goToBoardFinish} />}
      <Button colorScheme="green" size="xs" disabled={!board} onClick={enterBoardOnOpen}>
        Enter Board
      </Button>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
