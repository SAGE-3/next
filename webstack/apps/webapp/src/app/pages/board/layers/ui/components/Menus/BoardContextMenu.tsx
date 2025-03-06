/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect } from 'react';
import { Box, Flex, IconButton, Tooltip, useColorMode, useColorModeValue, useDisclosure } from '@chakra-ui/react';

import { HiChip, HiPuzzle } from 'react-icons/hi';
import { IoSparklesSharp } from 'react-icons/io5';
import { MdApps, MdArrowBack, MdFolder, MdMap, MdPeople, MdScreenShare } from 'react-icons/md';

import { SAGEColors } from '@sage3/shared';
import { useUser, useUIStore, useHexColor } from '@sage3/frontend';

import { ContextButton } from './ContextButton';
import { ScreenshareMenu } from './Menus/ScreenshareMenu';
import { Interactionbar } from '../Interactionbar';
import { ApplicationsMenu, AssetsMenu, KernelsMenu, NavigationMenu, PluginsMenu, UsersMenu } from './Menus';

type BoardContextProps = {
  roomId: string;
  boardId: string;
  clearBoard: () => void;
  showAllApps: () => void;
  downloadRoomAssets: (ids: string[]) => void;
  backHomeClick: () => void;
  openAlfred: () => void;
};

export function BoardContextMenu(props: BoardContextProps) {
  // User information
  const { user } = useUser();
  const userColor = user ? user.data.color : 'teal';

  const contextMenuPosition = useUIStore((state) => state.contextMenuPosition);
  const setContextMenuPosition = useUIStore((state) => state.setContextMenuPosition);
  const setContextMenuOpen = useUIStore((state) => state.setContextMenuOpen);

  // Useeffect to check the position of the context menu to ensure it is not off screen...and if so position it correctly
  useEffect(() => {
    if (contextMenuPosition) {
      // Check if x is less an 0
      const width = 250;
      const height = 118;
      // Check if x is less than 0 or greater than the window width. If so set a new x position to have the context menu on screen
      const start_x = contextMenuPosition.x - width / 2;
      const start_y = contextMenuPosition.y - height / 2;
      // X and Y are the center....so we need to adjust for the width and height
      let x = start_x;
      let y = start_y;
      if (start_x < 0) {
        x = width / 2;
      } else if (contextMenuPosition.x + width / 2 > window.innerWidth) {
        x = window.innerWidth - width / 2;
      }
      // Check if y is less than 0 or greater than the window height. If so set a new y position to have the context menu on screen
      if (start_y < 0) {
        y = height / 2;
      } else if (contextMenuPosition.y + height / 2 > window.innerHeight) {
        y = window.innerHeight - height / 2;
      }
      // Only set the position if it has changed
      const newX = x !== start_x ? x : contextMenuPosition.x;
      const newY = y !== start_y ? y : contextMenuPosition.y;
      if (x !== start_x || y !== start_y) {
        setContextMenuPosition({ x: newX, y: newY });
      }
    }
  }, [contextMenuPosition]);

  const handleAlfredOpen = () => {
    setContextMenuOpen(false);
    props.openAlfred();
  };

  return (
    <>
      <Box position="absolute" bottom="-60px" left="-125px" width="250px" height="118px">
        <Flex flexDir={'column'} justifyContent={'center'} alignItems={'center'} gap="3">
          <Flex gap="1" justifyContent={'center'}>
            <ContextButton bgColor={userColor as SAGEColors} icon={<MdPeople />} tooltip={'Users'} title={'Users'}>
              <UsersMenu boardId={props.boardId} />
            </ContextButton>
            <ContextButton bgColor={userColor as SAGEColors} icon={<MdScreenShare />} tooltip={'Screenshares'} title={'Screenshares'}>
              <ScreenshareMenu boardId={props.boardId} roomId={props.roomId} />{' '}
            </ContextButton>
            <ContextButton bgColor={userColor as SAGEColors} icon={<MdApps />} tooltip={'Applications'} title={'Applications'}>
              <ApplicationsMenu roomId={props.roomId} boardId={props.boardId} />
            </ContextButton>
            <ContextButton bgColor={userColor as SAGEColors} icon={<HiPuzzle />} tooltip={'Plugins'} title={'Plugins'}>
              <PluginsMenu roomId={props.roomId} boardId={props.boardId} />
            </ContextButton>
            <ContextButton bgColor={userColor as SAGEColors} icon={<MdFolder />} tooltip={'Assets'} title={'Assets'}>
              <AssetsMenu roomId={props.roomId} boardId={props.boardId} downloadRoomAssets={props.downloadRoomAssets} />{' '}
            </ContextButton>
            <ContextButton bgColor={userColor as SAGEColors} icon={<HiChip />} tooltip={'Kernels'} title={'Kernels'}>
              <KernelsMenu roomId={props.roomId} boardId={props.boardId} />
            </ContextButton>
            <ContextButton bgColor={userColor as SAGEColors} icon={<MdMap />} tooltip={'Map'} title={'Map'}>
              <NavigationMenu />
            </ContextButton>
          </Flex>
          <Flex justifyContent={'space-between'} width="100px" height="24px">
            <Tooltip label="Back Home" aria-label="back-home" hasArrow placement="left" openDelay={500}>
              <IconButton
                aria-label="Up Arrow"
                variant="solid"
                colorScheme={'gray'}
                size="xs"
                fontSize="md"
                icon={<MdArrowBack />}
                sx={{
                  _dark: {
                    bg: 'gray.600', // 'inherit' didnt seem to work
                  },
                }}
                onClick={() => props.backHomeClick()}
              />
            </Tooltip>

            <Tooltip label={'SAGE Intelligence'} placement={'top'} hasArrow={true} openDelay={400} shouldWrapChildren={true}>
              <IconButton
                colorScheme={'purple'}
                size="xs"
                icon={<IoSparklesSharp />}
                fontSize="sm"
                aria-label={`Open Alfred Menu`}
                onClick={handleAlfredOpen}
              />
            </Tooltip>
          </Flex>
          <Flex gap="1" justifyContent={'center'}>
            <Interactionbar tooltipPlacement="bottom" position={contextMenuPosition} />
          </Flex>
        </Flex>
      </Box>
    </>
  );
}
