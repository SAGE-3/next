/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { UserAvatarGroup } from './UserAvatarGroup';
import { Panel } from '../Panel';

export interface AvatarProps {
  boardId: string;
  roomId: string;
}

export function UsersPanel(props: AvatarProps) {
  return (
    <Panel title={'Users'} name="users" width={0} showClose={false} zIndex={100}>
      <UserAvatarGroup boardId={props.boardId} />
    </Panel>
  );
}
