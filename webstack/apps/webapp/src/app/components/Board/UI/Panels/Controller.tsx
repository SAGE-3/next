/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useNavigate } from 'react-router';
import { HStack, Tooltip, useToast } from '@chakra-ui/react';

import { MdMap, MdGroups, MdFolder, MdApps, MdHome } from 'react-icons/md';

import { StuckTypes, useBoardStore, useRoomStore, useUIStore } from '@sage3/frontend';
import { Panel, IconButtonPanel } from './Panel';

export interface ControllerProps {
  roomId: string;
  boardId: string;
}

export function Controller(props: ControllerProps) {
  const boards = useBoardStore((state) => state.boards);
  const board = boards.find((el) => el._id === props.boardId);
  const rooms = useRoomStore((state) => state.rooms);
  const room = rooms.find((el) => el._id === props.roomId);

  const position = useUIStore((state) => state.controller.position);
  const setPosition = useUIStore((state) => state.controller.setPosition);
  const opened = useUIStore((state) => state.controller.opened);
  const setOpened = useUIStore((state) => state.controller.setOpened);
  const show = useUIStore((state) => state.controller.show);
  const setShow = useUIStore((state) => state.controller.setShow);
  const stuck = useUIStore((state) => state.controller.stuck);
  const setStuck = useUIStore((state) => state.controller.setStuck);

  const avatarMenu = useUIStore((state) => state.avatarMenu);
  const applicationsMenu = useUIStore((state) => state.applicationsMenu);
  const navigationMenu = useUIStore((state) => state.navigationMenu);
  const assetMenu = useUIStore((state) => state.assetsMenu);

  // Redirect the user back to the homepage when he clicks the green button in the top left corner
  const navigate = useNavigate();
  function handleHomeClick() {
    navigate('/home');
  }

  // Copy the board id to the clipboard
  const toast = useToast();
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

  // Show the various panels
  const handleShowMenu = (menuName: 'avatar' | 'applications' | 'navigation' | 'assets') => {
    if (avatarMenu.stuck == StuckTypes.Controller) {
      avatarMenu.setShow(menuName == 'avatar' ? !avatarMenu.show : false);
    }
    if (navigationMenu.stuck == StuckTypes.Controller) {
      navigationMenu.setShow(menuName == 'navigation' ? !navigationMenu.show : false);
    }
    if (assetMenu.stuck == StuckTypes.Controller) {
      assetMenu.setShow(menuName == 'assets' ? !assetMenu.show : false);
    }
    if (applicationsMenu.stuck == StuckTypes.Controller) {
      applicationsMenu.setShow(menuName == 'applications' ? !applicationsMenu.show : false);
    }
  };

  return (
    <Panel
      title={(room?.data.name ? room.data.name : '') + ' > ' + (board?.data.name ? board.data.name : '')}
      opened={opened}
      setOpened={setOpened}
      setPosition={setPosition}
      position={position}
      width={300}
      showClose={false}
      show={show}
      setShow={setShow}
      stuck={stuck}
      setStuck={setStuck}
      titleDblClick={handleCopyId}
    >
      <HStack w="100%">
        <Tooltip label="Home" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButtonPanel icon={<MdHome />} description="Home" disabled={false} used={false} onClick={handleHomeClick} />
        </Tooltip>

        <Tooltip label="Users" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButtonPanel
            icon={<MdGroups />}
            description="Avatars"
            disabled={false}
            used={avatarMenu.show}
            onClick={() => handleShowMenu('avatar')}
          />
        </Tooltip>
        <Tooltip label="Apps" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButtonPanel
            icon={<MdApps />}
            description="Launch applications"
            disabled={false}
            used={applicationsMenu.show}
            onClick={() => handleShowMenu('applications')}
          />
        </Tooltip>
        <Tooltip label="Assets" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButtonPanel
            icon={<MdFolder />}
            description="Assets"
            disabled={false}
            used={assetMenu.show}
            onClick={() => handleShowMenu('assets')}
          />
        </Tooltip>
        <Tooltip label="Map" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButtonPanel
            icon={<MdMap />}
            description="Navigation"
            disabled={false}
            used={navigationMenu.show}
            onClick={() => handleShowMenu('navigation')}
          />
        </Tooltip>
      </HStack>
    </Panel>
  );
}
