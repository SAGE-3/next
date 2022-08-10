/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Menu, MenuGroup, MenuItem, MenuItemOption, MenuOptionGroup } from '@chakra-ui/react';
import { initialValues } from '@sage3/applications/apps';
import { useAppStore, useUIStore, useUser } from '@sage3/frontend';
import { useState } from 'react';

type ContextProps = {
  roomId: string;
  boardId: string;
  clearBoard: () => void;
};

export function BoardContextMenu(props: ContextProps) {
  // User information
  const { user } = useUser();
  const createApp = useAppStore((state) => state.create);

  // UI Store
  const gridSize = useUIStore((state) => state.gridSize);
  const setGridSize = useUIStore((state) => state.setGridSize);
  const boardPosition = useUIStore((state) => state.boardPosition);

  // State of the checkboxes in context menu
  const [radios, setRadios] = useState<string[]>(['ui', 'grid']);

  // Enable/disable the grid
  const onGridChange = () => {
    if (radios.includes('grid')) {
      setGridSize(1);
      setRadios(radios.filter((el) => el !== 'grid'));
    } else {
      setGridSize(50);
      setRadios([...radios, 'grid']);
    }
  };
  // Show/hide the UI
  const onUIChange = () => {
    if (radios.includes('ui')) {
      setRadios(radios.filter((el) => el !== 'ui'));
    } else {
      setRadios([...radios, 'ui']);
    }
  };

  return (
    <Menu>
      <MenuGroup m={'2px 3px 0 3px'} title="Actions">
        <MenuItem p={'2px 3px 1px 3px'} className="contextmenuitem">
          Fit View to Board
        </MenuItem>
        <MenuItem p={'2px 3px 1px 3px'} className="contextmenuitem">
          Show all Apps
        </MenuItem>
        <MenuItem p={'2px 3px 1px 3px'} className="contextmenuitem" onClick={props.clearBoard}>
          Clear Board
        </MenuItem>
        <MenuItem
          p={'2px 3px 1px 3px'}
          className="contextmenuitem"
          onClick={() => {
            const width = 700;
            const height = 700;
            // Calculate X and Y of app based on the current board position and the width and height of the viewport
            let x = Math.floor(boardPosition.x + window.innerWidth / 2 - width / 2);
            let y = Math.floor(boardPosition.y + window.innerHeight / 2 - height / 2);
            x = Math.round(x / gridSize) * gridSize; // Snap to grid
            y = Math.round(y / gridSize) * gridSize;
            // Open a webview into the SAGE3 builtin Jupyter instance
            createApp({
              name: 'JupyterApp',
              description: 'JupyterApp',
              roomId: props.roomId,
              boardId: props.boardId,
              position: { x, y, z: 0 },
              size: { width, height, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'JupyterApp',
              ownerId: user?._id || '-',
              state: { ...initialValues['JupyterApp'], jupyterURL: '' },
              minimized: false,
              raised: true,
            });
          }}
        >
          Open Jupyter
        </MenuItem>
      </MenuGroup>
      <hr className="divider" />
      <MenuOptionGroup m={'2px 3px 0 3px'} title="Options" type="checkbox" defaultValue={radios}>
        <MenuItemOption m={0} p={'2px 3px 1px 3px'} className="contextmenuitem" value="grid" onClick={onGridChange}>
          Snap to Grid
        </MenuItemOption>
        <MenuItemOption p={'2px 3px 1px 3px'} className="contextmenuitem" value="ui" onClick={onUIChange}>
          Show Interface
        </MenuItemOption>
      </MenuOptionGroup>
    </Menu>
  );
}
