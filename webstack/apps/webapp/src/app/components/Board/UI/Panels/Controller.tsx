/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { HStack, useToast } from '@chakra-ui/react';
import { MdMap, MdGroups, MdFolder, MdApps, MdArrowBack, MdOutlineViewModule } from 'react-icons/md';
import { BiPencil } from 'react-icons/bi';

import { PanelNames, StuckTypes, useRoomStore, useRouteNav, useUIStore } from '@sage3/frontend';
import { Panel, IconButtonPanel } from './Panel';

export interface ControllerProps {
  roomId: string;
  boardId: string;
}

export function Controller(props: ControllerProps) {
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

  const usersPanel = useUIStore((state) => state.usersPanel);
  const applicationsPanel = useUIStore((state) => state.applicationsPanel);
  const navigationPanel = useUIStore((state) => state.navigationPanel);
  const assetsPanel = useUIStore((state) => state.assetsPanel);
  const whiteboardPanel = useUIStore((state) => state.whiteboardPanel);

  // Redirect the user back to the homepage when clicking the arrow button
  const { toHome } = useRouteNav();

  function handleHomeClick() {
    toHome(props.roomId);
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
  const handleShowPanel = (menuName: PanelNames) => {
    [applicationsPanel, navigationPanel, usersPanel, assetsPanel, whiteboardPanel].forEach((panel) => {
      if (panel.name === menuName) {
        if (panel.stuck == StuckTypes.Controller) {
          panel.setShow(!panel.show);
        } else {
          panel.setShow(false);
          panel.setStuck(StuckTypes.Controller);
        }
        bringPanelForward(menuName);
      } else {
        if (panel.stuck === StuckTypes.Controller) panel.setShow(false);
      }
    });
  };

  return (
    <Panel
      title={'Controller'}
      name="controller"
      opened={opened}
      setOpened={setOpened}
      setPosition={setPosition}
      position={position}
      width={400}
      showClose={false}
      show={show}
      setShow={setShow}
      stuck={stuck}
      setStuck={setStuck}
      titleDblClick={handleCopyId}
      zIndex={100}
    >
      <HStack w="100%">
        <IconButtonPanel icon={<MdArrowBack />} description={`Back to ${room?.data.name}`} isActive={false} onClick={handleHomeClick} />

        <IconButtonPanel
          icon={<MdGroups />}
          description="Users"
          isActive={usersPanel.show}
          onClick={() => handleShowPanel(usersPanel.name)}
        />
        <IconButtonPanel
          icon={<MdApps />}
          description={'Applications'}
          isActive={applicationsPanel.show}
          onClick={() => handleShowPanel(applicationsPanel.name)}
        />
        <IconButtonPanel
          icon={<MdFolder />}
          description="Assets"
          isActive={assetsPanel.show}
          onClick={() => handleShowPanel(assetsPanel.name)}
        />
        <IconButtonPanel
          icon={<MdMap />}
          description="Navigation"
          isActive={navigationPanel.show}
          onClick={() => handleShowPanel(navigationPanel.name)}
        />
        <IconButtonPanel
          icon={<BiPencil size="32px" />}
          description="Annotation"
          isActive={whiteboardPanel.show}
          onClick={() => handleShowPanel(whiteboardPanel.name)}
        />
      </HStack>
    </Panel>
  );
}
