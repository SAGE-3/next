/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { HStack, useToast } from '@chakra-ui/react';

import { MdMap, MdGroups, MdFolder, MdApps, MdArrowBack } from 'react-icons/md';
import { BiPencil } from 'react-icons/bi';

import { PanelUI, StuckTypes, useBoardStore, usePanelStore, useRoomStore, useRouteNav } from '@sage3/frontend';
import { Panel, IconButtonPanel } from '../Panel';

export interface ControllerProps {
  roomId: string;
  boardId: string;
}

export function Controller(props: ControllerProps) {
  // Rooms Store
  const rooms = useRoomStore((state) => state.rooms);
  const room = rooms.find((el) => el._id === props.roomId);

  // Panel Store
  const panels = usePanelStore((state) => state.panels);
  const updatePanel = usePanelStore((state) => state.updatePanel);
  const getPanel = usePanelStore((state) => state.getPanel);
  const annotations = getPanel('annotations');
  const applications = getPanel('applications');
  const assets = getPanel('assets');
  const navigation = getPanel('navigation');
  const users = getPanel('users');
  const bringPanelForward = usePanelStore((state) => state.bringPanelForward);

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
  const handleShowPanel = (panelToShow: PanelUI | undefined) => {
    if (!panelToShow) return;
    const controller = panels.find((el) => el.name === 'controller');
    panels
      .filter((el) => el.name !== 'controller')
      .forEach((panel) => {
        if (panel.name === panelToShow.name) {
          if (panel.stuck == StuckTypes.Controller) {
            updatePanel(panel.name, { show: !panel.show });
          } else {
            updatePanel(panel.name, { show: false, stuck: StuckTypes.Controller });
          }
          bringPanelForward(panelToShow.name);
        } else {
          if (panel.stuck === StuckTypes.Controller) updatePanel(panel.name, { show: false });
        }
        if (controller) {
          const position = { x: controller?.position.x, y: controller?.position.y + 100 };
          updatePanel(panel.name, { position });
        }
      });
  };

  return (
    <Panel name="controller" title={'Main Menu'} width={400}
      showClose={false} titleDblClick={handleCopyId} zIndex={100}
    >
      <HStack w="100%">
        <IconButtonPanel icon={<MdArrowBack />} description={`Back to ${room?.data.name}`} isActive={false} onClick={handleHomeClick} />

        <IconButtonPanel icon={<MdGroups />} description="Users" isActive={users?.show} onClick={() => handleShowPanel(users)} />
        <IconButtonPanel
          icon={<MdApps />}
          description={'Applications'}
          isActive={applications?.show}
          onClick={() => handleShowPanel(applications)}
        />
        <IconButtonPanel icon={<MdFolder />} description="Assets" isActive={assets?.show} onClick={() => handleShowPanel(assets)} />
        <IconButtonPanel
          icon={<MdMap />}
          description="Navigation"
          isActive={navigation?.show}
          onClick={() => handleShowPanel(navigation)}
        />
        <IconButtonPanel
          icon={<BiPencil size="32px" />}
          description="Annotation"
          isActive={annotations?.show}
          onClick={() => handleShowPanel(annotations)}
        />
      </HStack>
    </Panel>
  );
}
