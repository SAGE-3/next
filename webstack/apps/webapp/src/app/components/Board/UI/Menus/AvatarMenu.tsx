/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

 import { Avatar, Box } from '@chakra-ui/react';
 import { useAppStore, useUIStore, useUser , initials, useBoardStore} from '@sage3/frontend';
 import { useNavigate } from 'react-router';
import { AvatarGroup } from '../AvatarGroup';
import { sageColorByName } from '@sage3/shared';
 import { ButtonPanel, Panel , PanelProps} from '../Panel';

 export interface AvatarProps {
    boardId: string;
  };

 export function AvatarMenu(props: AvatarProps){
    //const setAvatarPanelPosition = props.setPosition;
    //const menuAvatarPosition = props.position;
    const boardPosition = useUIStore((state) => state.boardPosition);
    const boards = useBoardStore((state) => state.boards);
    const board = boards.find((el) => el._id === props.boardId);

    const position = useUIStore((state) => state.avatarMenu.position);
    const setPosition = useUIStore((state) => state.avatarMenu.setPosition);
    const opened = useUIStore((state) => state.avatarMenu.opened);
    const setOpened = useUIStore((state) => state.avatarMenu.setOpened);
    // User information
    const { user } = useUser();
    
    return(
        <Panel title={board?.data.name ? board.data.name : ''} opened={opened} setOpened={setOpened} setPosition={setPosition} position={position}  >
           <Box alignItems="center" p="1" width="100%" display="flex">
              {/* User Avatar */}
              <Avatar
                size="sm"
                pointerEvents={'all'}
                name={user?.data.name}
                getInitials={initials}
                backgroundColor={user ? sageColorByName(user.data.color) : ''}
                color="white"
                border="2px solid white"
                mx={1}
              />
              {/* Avatar Group */}
              <AvatarGroup boardId={props.boardId} />
            </Box>
        </Panel>
    );
      
 }

 