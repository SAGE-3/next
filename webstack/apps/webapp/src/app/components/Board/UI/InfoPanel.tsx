/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, useColorModeValue, Text, Avatar, Tooltip, Icon } from '@chakra-ui/react';
import { useAppStore, useUIStore, useUser, initials, useTwilioStore } from '@sage3/frontend';
import { useState } from 'react';
import { Rnd } from 'react-rnd';
import { AvatarGroup } from './AvatarGroup';
import { sageColorByName } from '@sage3/shared';
import { SiTwilio } from 'react-icons/si';

type InfoPanelProps = {
  position: { x: number; y: number };
  boardId: string;
  title: string;
  setPosition: (pos: { x: number; y: number }) => void;
};

export function InfoPanel(props: InfoPanelProps) {
  // App Store
  const apps = useAppStore((state) => state.apps);
  // UI store
  const showUI = useUIStore((state) => state.showUI);
  // Theme
  const panelBackground = useColorModeValue('gray.50', '#4A5568');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');
  // Twilio
  const room = useTwilioStore((state) => state.room);

  const [hover, setHover] = useState(false);
  // User information
  const { user } = useUser();

  function handleDblClick(e: any) {
    e.stopPropagation();
  }

  if (showUI)
    return (
      <Rnd
        // default={{ x: props.position.x, y: props.position.y, width: '100%', height: '100px' }}
        position={{ ...props.position }}
        bounds="window"
        onDoubleClick={handleDblClick}
        onDragStart={() => setHover(true)}
        onDragStop={(e, data) => {
          setHover(false);
          props.setPosition({ x: data.x, y: data.y });
        }}
        enableResizing={false}
        dragHandleClassName="handle" // only allow dragging the header
        style={{ transition: hover ? 'none' :'all 0.3s' }}
      >
        <Box
          display="flex"
          boxShadow="outline"
          transition="all .5s "
          bg={panelBackground}
          p="2"
          rounded="md"
        >
          <Box
            width="25px"
            backgroundImage={`radial-gradient(${gripColor} 2px, transparent 0)`}
            backgroundPosition="0 0"
            backgroundSize="8px 8px"
            mr="2"
            cursor="move"
            className="handle"
          />

          <Box display="flex" flexDirection="column">
            <Box display="flex" justifyContent={'left'}>
              <Text w="100%" textAlign="center" color={textColor} fontSize={18} fontWeight="bold" h={'auto'} userSelect={'none'}  className="handle">
                {props.title}
              </Text>
              <Tooltip pointerEvents={'all'} label={room ? 'Twilio Connected' : 'Twilio Disconnected'}>
                <Box pointerEvents={'all'} mx={1}>
                  <Icon fontSize="24px" color={room ? 'green' : 'red'} as={SiTwilio} />
                </Box>
              </Tooltip>
            </Box>
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
          </Box>
        </Box>
      </Rnd>
    );
  else return null;
}
