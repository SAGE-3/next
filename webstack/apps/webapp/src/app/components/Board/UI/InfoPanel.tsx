/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useState, useEffect } from 'react';
import { Box, useColorModeValue, Text, Avatar, Tooltip, Icon, useToast } from '@chakra-ui/react';

import { Rnd } from 'react-rnd';
import { SiTwilio } from 'react-icons/si';

import { useAppStore, useUIStore, useUser, initials, useTwilioStore } from '@sage3/frontend';
import { sageColorByName } from '@sage3/shared';
import { AvatarGroup } from './AvatarGroup';

type InfoPanelProps = {
  position: { x: number; y: number };
  boardId: string;
  title: string;
  setPosition: (pos: { x: number; y: number }) => void;
  stuck?: boolean;
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
  // Put in a corner
  const [stuck, setStuck] = useState(props.stuck || false);

  const [hover, setHover] = useState(false);
  // User information
  const { user } = useUser();

  // Toast
  const toast = useToast();

  function handleDblClick(e: any) {
    e.stopPropagation();
  }
  const handleCopyId = () => {
    navigator.clipboard.writeText(props.boardId);
    toast({
      title: 'Success',
      description: `BoardID Copied to Clipboard`,
      duration: 3000,
      isClosable: true,
      status: 'success',
    });
  };
  useEffect(() => {
    if (stuck) {
      props.setPosition({ x: 5, y: 5 });
    }
  }, [stuck]);

  if (showUI)
    return (
      <Rnd
        position={{ ...props.position }}
        bounds="window"
        onDoubleClick={handleDblClick}
        onDragStart={() => setHover(true)}
        onDragStop={(e, data) => {
          setHover(false);
          props.setPosition({ x: data.x, y: data.y });
          // top left corner
          if (data.x < 5 && data.y < 5) {
            setStuck(true);
          } else {
            setStuck(false);
          }
        }}
        enableResizing={false}
        dragHandleClassName="handle" // only allow dragging the header
        style={{ transition: hover ? 'none' : 'all 0.2s' }}
      >
        <Box display="flex" boxShadow={stuck ? 'base' : 'outline'} transition="all .2s " bg={panelBackground} p="2" rounded="md">
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
              <Tooltip pointerEvents={'all'} label={'Copy BoardID to Clipboard'} placement="top" hasArrow>
                <Text
                  w="100%"
                  textAlign="center"
                  color={textColor}
                  fontSize={18}
                  fontWeight="bold"
                  h={'auto'}
                  userSelect={'none'}
                  className="handle"
                  onClick={handleCopyId}
                  cursor="pointer"
                >
                  {props.title}
                </Text>
              </Tooltip>

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
