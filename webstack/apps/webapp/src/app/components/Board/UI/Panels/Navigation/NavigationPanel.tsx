/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect } from 'react';
import { Box, useColorModeValue, Tooltip, IconButton } from '@chakra-ui/react';
import { MdFullscreen, MdGridView, MdDelete } from 'react-icons/md';

import { StuckTypes, useAppStore, usePresenceStore, useUIStore, useUser, useUsersStore } from '@sage3/frontend';
import { App } from '@sage3/applications/schema';
import { Panel } from '../Panel';
import { sageColorByName } from '@sage3/shared';

export interface NavProps {
  fitToBoard: () => void;
  fitApps: () => void;
  clearBoard: () => void;
  boardId: string;
}

export function NavigationPanel(props: NavProps) {
  // App Store
  const apps = useAppStore((state) => state.apps);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  // UI store
  const position = useUIStore((state) => state.navigationMenu.position);
  const setPosition = useUIStore((state) => state.navigationMenu.setPosition);
  const opened = useUIStore((state) => state.navigationMenu.opened);
  const setOpened = useUIStore((state) => state.navigationMenu.setOpened);
  const show = useUIStore((state) => state.navigationMenu.show);
  const setShow = useUIStore((state) => state.navigationMenu.setShow);
  const stuck = useUIStore((state) => state.navigationMenu.stuck);
  const setStuck = useUIStore((state) => state.navigationMenu.setStuck);
  const controllerPosition = useUIStore((state) => state.controller.position);

  // Board size from the store
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const displayScale = 25;
  const scale = useUIStore((state) => state.scale);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const setScale = useUIStore((state) => state.setScale);

  // Users and Presecnes for cursors
  const presences = usePresenceStore((state) => state.presences);
  const users = useUsersStore((state) => state.users);
  const { user } = useUser();

  // if a menu is currently closed, make it "jump" to the controller
  useEffect(() => {
    if (!show) {
      setPosition({ x: controllerPosition.x + 40, y: controllerPosition.y + 95 });
      setStuck(StuckTypes.Controller);
    }
  }, [show]);
  useEffect(() => {
    if (stuck == StuckTypes.Controller) {
      setPosition({ x: controllerPosition.x + 40, y: controllerPosition.y + 95 });
    }
  }, [controllerPosition]);

  const backgroundColor = useColorModeValue('gray.200', 'gray.600');
  const borderColor = useColorModeValue('teal.400', 'teal.600');
  const appBorderColor = useColorModeValue('teal.600', 'teal.400');

  const moveToApp = (app: App) => {
    // set the app as selected
    setSelectedApp(app._id);

    // Scale
    const s = scale;
    const aW = app.data.size.width + 60; // Border Buffer
    const aH = app.data.size.height + 100; // Border Buffer
    const wW = window.innerWidth;
    const wH = window.innerHeight;
    const sX = wW / aW;
    const sY = wH / aH;
    const zoom = Math.min(sX, sY);

    // Position
    let aX = -app.data.position.x + 20;
    let aY = -app.data.position.y + 20;
    const w = app.data.size.width;
    const h = app.data.size.height;
    if (sX >= sY) {
      aX = aX - w / 2 + wW / 2 / zoom;
    } else {
      aY = aY - h / 2 + wH / 2 / zoom;
    }
    const x = aX;
    const y = aY;

    setBoardPosition({ x, y });
    setScale(zoom);
  };

  return (
    <Panel
      title={'Minimap'}
      opened={opened}
      setOpened={setOpened}
      setPosition={setPosition}
      position={position}
      width={90 + boardWidth / displayScale}
      showClose={true}
      show={show}
      setShow={setShow}
      stuck={stuck}
      setStuck={setStuck}
      zIndex={9}
    >
      <Box alignItems="center" width="100%" display="flex">
        <Box display="flex" flexDir={'column'} mr="2">
          <Tooltip label="Fit Board" placement="top-start" hasArrow openDelay={500}>
            <IconButton icon={<MdFullscreen />} colorScheme="teal" size="xs" aria-label="fir board" onClick={props.fitToBoard} />
          </Tooltip>
          <Tooltip label="Fit Apps" placement="top-start" hasArrow openDelay={500}>
            <IconButton icon={<MdGridView />} colorScheme="teal" my="1" size="xs" aria-label="fit apps" onClick={props.fitApps} />
          </Tooltip>
          <Tooltip label="Clear Board" placement="top-start" hasArrow openDelay={500}>
            <IconButton icon={<MdDelete />} colorScheme="teal" size="xs" aria-label="clear" onClick={props.clearBoard} />
          </Tooltip>
        </Box>
        <Box
          width={boardWidth / displayScale + 4 + 'px'}
          height={boardHeight / displayScale + 4 + 'px'}
          backgroundColor={backgroundColor}
          borderRadius="md"
          borderWidth="2px"
          borderStyle="solid"
          borderColor={borderColor}
          overflow="hidden"
        >
          <Box position="absolute" width={boardWidth / displayScale} height={boardHeight / displayScale} overflow="hidden">
            {/* Create a copy of app array and sort it by update time */}
            {apps
              .slice()
              .sort((a, b) => a._updatedAt - b._updatedAt)
              .map((app) => {
                return (
                  <Tooltip key={app._id} placement="top-start" label={`${app.data.name}: ${app.data.description}`} openDelay={500} hasArrow>
                    <Box
                      backgroundColor={borderColor}
                      position="absolute"
                      left={app.data.position.x / displayScale + 'px'}
                      top={app.data.position.y / displayScale + 'px'}
                      width={app.data.size.width / displayScale + 'px'}
                      height={app.data.size.height / displayScale + 'px'}
                      transition={'all .2s'}
                      _hover={{ backgroundColor: 'teal.200', transform: 'scale(1.1)' }}
                      onClick={() => moveToApp(app)}
                      borderWidth="1px"
                      borderStyle="solid"
                      borderColor={appBorderColor}
                      borderRadius="sm"
                    ></Box>
                  </Tooltip>
                );
              })}
            {/* Draw the cursors: filter by board and not myself */}
            {presences
              .filter((el) => el.data.boardId === props.boardId)
              .map((presence) => {
                const u = users.find((el) => el._id === presence.data.userId);
                if (!u) return null;
                const self = u._id === user?._id;
                return (
                  <Box
                    key={presence.data.userId}
                    style={{
                      position: 'absolute',
                      left: presence.data.cursor.x / displayScale + 'px',
                      top: presence.data.cursor.y / displayScale + 'px',
                      transition: 'all 0.5s ease-in-out',
                      pointerEvents: 'none',
                      display: 'flex',
                      zIndex: 100000,
                    }}
                    borderRadius="50%"
                    backgroundColor={self ? 'white' : sageColorByName(u.data.color)}
                    width={self ? '6px' : '4px'}
                    height={self ? '6px' : '4px'}
                  ></Box>
                );
              })}
          </Box>
        </Box>
      </Box>
    </Panel>
  );
}
