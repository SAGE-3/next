/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { HStack, useToast } from '@chakra-ui/react';

import { MdApps, MdArrowBack, MdFolder, MdGroups, MdMap } from 'react-icons/md';
import { BiPencil } from 'react-icons/bi';
import { HiChip } from 'react-icons/hi';

import { PanelUI, StuckTypes, usePanelStore, useRoomStore, useRouteNav } from '@sage3/frontend';
import { IconButtonPanel, Panel } from '../Panel';

export interface ControllerProps {
  roomId: string;
  boardId: string;
}

export function Controller(props: ControllerProps) {
  // Rooms Store
  const rooms = useRoomStore((state) => state.rooms);
  const room = rooms.find((el) => el._id === props.roomId);

  // Panel Store
  const { updatePanel, getPanel, bringPanelForward } = usePanelStore((state) => state);

  const annotations = getPanel('annotations');
  const applications = getPanel('applications');
  const assets = getPanel('assets');
  const navigation = getPanel('navigation');
  const users = getPanel('users');
  const kernels = getPanel('kernels');

  // Redirect the user back to the homepage when clicking the arrow button
  const { toHome } = useRouteNav();
  function handleHomeClick() {
    toHome(props.roomId);
  }

  // Copy the board id to the clipboard
  const toast = useToast();
  const handleCopyId = async () => {
    await navigator.clipboard.writeText(props.boardId);
    toast({
      title: 'Success',
      description: `BoardID Copied to Clipboard`,
      duration: 3000,
      isClosable: true,
      status: 'success',
    });
  };

  // Show the various panels
  const handleShowPanel = (panel: PanelUI | undefined) => {
    if (!panel) return;
    let position;
    if (panel.stuck === StuckTypes.None) {
      const controller = getPanel('controller');
      if (controller) {
        position = { ...controller.position };
        position.y = position.y + 85;
      }
    }
    (position) ? updatePanel(panel.name, { show: !panel.show, position }) : updatePanel(panel.name, { show: !panel.show });
    bringPanelForward(panel.name)
  };

  return (
    <Panel name="controller" title={'Main Menu'} width={400}
      showClose={false} titleDblClick={handleCopyId}
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
        <IconButtonPanel
          icon={<HiChip />}
          description={'Kernels'}
          isActive={kernels?.show}
          onClick={() => handleShowPanel(kernels)}
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
