/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  HStack,
  useToast,
  Button,
  Text,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverAnchor,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';

import { MdApps, MdArrowBack, MdFolder, MdGroups, MdMap } from 'react-icons/md';
import { BiPencil } from 'react-icons/bi';
import { HiChip, HiPuzzle } from 'react-icons/hi';

import { PanelUI, StuckTypes, usePanelStore, useRoomStore, useRouteNav, useAbility } from '@sage3/frontend';
import { IconButtonPanel, Panel } from '../Panel';

export interface ControllerProps {
  roomId: string;
  boardId: string;
  plugins: boolean;
}

export function Controller(props: ControllerProps) {
  // Rooms Store
  const rooms = useRoomStore((state) => state.rooms);
  const room = rooms.find((el) => el._id === props.roomId);

  // Can Annotate
  const canAnnotate = useAbility('update', 'boards');
  const canCreateApps = useAbility('create', 'apps');
  const canDownload = useAbility('download', 'assets');
  const canCreateKernels = useAbility('create', 'kernels');

  // Panel Store
  const { updatePanel, getPanel, bringPanelForward } = usePanelStore((state) => state);

  const annotations = getPanel('annotations');
  const applications = getPanel('applications');
  const assets = getPanel('assets');
  const navigation = getPanel('navigation');
  const users = getPanel('users');
  const plugins = getPanel('plugins');
  const kernels = getPanel('kernels');

  // Redirect the user back to the homepage when clicking the arrow button
  const { toHome, back } = useRouteNav();
  function handleHomeClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    if (event.shiftKey) {
      // Just go back to the previous room
      back();
    } else {
      // Back to the homepage with the room id
      toHome(props.roomId);
    }
  }

  // Copy the board id to the clipboard
  const toast = useToast();
  const handleCopyId = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(props.boardId);
      toast({
        title: 'Success',
        description: `BoardID Copied to Clipboard`,
        duration: 3000,
        isClosable: true,
        status: 'success',
      });
    }
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
    position ? updatePanel(panel.name, { show: !panel.show, position }) : updatePanel(panel.name, { show: !panel.show });
    bringPanelForward(panel.name);
  };

  // Popover for long press
  const { isOpen: popIsOpen, onOpen: popOnOpen, onClose: popOnClose } = useDisclosure();

  return (
    <Panel name="controller" title={'Main Menu'} width={430} showClose={false} titleDblClick={handleCopyId}>
      <HStack w="100%">
        <Popover isOpen={popIsOpen} onOpen={popOnOpen} onClose={popOnClose}>
          <IconButtonPanel
            icon={<MdArrowBack />}
            isActive={false}
            onClick={handleHomeClick}
            onLongPress={popOnOpen}
            description={`Back to ${room?.data.name} (Long-press for more options)`}
          />
          <PopoverContent fontSize={'sm'} width={'200px'} style={{ top: 70, left: 35 }}>
            <PopoverArrow />
            <PopoverBody userSelect={'text'}>
              <VStack display={'block'}>
                <Button variant={'link'} fontSize={'sm'} onClick={() => toHome(props.roomId)}>
                  Back to {room?.data.name}
                </Button>
                <Button variant={'link'} fontSize={'sm'} onClick={back}>
                  Back to previous board
                </Button>
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>

        <IconButtonPanel icon={<MdGroups />} description="Users" isActive={users?.show} onClick={() => handleShowPanel(users)} />
        <IconButtonPanel
          icon={<MdApps />}
          description={'Applications'}
          isActive={applications?.show}
          isDisabled={!canCreateApps}
          onClick={() => handleShowPanel(applications)}
        />
        {props.plugins && (
          <IconButtonPanel
            icon={<HiPuzzle size="32px" />}
            description="Plugins"
            isActive={plugins?.show}
            isDisabled={!canCreateApps}
            onClick={() => handleShowPanel(plugins)}
          />
        )}

        <IconButtonPanel
          icon={<HiChip />}
          description="Kernels"
          isActive={kernels?.show}
          isDisabled={!canCreateKernels}
          onClick={() => handleShowPanel(kernels)}
        />
        <IconButtonPanel
          icon={<MdFolder />}
          description="Assets"
          isActive={assets?.show}
          onClick={() => handleShowPanel(assets)}
          isDisabled={!canDownload}
        />
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
          isDisabled={!canAnnotate}
          onClick={() => handleShowPanel(annotations)}
        />
      </HStack>
    </Panel>
  );
}
