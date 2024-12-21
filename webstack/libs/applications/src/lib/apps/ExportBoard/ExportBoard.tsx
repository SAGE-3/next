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

import {jsPDF} from 'jspdf'
import {marked} from 'marked'

// Styling
import './styling.css';
import { html } from 'd3';

/* App component for ExportBoard */

// props.position
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const pos = props.data.position
  const updateState = useAppStore((state) => state.updateState);
  const [exportState, setExportState] = useState(false)

  const room_id = props.data.roomId
  const board_id = props.data.boardId
  console.log(pos);
  const handleClick = () => {
    setExportState(!exportState);
    console.log("hello!");
  }

  useEffect(() => {
    console.log(exportState);
    console.log(`Room id: ${room_id}`);
    console.log(`Board id: ${board_id}`);
    console.log(props.data);
    console.log(props)

    const query: ExportQueryType = {
      room_id,
      board_id,
    }

  }, [exportState])

  const exportBoard = async () => {
    const ctx = {
      previousQ: "",
      previousA: "",
      pos: [pos["x"], pos["y"]],
      roomId: room_id,
      boardId: board_id,
    };
    
    const query: ExportQueryType = {
      ctx,
      room_id,
      board_id,
      model: "llama",
    };
    try {
      console.log(room_id, board_id);
      const response = await callBoard(query);
      if ('message' in response) {
        console.log("error", response);
      }
      else {
        console.log(`success,`, response.data, response);
        console.log(props)
        // const markdown = response.data;
        // const doc = new jsPDF({
        //   orientation: 'p',
        //   unit: 'mm',
        //   format: 'a4'
        // });
        
        // const lines = markdown.split('\n');  
        // let y = 10;  
        // const lineHeight = 10;  
        
        // lines.forEach(line => {
        //   doc.text(line, 10, y); 
        // });
        // doc.setDisplayMode('original', 'continuous', 'UseOutlines');
        // doc.save("exported_board.pdf");
      }
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
