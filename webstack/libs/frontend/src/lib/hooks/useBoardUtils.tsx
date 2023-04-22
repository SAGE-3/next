import { useAppStore, useBoardStore, usePresenceStore, useUser } from '@sage3/frontend';
import { useParams } from 'react-router-dom';

type useBoardUtils = {
  organizeApps: (by: 'app_type' | 'app_id', mode: 'tiles' | 'grid', lassoApps?: string[]) => void;
  storeLayout: () => void;
  restoreLayout: () => void;
  alignSelectedApps: (align: 'left' | 'right' | 'top' | 'bottom' | 'even' | 'stack', lassoApps: string[]) => void;
};

export function useBoardUtils(): useBoardUtils {
  const presences = usePresenceStore((state) => state.presences);
  const updateBoard = useBoardStore((state) => state.update);
  const update = useAppStore((state) => state.update);
  const { user } = useUser();
  const apps = useAppStore((state) => state.apps);
  const { boardId } = useParams<{ boardId: string }>();

  function storeLayout() {
    if (boardId === undefined) {
      return;
    }
    // Trigger the smart function to store the current layout
    updateBoard(boardId, {
      executeInfo: {
        executeFunc: 'store_layout',
        params: {},
      },
    });
  }

  function restoreLayout() {
    if (boardId === undefined) {
      return;
    }
    // Trigger the smart function
    updateBoard(boardId, {
      executeInfo: {
        executeFunc: 'restore_layout',
        params: {},
      },
    });
  }

  function organizeApps(by: 'app_type' | 'app_id', mode: 'tiles' | 'grid', lassoApps?: string[]) {
    if (boardId === undefined) {
      return;
    }
    const presence = presences.filter((el) => el.data.boardId === boardId).filter((el) => el.data.userId === user?._id)[0];
    const viewportPosition = presence.data.viewport.position;
    const viewportSize = presence.data.viewport.size;

    // storeLayout(boardId);
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

  function alignSelectedApps(align: 'left' | 'right' | 'top' | 'bottom' | 'even' | 'stack', lassoApps: string[]) {
    if (boardId === undefined) {
      return;
    }
    // This is a simple function, no need to inform Python but we should store the info
    // storeLayout(boardId);
    const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
    // get the furthest left app
    const leftApp = selectedApps.reduce((prev, current) => (prev.data.position.x < current.data.position.x ? prev : current));
    // get the furthest right app
    const rightApp = selectedApps.reduce((prev, current) => (prev.data.position.x > current.data.position.x ? prev : current));
    const rightX = rightApp.data.position.x + rightApp.data.size.width;
    // get the furthest top app
    const topApp = selectedApps.reduce((prev, current) => (prev.data.position.y < current.data.position.y ? prev : current));
    // get the furthest bottom app
    const bottomApp = selectedApps.reduce((prev, current) => (prev.data.position.y > current.data.position.y ? prev : current));
    const bottomY = bottomApp.data.position.y + bottomApp.data.size.height;
    const changes = [] as { _id: string; data: { position: { x: number; y: number; z: number } } }[];

    selectedApps.forEach((app) => {
      let change = { _id: app._id, data: { position: { ...app.data.position } } };

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
          const numCols = Math.ceil(Math.sqrt(selectedApps.length));
          const numRows = Math.ceil(selectedApps.length / numCols);
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
        case 'stack': // stack the apps on top of each other
          const gap = 10;
          change.data.position.x = leftApp.data.position.x + gap * selectedApps.indexOf(app);
          change.data.position.y = topApp.data.position.y + gap * selectedApps.indexOf(app);
          changes.push(change);
          break;
      }
    });
    for (const change of changes) {
      update(change._id, change.data);
    }
  }

  return { storeLayout, restoreLayout, organizeApps, alignSelectedApps };
}
