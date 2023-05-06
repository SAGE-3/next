/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore, useBoardStore, usePresenceStore, useUser } from '@sage3/frontend';
import { useParams } from 'react-router-dom';

type useBoardUtils = {
  organizeApps: (by: 'app_type' | 'app_id', mode: 'tiles' | 'grid', lassoApps?: string[]) => void;
  storeLayout: () => void;
  restoreLayout: () => void;
  alignSelectedApps: (align: string, lassoApps: string[]) => void;
  // alignSelectedApps: (align: 'left' | 'right' | 'top' | 'bottom' | 'even' | 'column' | 'stack', lassoApps: string[]) => void;
  assignColor: (color: string, lassoApps: string[]) => void;
  groupByTopic: (lassoApps: string[]) => void; // Stickies for now
};

export function useBoardUtils(): useBoardUtils {
  const presences = usePresenceStore((state) => state.presences);
  const updateBoard = useBoardStore((state) => state.update);
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
  const { user } = useUser();
  const apps = useAppStore((state) => state.apps);
  const { boardId } = useParams<{ boardId: string }>();

  /**
   * Calls a smart function to store the current layout of the board
   * (apps, positions, sizes, etc.) in the database
   *  - This is used to restore the layout of the board when the user
   *    makes changes to the layout and wants to restore it to the
   *    original layout
   *
   * @returns void
   */
  function storeLayout() {
    if (boardId === undefined) {
      return;
    }
    const presence = presences.filter((el) => el.data.boardId === boardId).filter((el) => el.data.userId === user?._id)[0];
    const viewportPosition = presence.data.viewport.position;
    const viewportSize = presence.data.viewport.size;
    const viewport = {
      position: {
        x: viewportPosition.x,
        y: viewportPosition.y,
      },
      size: {
        width: viewportSize.width,
        height: viewportSize.height,
      },
    };
    const appStates = apps.map((app) => ({
      id: app._id,
      position: {
        x: app.data.position.x,
        y: app.data.position.y,
      },
      size: {
        width: app.data.size.width,
        height: app.data.size.height,
      },
    }));

    // create a local storage item to store the layout for now
    localStorage.setItem('boardLayout', JSON.stringify({ viewport, appStates }));

    // Trigger the smart function to store the current layout
    //   updateBoard(boardId, {
    //     executeInfo: {
    //       executeFunc: 'store_layout',
    //       params: { },
    //     },
    //   });
    // }
  }

  /**
   * Calls a smart function to restore the layout of the board
   * (apps, positions, sizes, etc.) from the database
   * - This is used to restore the layout of the board when the user
   *  makes changes to the layout and wants to restore it to the
   *  original layout
   * @returns void
   */
  function restoreLayout() {
    if (boardId === undefined) {
      return;
    }

    // get the layout from local storage for now
    const layout = JSON.parse(localStorage.getItem('boardLayout') || '{}');
    const { viewport, appStates } = layout;
    // update the apps with the stored layout
    appStates.forEach((appState: any) => {
      const app = apps.filter((el) => el._id === appState.id)[0];
      updateState(appState._id, {
        position: {
          x: appState.position.x,
          y: appState.position.y,
        },
        size: {
          width: appState.size.width,
          height: appState.size.height,
        },
      });
    });

    // Trigger the smart function
    // updateBoard(boardId, {
    //   executeInfo: {
    //     executeFunc: 'restore_layout',
    //     params: { },
    //   },
    // });
  }

  /**
   * Organize the apps based on the given type and mode (tiles or grid)
   *
   * @param by  'app_type' | 'app_id'
   * @param mode  'tiles' | 'grid'
   * @param lassoApps  list of app ids
   * @returns  void
   */
  function organizeApps(by: 'app_type' | 'app_id', mode: 'tiles' | 'grid', lassoApps?: string[]) {
    if (boardId === undefined) {
      return;
    }
    const presence = presences.filter((el) => el.data.boardId === boardId).filter((el) => el.data.userId === user?._id)[0];
    const viewportPosition = presence.data.viewport.position;
    const viewportSize = presence.data.viewport.size;

    storeLayout();
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

  /**
   * Rearrange the selected apps based on the given alignment type
   *
   * @param align  'left' | 'right' | 'top' | 'bottom' | 'even' | 'column' | 'stack'
   * @param lassoApps  list of app ids
   * @returns  void
   */
  // function alignSelectedApps(align: 'left' | 'right' | 'top' | 'bottom' | 'even' | 'column' | 'stack', lassoApps: string[]) {
  function alignSelectedApps(align: string, lassoApps: string[]) {
    if (boardId === undefined) {
      return;
    }
    const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
    // get the furthest left app
    const leftApp = selectedApps.reduce((prev, current) => (prev.data.position.x < current.data.position.x ? prev : current));
    // get the furthest right app
    const rightApp = selectedApps.reduce((prev, current) => (prev.data.position.x > current.data.position.x ? prev : current));
    // get the far right x position
    const rightX = rightApp.data.position.x + rightApp.data.size.width;
    // get the furthest top app
    const topApp = selectedApps.reduce((prev, current) => (prev.data.position.y < current.data.position.y ? prev : current));
    // get the furthest bottom app
    const bottomApp = selectedApps.reduce((prev, current) => (prev.data.position.y > current.data.position.y ? prev : current));
    const bottomY = bottomApp.data.position.y + bottomApp.data.size.height;
    const maxHeightApp = selectedApps.reduce((prev, current) => (prev.data.size.height > current.data.size.height ? prev : current));
    const maxWidthApp = selectedApps.reduce((prev, current) => (prev.data.size.width > current.data.size.width ? prev : current));
    const changes = [] as { _id: string; data: { position: { x: number; y: number; z: number } } }[];

    selectedApps.forEach((app) => {
      let change = { _id: app._id, data: { position: { ...app.data.position }, raised: true } };
      const gap = 10;
      const numCols = Math.ceil(Math.sqrt(selectedApps.length));
      const numRows = Math.ceil(selectedApps.length / numCols);
      const prevApp = selectedApps[selectedApps.indexOf(app) - 1];

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
        case 'even': // evenly space the apps
          const col = selectedApps.indexOf(app) % numCols;
          const row = Math.floor(selectedApps.indexOf(app) / numCols);
          const width = rightX - leftApp.data.position.x + leftApp.data.size.width;
          const height = bottomY - topApp.data.position.y + topApp.data.size.height;
          const colWidth = width / numCols;
          const rowHeight = height / numRows;
          change.data.position.x = leftApp.data.position.x + col * colWidth;
          change.data.position.y = topApp.data.position.y + row * rowHeight;
          changes.push(change);
          break;
        case 'column': // align the apps in a column (move all apps to the leftmost app x position), then stack them on top of each other)
          change.data.position.x = leftApp.data.position.x;
          // keep the first app in the same y position, then each next app is moved down by the gap + the height of the previous app
          if (selectedApps.indexOf(app) === 0) {
            change.data.position.y = topApp.data.position.y;
          } else {
            change.data.position.y = changes[selectedApps.indexOf(app) - 1].data.position.y + gap + prevApp.data.size.height;
          }
          changes.push(change);
          break;
        case 'row': // align the apps in a row (move all apps to the topmost app y position), then stack them on top of each other)
          change.data.position.y = topApp.data.position.y;
          // keep the first app in the same x position, then each next app is moved right by the gap + the width of the previous app
          if (selectedApps.indexOf(app) === 0) {
            change.data.position.x = leftApp.data.position.x;
          } else {
            change.data.position.x = changes[selectedApps.indexOf(app) - 1].data.position.x + gap + prevApp.data.size.width;
          }
          changes.push(change);
          break;
        case 'grid': // align the apps in a grid
          const colGrid = selectedApps.indexOf(app) % numCols;
          const rowGrid = Math.floor(selectedApps.indexOf(app) / numCols);
          const widthGrid = rightX - leftApp.data.position.x + leftApp.data.size.width;
          const heightGrid = bottomY - topApp.data.position.y + topApp.data.size.height;
          const colWidthGrid = widthGrid / numCols;
          const rowHeightGrid = heightGrid / numRows;
          change.data.position.x = leftApp.data.position.x + colGrid * colWidthGrid;
          change.data.position.y = topApp.data.position.y + rowGrid * rowHeightGrid;
          changes.push(change);
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
    for (const change of changes) {
      update(change._id, change.data);
    }
  }

  /**
   * Change the color of the selected apps to the given color
   *
   * @param color  color to assign to the apps
   * @param lassoApps  array of app ids
   * @returns  void
   */
  function assignColor(color: string, lassoApps: string[]) {
    if (boardId === undefined) {
      return;
    }
    const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
    const changes = [] as { _id: string; data: { color: string } }[];
    storeLayout();
    selectedApps.forEach((app) => {
      let change = { _id: app._id, data: { color: color } };
      changes.push(change);
    });
    for (const change of changes) {
      updateState(change._id, change.data);
    }
  }

  /**
   * Group apps by topic using the smart function group_by_topic in the backend (Python)
   *
   * @param lassoApps  array of app ids
   * @returns  void
   */
  function groupByTopic(lassoApps?: string[]) {
    if (boardId === undefined) {
      return;
    }
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

  return { storeLayout, restoreLayout, organizeApps, alignSelectedApps, assignColor, groupByTopic };
}
