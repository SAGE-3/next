/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import {
  Box,
} from '@chakra-ui/react';


import {useAppStore, useUIStore} from '@sage3/frontend';

import {App} from '../../schema';
import {state as AppState} from './index';
import {AppWindow} from '../../components';

import './styles.css';

import {useEffect, useState, useRef} from 'react';


type UpdateFunc = (id: string, state: Partial<AppState>) => Promise<void>;

interface DraggableListProps {
  data: any[],
  renderItemContent: (item: any) => JSX.Element;
}


function AppComponent(props: (App & DraggableListProps)): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const selectedAppId = useUIStore((state) => state.selectedAppId);

  const boardApps = useAppStore((state) => state.apps);

  const [localPinnedApps, setLocalPinnedApps] = useState<Record<string, string>>({});

  useEffect(() => {
    updateState(props._id, {pinnedApps: localPinnedApps});
    console.log('Updated pinnedApps: ' + Object.keys(s.pinnedApps))
  }, [localPinnedApps]);


  interface ListItem {
    item: string;
    isDragging: boolean;
  }

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [list, setList] = useState<ListItem[]>([
    {
      item: 'Item 1',
      isDragging: false
    },
    {
      item: 'Item 2',
      isDragging: false

    },
    {
      item: 'Item 3',
      isDragging: false

    },
    {
      item: 'Item 4',
      isDragging: false

    },
    {
      item: 'Item 5',
      isDragging: false

    }
  ]);

  const dragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    if (e.target instanceof HTMLDivElement) {
      console.log(e.target.innerHTML);
    }
  };

  const dragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
    if (e.target instanceof HTMLDivElement) {
      console.log(e.target.innerHTML);
      const listCopy = [...list]

      const listLoopCopy: ListItem[] = []
      listCopy.forEach(item => {
        listLoopCopy.push({
          item: item.item,
          isDragging: false
        })

      })

      listLoopCopy[position].isDragging = true;
      setList(listLoopCopy)
    }
  };

  const drop = (e: React.DragEvent<HTMLDivElement>) => {
    const copyListItems = [...list];
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const dragItemContent = copyListItems[dragItem.current];
      copyListItems.splice(dragItem.current, 1);
      copyListItems.splice(dragOverItem.current, 0, dragItemContent);
      dragItem.current = null;
      dragOverItem.current = null;

      const listLoopCopy: ListItem[] = []
      copyListItems.forEach(item => {
        listLoopCopy.push({
          item: item.item,
          isDragging: false
        })
      })

      setList(listLoopCopy);
    }
  };

  return (
    <AppWindow app={props} lockToBackground={true}>
      <Box>
        <>
          {
            list &&
            list.map((item, index) => (
              <>
                <div style={{backgroundColor: 'lightblue', margin: '10px 10%', textAlign: 'center', fontSize: '40px'}}
                     onDragStart={(e) => dragStart(e, index)}
                     onDragEnter={(e) => dragEnter(e, index)}
                     onDragEnd={drop}
                     key={index}
                     draggable>
                  {item.item}
                </div>
                {item.isDragging ? <div className="drag-line"/> : null}
              </>
            ))}
        </>
      </Box>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);


  return (
    <>
    </>
  );
}

export default {
  AppComponent, ToolbarComponent
}
;
