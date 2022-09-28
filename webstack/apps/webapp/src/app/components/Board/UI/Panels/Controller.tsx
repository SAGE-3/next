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
  const bringPanelForward = useUIStore((state) => state.bringPanelForward);

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
  const handleShowMenu = (menuName: 'users' | 'applications' | 'navigation' | 'assets') => {
    bringPanelForward(menuName);
    const panels = {
      users: avatarMenu,
      applications: applicationsMenu,
      navigation: navigationMenu,
      assets: assetMenu,
    };
    const panel = panels[menuName];
    delete panels[menuName];
    Object.values(panels).forEach((p) => {
      if (p.stuck === StuckTypes.Controller) p.setShow(false);
    });
    if (panel.stuck == StuckTypes.Controller) {
      panel.setShow(!panel.show);
    } else {
      panel.setShow(false);
      panel.setStuck(StuckTypes.Controller);
    }
  };

  return (
    <Panel
      title={(room?.data.name ? room.data.name : '') + ': ' + (board?.data.name ? board.data.name : '')}
      name="controller"
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
      zIndex={100}
    >
      <HStack w="100%">
        <IconButtonPanel icon={<MdHome />} description="Home" disabled={false} isActive={false} onClick={handleHomeClick} />

        <IconButtonPanel icon={<MdGroups />} description="Users" isActive={avatarMenu.show} onClick={() => handleShowMenu('users')} />
        <IconButtonPanel
          icon={<MdApps />}
          description="Applications"
          isActive={applicationsMenu.show}
          onClick={() => handleShowMenu('applications')}
        />
        <IconButtonPanel icon={<MdFolder />} description="Assets" isActive={assetMenu.show} onClick={() => handleShowMenu('assets')} />
        <IconButtonPanel
          icon={<MdMap />}
          description="Navigation"
          isActive={navigationMenu.show}
          onClick={() => handleShowMenu('navigation')}
        />
      </HStack>
    </Panel>
  );
}
