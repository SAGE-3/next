/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box } from '@chakra-ui/react';
import { Applications, initialValues } from '@sage3/applications/apps';
import { AppName } from '@sage3/applications/schema';
import { ContextMenu, useAppStore, useBoardStore, useUIStore, useUser } from '@sage3/frontend';
import { BoardContextMenu } from './UI/BoardContextMenu';
import { BoardFooter } from './UI/BoardFooter';
import { BoardHeader } from './UI/BoardHeader';
import { ButtonPanel, Panel } from './UI/Panel';

type UILayerProps = {
  boardId: string;
  roomId: string;
};

export function UILayer(props: UILayerProps) {
  // Boards
  const boards = useBoardStore((state) => state.boards);
  const board = boards.find((el) => el._id === props.boardId);

  // UI Store
  const boardPosition = useUIStore((state) => state.boardPosition);

  // User
  const { user } = useUser();

  // Apps
  const apps = useAppStore((state) => state.apps);
  const createApp = useAppStore((state) => state.create);
  const deleteApp = useAppStore((state) => state.delete);

  const newApplication = (appName: AppName) => {
    if (!user) return;
    createApp({
      name: appName,
      description: appName + '>',
      roomId: props.roomId,
      boardId: props.boardId,
      position: { x: boardPosition.x, y: boardPosition.y, z: 0 },
      size: { width: 400, height: 400, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: appName,
      state: { ...(initialValues[appName] as any) },
      ownerId: user._id || '',
      minimized: false,
      raised: true,
    });
  };

  return (
    <Box display="flex" flexDirection="column" height="100vw">
      {/* Top Bar */}
      <BoardHeader boardName={board?.data.name ? board.data.name : ''} boardId={props.boardId} />

      <Panel title={'Applications'} opened={true}>
        {Object.keys(Applications).map((appName) => (
          <ButtonPanel key={appName} title={appName} onClick={(e) => newApplication(appName as AppName)} />
        ))}
      </Panel>
      <ContextMenu divId="board">
        <BoardContextMenu
          boardId={props.boardId}
          roomId={props.roomId}
          clearBoard={() => apps.forEach((a) => deleteApp(a._id))}
        ></BoardContextMenu>
      </ContextMenu>

      <Panel title={'Quick Actions'} opened={true}>
        <ButtonPanel title="Cell" onClick={() => newApplication('CodeCell' as AppName)} />
        <ButtonPanel title="Stickie" onClick={() => newApplication('Stickie' as AppName)} />
        <ButtonPanel title="Webview" onClick={() => newApplication('Webview' as AppName)} />
        <ButtonPanel title="Screenshare" onClick={() => newApplication('Screenshare' as AppName)} />
        <ButtonPanel title="Clear Board" onClick={() => apps.forEach((a) => deleteApp(a._id))} />
      </Panel>

      {/* Bottom Bar */}
      <BoardFooter boardId={props.boardId} roomId={props.roomId}></BoardFooter>
    </Box>
  );
}
