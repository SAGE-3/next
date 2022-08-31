/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

 import { Avatar, Box } from '@chakra-ui/react';
 import { useAppStore, useUIStore, useUser , initials, useBoardStore, StuckTypes, useRoomStore} from '@sage3/frontend';
 import { useNavigate } from 'react-router';
import { AvatarGroup } from '../AvatarGroup';
import { sageColorByName } from '@sage3/shared';
 import { ButtonPanel, Panel , PanelProps} from '../Panel';
import { useEffect } from 'react';

 export interface AvatarProps {
    boardId: string;
    roomId: string;
  };

 export function AvatarMenu(props: AvatarProps){
    //const setAvatarPanelPosition = props.setPosition;
    //const menuAvatarPosition = props.position;
    const boardPosition = useUIStore((state) => state.boardPosition);
    const boards = useBoardStore((state) => state.boards);
    const board = boards.find((el) => el._id === props.boardId);
    const rooms = useRoomStore((state) => state.rooms);
    const room = rooms.find((el) => el._id === props.roomId);

    const position = useUIStore((state) => state.avatarMenu.position);
    const setPosition = useUIStore((state) => state.avatarMenu.setPosition);
    const opened = useUIStore((state) => state.avatarMenu.opened);
    const setOpened = useUIStore((state) => state.avatarMenu.setOpened);
    const show = useUIStore((state) => state.avatarMenu.show);
    const setShow = useUIStore((state) => state.avatarMenu.setShow);
    const stuck = useUIStore((state) => state.avatarMenu.stuck);
    const setStuck = useUIStore((state) => state.avatarMenu.setStuck);

    const controllerPosition = useUIStore((state) => state.controller.position);
    // if a menu is currently closed, make it "jump" to the controller
    useEffect(() => {
        if (!show) {
            setPosition({x: controllerPosition.x+140, y: controllerPosition.y + 90});
            setStuck(StuckTypes.Controller);
        }
    }, [show ]);
    useEffect(() => {
        if (stuck == StuckTypes.Controller) {
            setPosition({x: controllerPosition.x+140, y: controllerPosition.y + 90})
        }
    }, [controllerPosition ]);
    
    // User information
    const { user } = useUser();
    
    return(
        <Panel 
            title={(room?.data.name ? room.data.name : '') + " > " + (board?.data.name ? board.data.name : '')} 
            opened={opened} 
            setOpened={setOpened} 
            setPosition={setPosition} 
            position={position} 
            width={330} 
            showClose={true}
            show={show} 
            setShow={setShow}
            stuck={stuck}
            setStuck={setStuck}
            >
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


function y(x: any, arg1: number, y: any, arg3: number) {
    throw new Error('Function not implemented.');
}
 