/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import {Box} from '@chakra-ui/react';
import {useEffect, useState, useRef} from 'react';

import {useAppStore, useUIStore} from '@sage3/frontend';

import {App} from '../../schema';
import {state as AppState} from './index';
import {AppWindow} from '../../components';

import './styles.css';

type UpdateFunc = (id: string, state: Partial<AppState>) => Promise<void>;


interface ListItem {
  item: string;
  isDragging: boolean;
}

interface List {
  listID: string;
  list: ListItem[];
}

interface DraggableListProps {
  data: List[];
  renderItemContent: (item: ListItem) => JSX.Element;
}

function AppComponent(props: (App & DraggableListProps)): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const selectedAppId = useUIStore((state) => state.selectedAppId);

  const boardApps = useAppStore((state) => state.apps);
  // const [lists, setLocalLists] = useState<List[]>(props.data);

  const dragItem = useRef<{ listID: string; itemId: number } | null>(null);
  const dragOverItem = useRef<{ listID: string; itemId: number } | null>(null);

  const [localLists, setLocalLists] = useState<List[]>(
    [
      {
        listID: "1234",
        list: [
          {
            item: "item 1",
            isDragging: false
          },
          {
            item: "item 2",
            isDragging: false
          },
          {
            item: "item 3",
            isDragging: false
          }
        ]
      },
      {
        listID: "5678",
        list: [
          {
            item: "item 4",
            isDragging: false
          },
          {
            item: "item 5",
            isDragging: false
          }
        ]
      }
    ]
  );

  const updateList = (listID: string, newList: ListItem[]) => {
    setLocalLists(localLists.map((list) => (list.listID === listID ? {...list, list: newList} : list)));
  };

  useEffect(() => {
    updateState(props._id, {lists: localLists});
  }, [localLists])

  const dragStart = (e: React.DragEvent<HTMLDivElement>, listID: string, itemId: number) => {
    dragItem.current = {listID, itemId};
  };

  const dragEnter = (e: React.DragEvent<HTMLDivElement>, listID: string, itemId: number) => {
    dragOverItem.current = {listID, itemId};

    const newList = localLists.find((list) => list.listID === listID)?.list.map((item, index) => ({
      ...item,
      isDragging: index === itemId,
    }));

    if (newList) {
      updateList(listID, newList);
    }
  };

  const drop = (e: React.DragEvent<HTMLDivElement>, listID: string, itemId: number) => {
    const dragItemId = dragItem.current?.itemId;
    const draglistID = dragItem.current?.listID;
    const dropItemId = dragOverItem.current?.itemId;
    const droplistID = dragOverItem.current?.listID;

    if (dragItemId !== undefined && draglistID !== undefined && dropItemId !== undefined && droplistID !== undefined) {
      if (draglistID === droplistID) {
        const newList = localLists.find((list) => list.listID === listID)?.list;
        if (newList) {
          const dragItemContent = newList[dragItemId];
          newList.splice(dragItemId, 1);
          newList.splice(dropItemId, 0, dragItemContent);
          updateList(listID, newList);
        }
      } else {
        const dragList = localLists.find((list) => list.listID === draglistID);
        const dropList = localLists.find((list) => list.listID === droplistID);
        if (dragList && dropList) {
          const dragItemContent = dragList.list[dragItemId];
          dragList.list.splice(dragItemId, 1);
          dropList.list.splice(dropItemId, 0, dragItemContent);
          updateList(draglistID, dragList.list);
          updateList(droplistID, dropList.list);

        }
      }
      setLocalLists(localLists.map((list) => ({
        ...list,
        list: list.list.map((item) => ({...item, isDragging: false}))
      })));

    }
  };

  return (
    <AppWindow app={props} lockToBackground={true}>
      <div>
        {s.lists.map((list) => (
          <Box
            key={list.listID}
            border="1px"
            borderColor="teal"
            borderWidth="5px"
            borderRadius="25px"
            backgroundColor="green.300"
            p="5px">
            {list.list.map((item) => (
              <>
                <div
                  style={{backgroundColor: 'orange', borderRadius: '25px', margin: '10px 5%', textAlign: 'center', fontSize: '40px'}}
                  key={item.item}
                  draggable
                  onDragStart={(e) => dragStart(e, list.listID, list.list.indexOf(item))}
                  onDragEnter={(e) => dragEnter(e, list.listID, list.list.indexOf(item))}
                  // onDragEnd={() => dragEnd()}
                  onDragEnd={(e) => drop(e, list.listID, list.list.indexOf(item))}
                >
                  {item.item}
                </div>
                {item.isDragging ? <div className="drag-line"/> : null}
              </>
            ))}
          </Box>

        ))}
      </div>
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
