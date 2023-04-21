/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Button, Tooltip, ButtonGroup, useColorModeValue } from '@chakra-ui/react';
import { MdIosShare, MdOutlineStickyNote2, MdCode, MdWeb } from 'react-icons/md';
import { motion } from 'framer-motion'

import { AppName } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';
import { useAppStore, useUser, useUIStore, } from '@sage3/frontend';

type FunctionButtonsProps = {
  boardId: string;
  roomId: string;
};

/**
 * Main (StartMenu Button) component
 *
 * @export
 * @returns
 */
export function FunctionButtons(props: FunctionButtonsProps) {
  // User information
  const { user } = useUser();
  // Stores
  const scale = useUIStore((state) => state.scale);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const createApp = useAppStore((state) => state.create);
  // Colors for the buttons in light and dark mode
  const bgColor = useColorModeValue('#DBDBD1', '#3B4B59');
  const btColor = useColorModeValue('#AF2E1B', '#D9C3B0');

  /**
  * Create a new application
  * @param appName
  */
  const newApplication = (appName: AppName, title?: string) => {
    let width = 400;
    let height = 420;

    if (!user) return;

    if (appName === 'SageCell') {
      width = 650;
    }
    if (appName === 'Screenshare') {
      width = 1280;
      height = 720;
    }
    if (appName === 'Webview') {
      width = 500;
      height = 650;
    }

    // Get  the center of the board
    const x = Math.floor(-boardPosition.x - width / 2 + window.innerWidth / scale / 2);
    const y = Math.floor(-boardPosition.y - height / 2 + window.innerHeight / scale / 2);

    createApp({
      title: title ? title : appName,
      roomId: props.roomId,
      boardId: props.boardId,
      position: { x: x, y: y, z: 0 },
      size: { width, height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: appName,
      state: { ...(initialValues[appName] as any) },
      raised: true,
    });
  };

  return (
    <ButtonGroup id={"functionbuttons"} p={1} gap={1} size="xs" variant={'solid'}
      background={bgColor} rounded={"md"}
      as={motion.div} whileHover={{ scale: 1.5 }}>

      <Tooltip placement="top" hasArrow={true} label={'Share Your Screen'} openDelay={400} ml="1">
        <Button color={btColor} onClick={() => newApplication('Screenshare')}>
          <MdIosShare fontSize="18px" />
        </Button>
      </Tooltip>

      <Tooltip placement="top" hasArrow={true} label={'Create a Stickie'} openDelay={400} ml="1">
        <Button color={btColor} onClick={() => newApplication('Stickie', user?.data.name)}>
          <MdOutlineStickyNote2 fontSize="18px" />
        </Button>
      </Tooltip>

      <Tooltip placement="top" hasArrow={true} label={'Create a SageCell'} openDelay={400} ml="1">
        <Button color={btColor} onClick={() => newApplication('SageCell')}>
          <MdCode fontSize="18px" />
        </Button>
      </Tooltip>

      <Tooltip placement="top" hasArrow={true} label={'Open a Webview'} openDelay={400} ml="1">
        <Button color={btColor} onClick={() => newApplication('Webview')}>
          <MdWeb fontSize="18px" />
        </Button>
      </Tooltip>

    </ButtonGroup>
  );
}
