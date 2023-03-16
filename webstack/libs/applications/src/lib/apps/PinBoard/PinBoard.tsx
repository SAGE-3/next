/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Button, Container, Divider, Grid, HStack, Icon, Spacer, Text } from '@chakra-ui/react';
import { useEffect, useState, useRef } from 'react';

import { useAppStore } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

import './styles.css';
import { DraggableData, Rnd as ListColumn } from 'react-rnd';
import { DraggableEvent } from 'react-draggable';
import { RxDragHandleDots1, RxDragHandleDots2 } from 'react-icons/rx';

import ToolbarComponent from './components/toolbar';
import { defaultData } from './components/default';

/**
 * Pinboard App
 *
 * TODO: Remove item when it is dropped outside of the Pinboard
 * TODO: Fix resizing issue - when zoomed in or out, the size/position is off
 * TODO: Fix issue with dragging items - mouse cursor does not move with the item always
 * TODO: Add ability to select a list (column) and add items to it
 * TODO: Add ability to add a column title - needs to be added to state
 * TODO: Add ability to add a column description - needs to be added to state
 */

interface ListItem {
  item: string;
  isDragging: boolean;
}

interface List {
  items: ListItem[];
  position: { x: number; y: number };
  size: { width: number; height: number };
}

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const dragItem = useRef<{ listId: number; itemId: number } | null>(null);
  const dragOverItem = useRef<{ listId: number; itemId: number } | null>(null);

  const [pinboardData, setPinboardData] = useState<List[]>([]);

  useEffect(() => {
    if (s.lists && s.lists.length > 0) {
      setPinboardData(s.lists);
    } else {
      setPinboardData([]);
    }
  }, [JSON.stringify(s.lists)]);

  function handleColumnDragStart(listIndex: number) {
    const newPinboardData = [...pinboardData];
    newPinboardData[listIndex].items.forEach((item) => (item.isDragging = true));
    setPinboardData(newPinboardData);
    updateState(props._id, { lists: newPinboardData });
  }

  function handleColumnDragStop(e: DraggableEvent, data: DraggableData, listIndex: number) {
    const newPinboardData = [...pinboardData];
    newPinboardData[listIndex].position = { x: data.x, y: data.y };
    newPinboardData[listIndex].items.forEach((item) => (item.isDragging = false));
    setPinboardData(newPinboardData);
    updateState(props._id, { lists: newPinboardData });
  }

  function handleRowDragStart(listIndex: number, itemIndex: number) {
    dragItem.current = { listId: listIndex, itemId: itemIndex };
    pinboardData[listIndex].items[itemIndex].isDragging = true;
    setPinboardData([...pinboardData]);
  }

  function handleRowDragOver(listIndex: number, itemIndex: number) {
    if (!dragItem.current) return;
    dragOverItem.current = { listId: listIndex, itemId: itemIndex };
  }

  function handleRowDragStop(listIndex: number, itemIndex: number) {
    if (!dragItem.current || !dragOverItem.current) return;
    // set dragging to false and place item in the new position (dragOverItem position)
    pinboardData[listIndex].items[itemIndex].isDragging = false;
    const newPinboardData = [...pinboardData];
    newPinboardData[listIndex].items[itemIndex].isDragging = false;
    // place the item in the new position
    const item = newPinboardData[dragItem.current.listId].items[dragItem.current.itemId];
    newPinboardData[dragItem.current.listId].items.splice(dragItem.current.itemId, 1);
    newPinboardData[dragOverItem.current.listId].items.splice(dragOverItem.current.itemId, 0, item);
    dragItem.current = null;
    dragOverItem.current = null;
    setPinboardData(newPinboardData);
    updateState(props._id, { lists: newPinboardData });
  }

  function clearBoard() {
    setPinboardData([]);
    updateState(props._id, { lists: [] });
  }

  function resetBoard() {
    setPinboardData(defaultData);
    updateState(props._id, { lists: defaultData });
  }

  return (
    <AppWindow app={props} lockToBackground={true}>
      <>
        {/* Random Navbar For Debugging */}
        <Box display="flex" justifyContent="space-between" alignItems="center" m={0} p={1} borderBottom="1px solid black">
          <Text fontSize={'xl'}>DropBoard</Text>
          <Box>
            <Button onClick={clearBoard}>Clear</Button>
            <Button onClick={resetBoard}>Reset</Button>
            <Button onClick={() => console.log(pinboardData)}>Log</Button>
          </Box>
        </Box>
        <Box w={'100%'} h={'100%'} bg={'#222'}>
          {pinboardData.length > 0 &&
            pinboardData.map((list, listIndex) => (
              <ListColumn
                key={listIndex} // need an index for each column
                size={{ width: list.size.width, height: list?.size.height }}
                position={{ x: list?.position.x, y: list?.position.y }}
                // bounds="parent"
                dragHandleClassName={'column-drag'}
                onDragStart={(e) => handleColumnDragStart(listIndex)}
                onDragStop={(e, data) => handleColumnDragStop(e, data, listIndex)}
              >
                <Box key={listIndex} border="1px solid black" backgroundColor="white" position="relative" p="1px" w={'175px'}>
                  <HStack px={2}>
                    <Text as={'h2'}>{listIndex + 1}</Text>
                    <Spacer />
                    <Icon className={'column-drag'} as={RxDragHandleDots2} transform="rotate(90deg)" boxSize={6} cursor="move" />
                  </HStack>
                  {list.items.map((item, itemIndex) => (
                    <>
                      <Box
                        key={itemIndex}
                        border="1px solid black"
                        m={1}
                        p={1}
                        draggable
                        onDragStart={(e) => handleRowDragStart(listIndex, itemIndex)}
                        onDragOver={(e) => handleRowDragOver(listIndex, itemIndex)}
                        onDragEnd={(e) => handleRowDragStop(listIndex, itemIndex)}
                      >
                        {item.item && (
                          <HStack>
                            <Icon mr={-1} className={'item-drag'} as={RxDragHandleDots2} boxSize={6} />
                            <Box backgroundColor={item.isDragging ? 'red.100' : 'green.100'} p={1} w={'100%'}>
                              {item.item}
                            </Box>
                          </HStack>
                        )}
                      </Box>
                    </>
                  ))}
                </Box>
              </ListColumn>
            ))}
        </Box>
      </>
    </AppWindow>
  );
}

export default {
  AppComponent,
  ToolbarComponent,
};
