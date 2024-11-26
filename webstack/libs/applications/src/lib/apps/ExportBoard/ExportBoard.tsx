/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useEffect, useState } from 'react';

import { Button } from '@chakra-ui/react';

import { useAppStore } from '@sage3/frontend';

import { state as AppState } from './index';
import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';
import { callBoard} from './tRPC';
import {
  ExportReturnType,
  ExportQueryType
} from '@sage3/shared';

// Styling
import './styling.css';

/* App component for ExportBoard */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);
  const [exportState, setExportState] = useState(false)

  const room_id = props.data.roomId
  const board_id = props.data.boardId

  const handleClick = () => {
    setExportState(!exportState);
    console.log("hello!");
  }

  useEffect(() => {
    console.log(exportState);
    console.log(room_id);
    console.log(board_id);
    console.log(props.data);

    const query: ExportQueryType = {
      room_id,
      board_id,
    }

  }, [exportState])

  const exportBoard = async () => {
    const query: ExportQueryType = {
      room_id,
      board_id,
    }
    try {
      console.log(room_id, board_id);
      const response = await callBoard(query);
      console.log(response);
    }
    catch(error){
      console.log(error);
    }
  }

  return (
    <AppWindow app={props}>
      <>
        <h1> Count : {s.Count}</h1>
        <button onClick={exportBoard} className='Export-Button'>Export Board</button>
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app ExportBoard */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
      <Button colorScheme="green">Action</Button>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
