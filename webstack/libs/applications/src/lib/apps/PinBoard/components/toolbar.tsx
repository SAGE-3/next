/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Button, ButtonGroup } from '@chakra-ui/react';

import { useAppStore, useUIStore } from '@sage3/frontend';

import { App } from '../../../schema';
import { state as AppState } from '../index';
import { v4 as getUUID } from 'uuid';

interface ListItem {
  item: any;
  isDragging: boolean;
}

interface List {
  listId: string;
  list: ListItem[];
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export default function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  function addItem() {
    const uuid = getUUID();
    const itemId = uuid.substring(uuid.length - 8);
    if (s.lists && s.lists.length > 0) {
      const lastColumn = s.lists[s.lists.length - 1];
      const numItems = lastColumn.items.length;
      //   lastColumn.items.push({ item: `${numItems + 1}`, isDragging: false });
      lastColumn.items.push({ item: itemId, isDragging: false });
      updateState(props._id, { lists: [...s.lists] });
    } else {
      const list = {
        items: [{ item: itemId, isDragging: false }],
        position: { x: 0, y: 0 },
        size: { width: 200, height: 300 },
      };
      updateState(props._id, { lists: [...s.lists, list] });
    }
  }

  function addColumn() {
    const width = 200;
    const height = 300;
    const posX = s.lists.length > 0 ? s.lists[s.lists.length - 1].position.x + width : 0;
    // const posY = lastColumn.position.y;
    const uuid = getUUID();
    const itemId = uuid.substring(uuid.length - 8);
    const newList = {
      items: [{ item: itemId, isDragging: false }],
      position: { x: posX, y: 0 },
      size: { width: width, height: height },
    };
    updateState(props._id, { lists: [...s.lists, newList] });
  }

  return (
    <Box>
      <ButtonGroup>
        <Button colorScheme="teal" size="sm" onClick={() => updateState(props._id, { lists: [] })}>
          Clear
        </Button>
        <Button colorScheme="teal" size="sm" aria-label="Add column" onClick={addColumn}>
          Add Column
        </Button>
        <Button colorScheme="teal" size="sm" aria-label="Add item" onClick={addItem}>
          Add Item
        </Button>
      </ButtonGroup>
    </Box>
  );
}
