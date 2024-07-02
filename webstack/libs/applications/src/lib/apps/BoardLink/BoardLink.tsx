/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useEffect } from 'react';
import { Button, Input, useDisclosure } from '@chakra-ui/react';

import { EnterBoardModal, apiUrls, isElectron, useAppStore } from '@sage3/frontend';
import { Board } from '@sage3/shared/types';

import { state as AppState } from './index';
import { App } from '../../schema';
import { AppWindow } from '../../components';

import { OtherServerCard } from './components/OtherServerCard';
import { BoardCard } from './components/BoardCard';
import { MdDashboard } from 'react-icons/md';

/* App component for BoardLink */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // Check if this is another server
  const otherServer = new URL(s.url.replace('sage3://', 'https://')).hostname !== window.location.hostname;

  return (
    <AppWindow app={props} disableResize={true} hideBackgroundIcon={MdDashboard}>
      {otherServer ? <OtherServerCard {...props} /> : <BoardCard {...props} />}
    </AppWindow>
  );
}

/* App toolbar component for the app BoardLink */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const [board, setBoard] = useState<undefined | Board>(undefined);

  const [title, setTitle] = useState('');

  const changeTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const updateState = useAppStore((state) => state.updateState);

  // Check if this is another server
  const otherServer = new URL(s.url.replace('sage3://', 'https://')).hostname !== window.location.hostname;

  const { isOpen: enterBoardIsOpen, onOpen: enterBoardOnOpen, onClose: enterBoardOnClose } = useDisclosure();

  const boardId = s.url.split('/')[s.url.split('/').length - 1];
  useEffect(() => {
    async function fetchUrl() {
      const res = await fetch(apiUrls.boards.getBoard(boardId));
      const data = await res.json();
      if (data.success) {
        setBoard(data.data[0]);
      }
    }
    if (!otherServer) {
      fetchUrl();
    }

    // Get board info
  }, [s.url]);

  const enterBoard = () => {
    if (otherServer) {
      const url = s.url.replace('sage3://', 'https://');
      if (isElectron()) {
        window.location.replace(url);
      } else {
        window.open(url, '_blank');
      }
    } else {
      enterBoardOnOpen();
    }
  };

  const goToBoardFinish = () => {
    enterBoardOnClose();
  };

  const updateCardTitle = () => {
    updateState(props._id, { cardTitle: title });
  };

  const onSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      updateCardTitle();
    }
  };

  return (
    <>
      {board && <EnterBoardModal board={board} isOpen={enterBoardIsOpen} onClose={goToBoardFinish} />}

      <Button colorScheme="teal" size="xs" px="6" disabled={!board} onClick={enterBoard}>
        Enter Board
      </Button>

      {otherServer && (
        <>
          <Input
            size="xs"
            ml="2"
            _placeholder={{ color: 'gray.400', opacity: 1.0 }}
            placeholder="Update Board Name..."
            onChange={changeTitle}
            onKeyDown={onSubmit}
          />

          <Button colorScheme="teal" size="xs" px="4" ml="2" disabled={!board} onClick={updateCardTitle}>
            Update
          </Button>
        </>
      )}
    </>
  );
}
/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
