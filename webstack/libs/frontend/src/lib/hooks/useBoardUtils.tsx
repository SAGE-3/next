/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore, useBoardStore, usePresenceStore, useUser } from '@sage3/frontend';

type useBoardUtils = {
  assignColor: (color: string, lassoApps: string[]) => void;
  assignKernel: (kernel: string, lassoApps: string[]) => void;
  alignSelectedApps: (align: string, lassoApps: string[]) => void;
  groupByTopic: (boardId: string, lassoApps: string[]) => void; // Stickies for now
  organizeApps: (boardId: string, by: 'app_type' | 'app_id', mode: 'tiles' | 'grid', lassoApps?: string[]) => void;
};

export function useBoardUtils(): useBoardUtils {
  // App Store
  const apps = useAppStore((state) => state.apps);
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
  // Board Store
  const updateBoard = useBoardStore((state) => state.update);
  // Presence Store
  const presences = usePresenceStore((state) => state.presences);
  // User
  const { user } = useUser();

  /**
   * Change the color of the selected apps to the given color
   *
   * @param color  color to assign to the apps
   * @param lassoApps  array of app ids
   * @returns  void
   */
  function assignColor(color: string, lassoApps: string[]) {
    type GroupStickieColorUpdate = {
      _id: string;
      data: {
        color: string;
      };
    }[];

    const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
    const changes = [] as GroupStickieColorUpdate;
    selectedApps.forEach((app) => {
      const change = { _id: app._id, data: { color: color } };
      changes.push(change);
    });
    for (const change of changes) {
      updateState(change._id, change.data);
    }
  }

  /**
   * Assign the selected kernel to the selected cells
   * @param kernel  kernel to assign to the cells
   * @param lassoApps  array of app ids
   * @returns  void
   */
  function assignKernel(kernel: string, lassoApps: string[]) {
    type GroupSAGECellKernelUpdate = {
      _id: string;
      data: {
        kernel: string;
      };
    }[];

    const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
    const changes = [] as GroupSAGECellKernelUpdate;
    selectedApps.forEach((app) => {
      const change = { _id: app._id, data: { kernel: kernel } };
      changes.push(change);
    });
    for (const change of changes) {
      updateState(change._id, change.data);
    }
  }

  /**
   * Rearrange the selected apps based on the given alignment type
   *
   * @param align  'left' | 'right' | 'top' | 'bottom' | 'column' | 'row' | 'grid' | 'center' | 'middle' | 'stack'
   * @param lassoApps  list of app ids
   * @returns  void
   */
  function alignSelectedApps(align: string, lassoApps: string[]) {
    type UpdatePartialAppState = {
      _id: string;
      data: {
        position: {
          x: number;
          y: number;
          z: number;
        };
        raised: boolean;
      };
    }[];

    const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
    // get the furthest left app
    const leftApp = selectedApps.reduce((prev, current) => (prev.data.position.x < current.data.position.x ? prev : current));
    // get the furthest right app
    const rightApp = selectedApps.reduce((prev, current) =>
      prev.data.position.x + prev.data.size.width > current.data.position.x + current.data.size.width ? prev : current
    );
    // get the far right x position
    const rightX = rightApp.data.position.x + rightApp.data.size.width;
    // get the furthest top app
    const topApp = selectedApps.reduce((prev, current) => (prev.data.position.y < current.data.position.y ? prev : current));
    // get the furthest bottom app
    const bottomApp = selectedApps.reduce((prev, current) =>
      prev.data.position.y + prev.data.size.height > current.data.position.y + current.data.size.height ? prev : current
    );
    const bottomY = bottomApp.data.position.y + bottomApp.data.size.height;
    const maxHeightApp = selectedApps.reduce((prev, current) => (prev.data.size.height > current.data.size.height ? prev : current));
    const maxWidthApp = selectedApps.reduce((prev, current) => (prev.data.size.width > current.data.size.width ? prev : current));
    const changes = [] as UpdatePartialAppState;

    selectedApps.forEach((app) => {
      // create a change object for each app
      const change = {
        _id: app._id,
        data: { position: { ...app.data.position }, raised: true },
      };
      const prevApp = selectedApps[selectedApps.indexOf(app) - 1];
      const gap = 10;

      switch (align) {
        case 'left': // align to the left of the left app
          change.data.position.x = leftApp.data.position.x;
          changes.push(change);
          break;
        case 'right': // align to the right of the right app
          change.data.position.x = rightX - app.data.size.width;
          changes.push(change);
          break;
        case 'top': // align to the top of the top app
          change.data.position.y = topApp.data.position.y;
          changes.push(change);
          break;
        case 'bottom': // align to the bottom of the bottom app
          change.data.position.y = bottomY - app.data.size.height;
          changes.push(change);
          break;
        case 'column': // align the apps in a column (move all apps to the leftmost app x position), then stack them on top of each other)
          change.data.position.x = leftApp.data.position.x;
          // keep the first app in the same y position, then each next app is moved down by the gap + the height of the previous app
          if (selectedApps.indexOf(app) === 0) {
            change.data.position.y = topApp.data.position.y;
          } else {
            change.data.position.y = changes[selectedApps.indexOf(app) - 1].data.position.y + gap * 2 + prevApp.data.size.height;
          }
          changes.push(change);
          break;
        case 'row': // align the apps in a row (move all apps to the topmost app y position), then stack them on top of each other)
          change.data.position.y = topApp.data.position.y;
          // keep the first app in the same x position, then each next app is moved right by the gap + the width of the previous app
          if (selectedApps.indexOf(app) === 0) {
            change.data.position.x = leftApp.data.position.x;
          } else {
            change.data.position.x = changes[selectedApps.indexOf(app) - 1].data.position.x + gap * 2 + prevApp.data.size.width;
          }
          changes.push(change);
          break;
        case 'grid': // align the apps in a grid
          {
            const numCols = Math.ceil(Math.sqrt(selectedApps.length));
            const numRows = Math.ceil(selectedApps.length / numCols);
            const colGrid = selectedApps.indexOf(app) % numCols;
            const rowGrid = Math.floor(selectedApps.indexOf(app) / numCols);
            const widthGrid = rightX - leftApp.data.position.x + leftApp.data.size.width;
            const heightGrid = bottomY - topApp.data.position.y + topApp.data.size.height;
            const colWidthGrid = widthGrid / numCols;
            const rowHeightGrid = heightGrid / numRows;
            change.data.position.x = leftApp.data.position.x + colGrid * colWidthGrid;
            change.data.position.y = topApp.data.position.y + rowGrid * rowHeightGrid;
            changes.push(change);
          }
          break;
        case 'center': // center the apps in the column based on the widest app
          change.data.position.x = leftApp.data.position.x + (maxWidthApp.data.size.width - app.data.size.width) / 2;
          changes.push(change);
          break;
        case 'middle': // center the apps in the row based on the tallest app
          change.data.position.y = topApp.data.position.y + (maxHeightApp.data.size.height - app.data.size.height) / 2;
          changes.push(change);
          break;
        case 'stack': // stack the apps on top of each other (make them raised so they don't overlap)
          change.data.position.x = leftApp.data.position.x + gap * 2 * selectedApps.indexOf(app);
          change.data.position.y = topApp.data.position.y + gap * 2 * selectedApps.indexOf(app);
          changes.push(change);
          break;
      }
    });
    // Apply the changes
    for (const change of changes) {
      update(change._id, change.data);
    }
  }

  /**
   * PYTHON SMART FUNCTIONS - Require Board ID to Call the Smart Function in the Backend
   */

  /**
   * Group apps by topic using the smart function group_by_topic in the backend (Python)
   *
   * @param boardId  board id
   * @param lassoApps  array of app ids
   * @returns  void
   */
  function groupByTopic(boardId: string, lassoApps?: string[]) {
    const presence = presences.filter((el) => el.data.boardId === boardId).filter((el) => el.data.userId === user?._id)[0];
    const viewportPosition = presence.data.viewport.position;
    const viewportSize = presence.data.viewport.size;

    // Trigger the smart function
    updateBoard(boardId, {
      executeInfo: {
        executeFunc: 'group_by_topic',
        params: {
          viewport_position: viewportPosition,
          viewport_size: viewportSize,
          selected_apps: lassoApps,
        },
      },
    });
  }

  /**
   * Organize the apps based on the given type and mode (tiles or grid)
   *
   * @param boardId  board id
   * @param by  'app_type' | 'app_id'
   * @param mode  'tiles' | 'grid'
   * @param lassoApps  list of app ids
   * @returns  void
   */
  function organizeApps(boardId: string, by: 'app_type' | 'app_id', mode: 'tiles' | 'grid', lassoApps?: string[]) {
    const presence = presences.filter((el) => el.data.boardId === boardId).filter((el) => el.data.userId === user?._id)[0];
    const viewportPosition = presence.data.viewport.position;
    const viewportSize = presence.data.viewport.size;

    // Trigger the smart function
    updateBoard(boardId, {
      executeInfo: {
        executeFunc: 'reorganize_layout',
        params: {
          viewport_position: viewportPosition,
          viewport_size: viewportSize,
          by: by,
          mode: mode,
          selected_apps: lassoApps,
        },
      },
    });
  }

  return {
    assignColor,
    assignKernel,
    alignSelectedApps,
    groupByTopic,
    organizeApps,
  };
}
