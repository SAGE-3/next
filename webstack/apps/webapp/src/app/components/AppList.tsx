/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Button, useColorModeValue } from "@chakra-ui/react";
import { useAppStore } from "@sage3/frontend";
import { BoardSchema, RoomSchema } from "@sage3/shared/types";
import React, { Suspense, useEffect } from "react";
import { Applications } from '@sage3/applications/apps';

type AppListProps = {
  selectedRoom: RoomSchema;
  selectedBoard: BoardSchema;
}

export function AppList(props: AppListProps) {

  const apps = useAppStore((state) => state.apps);
  const createApp = useAppStore((state) => state.create);
  const subToBoard = useAppStore((state) => state.subscribeByBoardId);

  // const borderColor = useColorModeValue("#718096", "#A0AEC0");
  function handleCounterClick() {
    createApp('Counter', 'Counter Description', props.selectedRoom.id, props.selectedBoard.id, 'Counter', { count: 5 });
  }

  useEffect(() => {
    subToBoard(props.selectedBoard.id);
  }, [props.selectedBoard.id, subToBoard]);

  return (
    <>
      {apps.map((app) => {
        const Component = Applications[app.type];
        return (
          <Suspense key={app.id} fallback={<div>Loading App</div>}>
            <div key={app.id} style={{ margin: 3 }}>
              <Component key={app.id} {...app}></Component>
            </div>
          </Suspense>
        );
      })}

      <Button onClick={handleCounterClick}>Counter App</Button>

    </>
  )
}