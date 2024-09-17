/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import {
  Stack,
  Button,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverCloseButton,
  PopoverHeader,
  useDisclosure,
  VStack,
  StackDirection,
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
  // Orientation
  const [direction, setDirection] = useState<StackDirection>('row');
  // Rooms Store
  const rooms = useRoomStore((state) => state.rooms);
  const room = rooms.find((el) => el._id === props.roomId);

  // Can Annotate
  const canAnnotate = useAbility('update', 'boards');
  const canCreateApps = useAbility('create', 'apps');
  const canDownload = useAbility('download', 'assets');
  const canCreateKernels = useAbility('create', 'kernels');

  // Panel Store
  const updatePanel = usePanelStore((state) => state.updatePanel);
  const bringPanelForward = usePanelStore((state) => state.bringPanelForward);

  // This makes sure to get up to date panels
  const annotations = usePanelStore((state) => state.panels['annotations']);
  const applications = usePanelStore((state) => state.panels['applications']);
  const assets = usePanelStore((state) => state.panels['assets']);
  const navigation = usePanelStore((state) => state.panels['navigation']);
  const users = usePanelStore((state) => state.panels['users']);
  const plugins = usePanelStore((state) => state.panels['plugins']);
  const kernels = usePanelStore((state) => state.panels['kernels']);
  const main = usePanelStore((state) => state.panels['controller']);

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

  // Show the various panels
  const handleShowPanel = (panel: PanelUI | undefined) => {
    if (!panel) return;
    let position;
    const controller = main;
    if (controller) {
      position = { ...controller.position };
      if (controller.stuck === StuckTypes.None) {
        if (direction === 'row') {
          position.y = position.y + 60;
        } else {
          position.x = position.x + 90;
        }
      } else if (controller.stuck === StuckTypes.Right) {
        let offset = 0;
        panel.name === 'users' && (offset = 160);
        panel.name === 'applications' && (offset = 200);
        panel.name === 'plugins' && (offset = 240);
        panel.name === 'kernels' && (offset = 720);
        panel.name === 'assets' && (offset = 820);
        panel.name === 'navigation' && (offset = 335);
        panel.name === 'annotations' && (offset = 610);
        position.x = position.x - offset;
      } else if (controller.stuck === StuckTypes.Left) {
        position.x = position.x + 95;
      } else if (
        controller.stuck === StuckTypes.Top ||
        controller.stuck === StuckTypes.TopRight ||
        controller.stuck === StuckTypes.TopLeft
      ) {
        position.y = position.y + 60;
      } else if (
        controller.stuck === StuckTypes.Bottom ||
        controller.stuck === StuckTypes.BottomRight ||
        controller.stuck === StuckTypes.BottomLeft
      ) {
        let offset = 0;
        panel.name === 'users' && (offset = 90);
        panel.name === 'applications' && (offset = 350);
        panel.name === 'plugins' && (offset = 90);
        panel.name === 'kernels' && (offset = 140);
        panel.name === 'assets' && (offset = 320);
        panel.name === 'navigation' && (offset = 195);
        panel.name === 'annotations' && (offset = 155);
        position.y = position.y - offset;
      }
    }
    if (position) {
      updatePanel(panel.name, { show: !panel.show, position });
    } else {
      updatePanel(panel.name, { show: !panel.show });
    }
    bringPanelForward(panel.name);
  };

  // Popover for long press
  const { isOpen: popIsOpen, onOpen: popOnOpen, onClose: popOnClose } = useDisclosure();

  // Track the stuck state of the main panel to change the orientation of the panel
  useEffect(() => {
    if (main.stuck === StuckTypes.Left || main.stuck === StuckTypes.Right) {
      setDirection('column');
      // Adjust the position of the main panel if it is stuck to the right
      if (main.stuck === StuckTypes.Right) {
        if (main.position.x < window.innerWidth) {
          updatePanel(main.name, { position: { x: window.innerWidth - 95, y: main.position.y } });
        }
      }
    } else if (main.stuck === StuckTypes.Bottom || main.stuck === StuckTypes.Top) {
      setDirection('row');
      if (main.stuck === StuckTypes.Bottom) {
        // Adjust the position of the main panel if it is stuck to the bottom
        if (main.position.y < window.innerHeight) {
          updatePanel(main.name, { position: { x: main.position.x, y: window.innerHeight - 60 } });
        }
      }
    }
  }, [main.stuck]);

  return (
    <Panel name="controller" title="" width={430} showClose={false} showMinimize={false}>
      <Stack w="100%" direction={direction}>
        <Popover isOpen={popIsOpen} onOpen={popOnOpen} onClose={popOnClose}>
          <IconButtonPanel
            icon={<MdArrowBack />}
            isActive={false}
            onClick={handleHomeClick}
            onLongPress={popOnOpen}
            description={`Back to ${room?.data.name} (Right-click for more options)`}
          />
          <PopoverContent
            fontSize={'sm'}
            width={'200px'}
            top={main.stuck === StuckTypes.Bottom ? '-100px' : main.stuck === StuckTypes.Top ? '60px' : '0px'}
            left={main.stuck === StuckTypes.Left ? '90px' : main.stuck === StuckTypes.Right ? '-205px' : '50px'}
          >
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverHeader>Navigate</PopoverHeader>
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
      </Stack>
    </Panel>
  );
}
