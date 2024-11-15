/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Box, useColorModeValue, Flex, IconButton } from '@chakra-ui/react';

import { useUser, useHexColor } from '@sage3/frontend';

import { MdApps, MdArrowBack, MdFolder, MdMap, MdPeople, MdScreenShare } from 'react-icons/md';
import { HiChip, HiPuzzle } from 'react-icons/hi';

import { ContextButton } from './ContextButton';
import { ApplicationsMenu, AssetsMenu, KernelsMenu, NavigationMenu, PluginsMenu, UsersMenu } from './Menus';
import { SAGEColors } from '@sage3/shared';
import { ScreenshareMenu } from '../ScreenshareMenu';
import { Interactionbar } from '../Interactionbar';
import { FaExpandArrowsAlt } from 'react-icons/fa';

// Development or production
const development: boolean = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

type BoardContextProps = {
  roomId: string;
  boardId: string;
  clearBoard: () => void;
  showAllApps: () => void;
  downloadRoomAssets: (ids: string[]) => void;
  backHomeClick: () => void;
};

export function BoardContextMenu(props: BoardContextProps) {
  // User information
  const { user } = useUser();
  const userColor = user ? user.data.color : 'teal';
  const userColorHex = useHexColor(userColor);

  // A semi transparent gray blur background
  const background = useColorModeValue('gray.200', 'gray.600');
  const backgroundHex = useHexColor(background);

  return (
    <Box position="absolute" bottom="-53px" left="-55px" width="110px" height="110px">
      <Flex flexDir={'column'} justifyContent={'center'} alignItems={'center'} gap="3">
        <Flex gap="1" justifyContent={'center'}>
          {/* <IconButton aria-label="applications" fontSize="2xl" variant="solid" size="sm" icon={<MdApps />} /> */}
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
          <IconButton
            aria-label="Up Arrow"
            variant="outline"
            colorScheme={'teal'}
            size="xs"
            icon={<MdArrowBack />}
            onClick={() => props.backHomeClick()}
          />
          <IconButton
            aria-label="Up Arrow"
            variant="outline"
            colorScheme={'teal'}
            size="xs"
            icon={<FaExpandArrowsAlt />}
            onClick={props.showAllApps}
          />
        </Flex>
        <Flex gap="1" justifyContent={'center'}>
          <Interactionbar />
        </Flex>
      </Flex>
    </Box>
  );
}
