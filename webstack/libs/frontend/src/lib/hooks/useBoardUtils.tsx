import { useBoardStore, usePresenceStore } from '@sage3/frontend';

type useBoardUtils = {
  organizeApps: (by: 'app_type' | 'app_id', mode: 'tiles' | 'grid', boardId: string, userId: string) => void;
  restoreLayout: (boardId: string) => void;
  // alignSelectedApps: (align: 'left' | 'right' | 'top' | 'bottom' | 'even' | 'stack') => void;
};

export function useBoardUtils(): useBoardUtils {
  const presences = usePresenceStore((state) => state.presences);
  const updateBoard = useBoardStore((state) => state.update);

  function organizeApps(by: 'app_type' | 'app_id', mode: 'tiles' | 'grid', boardId: string, userId: string) {
    const presence = presences.filter((el) => el.data.boardId === boardId).filter((el) => el.data.userId === userId)[0];
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
        },
      },
    });
  }
  function restoreLayout(boardId: string) {
    // Trigger the smart function
    updateBoard(boardId, {
      executeInfo: {
        executeFunc: 'restore_layout',
        params: {},
      },
    });
  }

  // send the lassoed apps to the function that will align them
  // interface AlignSelectedAppsProps {
  //   align: 'left' | 'right' | 'top' | 'bottom' | 'even' | 'stack';
  //   lassoApps: string[];
  //   boardId: string;
  // }

  // const alignSelectedApps = (align: 'left' | 'right' | 'top' | 'bottom' | 'even' | 'stack') => {
  //   const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
  //   // get the furthest left app
  //   const leftApp = selectedApps.reduce((prev, current) => (prev.data.position.x < current.data.position.x ? prev : current));
  //   // get the furthest right app
  //   const rightApp = selectedApps.reduce((prev, current) => (prev.data.position.x > current.data.position.x ? prev : current));
  //   const rightX = rightApp.data.position.x + rightApp.data.size.width;
  //   // get the furthest top app
  //   const topApp = selectedApps.reduce((prev, current) => (prev.data.position.y < current.data.position.y ? prev : current));
  //   // get the furthest bottom app
  //   const bottomApp = selectedApps.reduce((prev, current) => (prev.data.position.y > current.data.position.y ? prev : current));
  //   const bottomY = bottomApp.data.position.y + bottomApp.data.size.height;

  //   selectedApps.forEach((app) => {
  //     switch (align) {
  //       case 'left':
  //         app.data.position.x = leftApp.data.position.x;
  //         break;
  //       case 'right':
  //         app.data.position.x = rightX - app.data.size.width;
  //         break;
  //       case 'top':
  //         app.data.position.y = topApp.data.position.y;
  //         break;
  //       case 'bottom':
  //         app.data.position.y = bottomY - app.data.size.height;
  //         break;
  //       case 'even':
  //         // evenly space the apps in a grid
  //         const numCols = Math.ceil(Math.sqrt(selectedApps.length));
  //         const numRows = Math.ceil(selectedApps.length / numCols);
  //         const col = selectedApps.indexOf(app) % numCols;
  //         const row = Math.floor(selectedApps.indexOf(app) / numCols);
  //         const width = rightX - leftApp.data.position.x;
  //         const height = bottomY - topApp.data.position.y;
  //         const colWidth = width / numCols;
  //         const rowHeight = height / numRows;
  //         app.data.position.x = leftApp.data.position.x + col * colWidth;
  //         app.data.position.y = topApp.data.position.y + row * rowHeight;
  //         break;
  //       case 'stack':
  //         // stack the apps on top of each other with a small gap to show they are stacked (diagonally)
  //         const gap = 10;
  //         app.data.position.x = leftApp.data.position.x + gap * selectedApps.indexOf(app);
  //         app.data.position.y = topApp.data.position.y + gap * selectedApps.indexOf(app);
  //         break;
  //     }
  //   });
  // };

  return { organizeApps, restoreLayout };
}
