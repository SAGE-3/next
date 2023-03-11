/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import {Box, Button, Icon} from '@chakra-ui/react';
import {useEffect, useState, useRef} from 'react';

import create from 'zustand';

import {useAppStore, useUIStore} from '@sage3/frontend';

import {App} from '../../schema';
import {state as AppState} from './index';
import {AppWindow} from '../../components';
import {v4 as uuidv4} from 'uuid';

import './styles.css';
import {DraggableData, Rnd} from "react-rnd";
import {DraggableEvent} from "react-draggable";
import {RxDragHandleDots2} from "react-icons/rx";

// type UpdateFunc = (id: string, state: Partial<AppState>) => Promise<void>;

interface ListItem {
  item: string;
  isDragging: boolean;
}

interface List {
  listID: string;
  list: ListItem[];
  position: { x: number, y: number };
  size: { width: number, height: number };
}

interface DraggableListProps {
  data: List[];
  renderItemContent: (item: ListItem) => JSX.Element;
}

interface ListState {
  lists: List[];
  setLists: (lists: List[]) => void;
}

const useListStore = create<ListState>((set) => ({
  lists: [
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
      ],
      position: {x: 0, y: 0},
      size: {width: 400, height: 300}
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
      ],
      position: {x: 0, y: 0},
      size: {width: 400, height: 300}
    }
  ],
  setLists: (lists: List[]) => set({lists})
}));

function AppComponent(props: (App & DraggableListProps)): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);


  // const boardApps = useAppStore((state) => state.apps);
  // const [lists, setLocalLists] = useState<List[]>(props.data);

  // const [pos, setPos] = useState({x: 0, y: 0})
  // const [size, setSize] = useState({width: 400, height: 300})

  const dragItem = useRef<{ listID: string; itemId: number } | null>(null);
  const dragOverItem = useRef<{ listID: string; itemId: number } | null>(null);

  const listStore = useListStore((state) => state.lists);
  const setListStore = useListStore((state) => state.setLists);

  const updateList = (listID: string, newList: ListItem[], newPosition?: { x: number; y: number }, newSize?: { width: number, height: number }) => {
    const newListIndex = listStore.findIndex((list) => list.listID === listID);
    const newListObj = {
      listID,
      list: newList,
      position: newPosition ?? listStore[newListIndex].position,
      size: newSize ?? listStore[newListIndex].size,
    };
    const newLocalLists = [...listStore];
    newLocalLists.splice(newListIndex, 1, newListObj);
    setListStore(newLocalLists);
  };

  useEffect(() => {
    updateState(props._id, {lists: listStore});
  }, [listStore])

  const handleColumnDragStop = (e: DraggableEvent, data: DraggableData, listID: string) => {
    const {x, y} = data;
    const newList = listStore.find((list) => list.listID === listID)?.list ?? [];
    updateList(listID, newList, {x, y});
    console.log(data)
  };

  // const handleColumnResize = (e: any, data: any, listID: string) => {
  //   console.log("Resize")
  //   const {width, height} = data;
  //   const newList = localLists.find((list) => list.listID === listID)?.list ?? [];
  //   updateList(listID, newList, undefined, {width, height});
  // }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, listID: string, itemId: number) => {
    dragItem.current = {listID, itemId};

  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, listID: string, itemId: number) => {
    dragOverItem.current = {listID, itemId};
    const isDragOverEmpty = listStore.find((list) => list.listID === listID)?.list[itemId].item === "";

    const newList = listStore.find((list) => list.listID === listID)?.list.map((item, index) => ({
      ...item,
      isDragging: index === itemId,
    }));
    if (newList) {
      updateList(listID, newList);
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>, listID: string, itemId: number) => {
    const dragItemId = dragItem.current?.itemId;
    const draglistID = dragItem.current?.listID;
    const dropItemId = dragOverItem.current?.itemId;
    const droplistID = dragOverItem.current?.listID;

    if (dragItemId !== undefined && draglistID !== undefined && dropItemId !== undefined && droplistID !== undefined) {
      if (draglistID === droplistID) {
        const newList = listStore.find((list) => list.listID === listID)?.list;
        if (newList) {
          const dragItemContent = newList[dragItemId];
          newList.splice(dragItemId, 1);
          newList.splice(dropItemId, 0, dragItemContent);
          updateList(listID, newList);
        }
      } else {
        const dragList = listStore.find((list) => list.listID === draglistID);
        const dropList = listStore.find((list) => list.listID === droplistID);
        if (dragList && dropList) {
          const dragItemContent = dragList.list[dragItemId];
          dragList.list.splice(dragItemId, 1);

          if (dragList.list.length === 0) {
            const blankListItem: ListItem = {item: "", isDragging: false}
            dragList.list = [blankListItem]
            updateList(draglistID, dragList.list)
          }

          if (dropList.list[0].item === "") {
            dropList.list[0] = dragItemContent
          } else {
            dropList.list.splice(dropItemId, 0, dragItemContent);
          }
          updateList(draglistID, dragList.list);
          updateList(droplistID, dropList.list);
        }
      }
      setListStore(listStore.map((list) => ({
        ...list,
        list: list.list.map((item) => ({...item, isDragging: false}))
      })));

    }
  };

  return (
    <AppWindow app={props} lockToBackground={true}>
      <div>
        {/*{listStore &&*/}
        {/*  listStore.map((list) => (*/}
        {s.lists &&
          s.lists.map((list) => (
            <Rnd
              size={{width: list.size.width, height: list?.size.height}}
              position={{x: list?.position.x, y: list?.position.y}}
              dragHandleClassName={"drag-handle"}
              onDragStop={(e, data) => handleColumnDragStop(e, data, list.listID)}
              // onResize={(e, data) => handleColumnResize(e, data, list.listID)}
              // bounds={props.data.state.data}
            >
              <Box
                key={list.listID}
                border="1px"
                borderColor="teal"
                borderWidth="5px"
                borderRadius="25px"
                backgroundColor="green.300"
                position="relative"
                p="5px">
                <Icon className={"drag-handle"} as={RxDragHandleDots2} boxSize={12} position="absolute" top={"50%"}
                      transform={"translateY(-50%)"}/>
                {list.list.map((item, index) => (
                  <>
                    <div
                      style={{
                        backgroundColor: 'orange',
                        borderRadius: '25px',
                        margin: '3% 5% 3% 15%',
                        textAlign: 'center',
                        fontSize: '40px',
                      }}
                      key={item.item}
                      draggable
                      onDragStart={(e) => handleDragStart(e, list.listID, list.list.indexOf(item))}
                      onDragEnter={(e) => handleDragEnter(e, list.listID, list.list.indexOf(item))}
                      onDragEnd={(e) => handleDragEnd(e, list.listID, list.list.indexOf(item))}
                    >
                      {item.item == "" ? <Box backgroundColor="green.300" p="5px"/> : item.item}
                    </div>
                    {item.isDragging ? <div className="drag-line"/> : null}
                  </>
                ))}
              </Box>
            </Rnd>
          ))}
      </div>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const listStore = useListStore((state) => state.lists);
  const setListStore = useListStore((state) => state.setLists);

  // TODO Share state between Toolbar and App
  const updateListCount = () => {
    const newuuid = uuidv4();

    const blankListItem: ListItem = {item: "", isDragging: false}
    const blankList: List = {
      listID: newuuid,
      list: [blankListItem],
      position: {x: 0, y: 0},
      size: {width: 400, height: 300}
    }
    const newList = [...listStore, blankList]

    setListStore(newList)
  }


  return (
    <>
      <Button
        colorScheme="blue"
        size="sm"
        onClick={() => updateListCount()}
      >
        Add Column
      </Button>
    </>
  );
}

export default {
  AppComponent, ToolbarComponent
}
;
