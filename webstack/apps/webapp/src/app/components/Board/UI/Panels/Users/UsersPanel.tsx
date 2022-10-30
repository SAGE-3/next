/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect } from 'react';

import { useUIStore, useUser, StuckTypes, useHexColor } from '@sage3/frontend';
import { UserAvatarGroup } from './UserAvatarGroup';
import { Panel } from '../Panel';

export interface AvatarProps {
  boardId: string;
  roomId: string;
}

export function UsersPanel(props: AvatarProps) {
  const position = useUIStore((state) => state.usersPanel.position);
  const setPosition = useUIStore((state) => state.usersPanel.setPosition);
  const opened = useUIStore((state) => state.usersPanel.opened);
  const setOpened = useUIStore((state) => state.usersPanel.setOpened);
  const show = useUIStore((state) => state.usersPanel.show);
  const setShow = useUIStore((state) => state.usersPanel.setShow);
  const stuck = useUIStore((state) => state.usersPanel.stuck);
  const setStuck = useUIStore((state) => state.usersPanel.setStuck);
  const zIndex = useUIStore((state) => state.panelZ).indexOf('users');

  const controllerPosition = useUIStore((state) => state.controller.position);
  // if a menu is currently closed, make it "jump" to the controller
  useEffect(() => {
    if (!show) {
      setPosition({ x: controllerPosition.x + 40, y: controllerPosition.y + 95 });
      setStuck(StuckTypes.Controller);
    }
  }, [show]);
  useEffect(() => {
    if (stuck == StuckTypes.Controller) {
      setPosition({ x: controllerPosition.x + 40, y: controllerPosition.y + 95 });
    }
  }, [controllerPosition]);

  // User information
  const { user } = useUser();
  const color = useHexColor(user?.data.color || 'gray');

  return (
    <Panel
      title={'Users'}
      name="users"
      opened={opened}
      setOpened={setOpened}
      setPosition={setPosition}
      position={position}
      width={0}
      showClose={true}
      show={show}
      setShow={setShow}
      stuck={stuck}
      setStuck={setStuck}
      zIndex={zIndex}
    >
      <UserAvatarGroup boardId={props.boardId} />
    </Panel>
  );
}
