/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Box, useColorModeValue, Tooltip, IconButton, useDisclosure, Text, ButtonGroup } from '@chakra-ui/react';

import { MdGridView, MdDelete, MdLock, MdLockOpen, MdFitScreen, MdAdd, MdRemove, MdRestore } from 'react-icons/md';

import {
  ConfirmModal,
  useAppStore,
  useBoardStore,
  useHexColor,
  usePresenceStore,
  useUIStore,
  useUser,
  useUsersStore,
} from '@sage3/frontend';
import { App } from '@sage3/applications/schema';
import { Panel } from '../Panel';
import { Presence, User } from '@sage3/shared/types';

export interface NavProps {
  fitApps: () => void;
  clearBoard: () => void;
  boardId: string;
}

export function NavigationPanel(props: NavProps) {
  // App Store
  const apps = useAppStore((state) => state.apps);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  // Board Store
  const updateBoard = useBoardStore((state) => state.update);
  // UI Store
  const { boardLocked, lockBoard, setBoardPosition, zoomIn, zoomOut, setScale, resetZoom, scale } = useUIStore((state) => state);
  const formattedScale = `${Math.floor(scale * 100)}%`;
  // Users and Presecnes for cursors
  const presences = usePresenceStore((state) => state.presences);
  const users = useUsersStore((state) => state.users);
  const { user } = useUser();

  // Clear board modal
  const { isOpen: organizeIsOpen, onOpen: organizeOnOpen, onClose: organizeOnClose } = useDisclosure();

  const backgroundColor = useColorModeValue('gray.100', 'gray.600');
  const borderColor = useColorModeValue('teal.500', 'teal.500');
  const appBorderColor = useColorModeValue('teal.600', 'teal.100');

  const mapWidth = 200;
  const mapHeight = 140;

  const [appsX, setAppsX] = useState(0);
  const [appsY, setAppsY] = useState(0);
  const [mapScale, setMapScale] = useState(1);
  const [appWidth, setAppWidth] = useState(0);
  const [appHeight, setAppHeight] = useState(0);

  useEffect(() => {
    if (apps.length > 0) {
      const appsLeft = apps.map((app) => app.data.position.x);
      const appsRight = apps.map((app) => app.data.position.x + app.data.size.width);
      const appsTop = apps.map((app) => app.data.position.y);
      const appsBottom = apps.map((app) => app.data.position.y + app.data.size.height);

      const width = Math.max(...appsRight) - Math.min(...appsLeft);
      const height = Math.max(...appsBottom) - Math.min(...appsTop);

      const mapScale = Math.min(mapWidth / width, mapHeight / height) * 0.95;
      const x = Math.min(...appsLeft);
      const y = Math.min(...appsTop);

      setAppHeight(height * mapScale);
      setAppWidth(width * mapScale);
      setAppsX(x);
      setAppsY(y);
      setMapScale(mapScale);
    }
  }, [apps]);

  const moveToApp = (app: App) => {
    // set the app as selected
    setSelectedApp(app._id);

    // Scale
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

  // Organize board using python function
  function organizeApps() {
    // get presence of current user for its viewport
    const presence = presences.filter((el) => el.data.boardId === props.boardId).filter((el) => el.data.userId === user?._id)[0];
    // Trigger the smart function
    updateBoard(props.boardId, {
      executeInfo: {
        executeFunc: 'reorganize_layout',
        params: {
          viewport_position: presence.data.viewport.position,
          viewport_size: presence.data.viewport.size,
          by: 'app_type',
          mode: 'tiles',
        },
      },
    });
  }

  // Result the confirmation modal
  const onOrganizeConfirm = () => {
    organizeApps();
    organizeOnClose();
  };

  return (
    <>
      {/* Organize board dialog */}

      <ConfirmModal
        title="Organize the Board"
        message="Are you sure you want to automatically organize the applications?"
        onConfirm={onOrganizeConfirm}
        onClose={organizeOnClose}
        isOpen={organizeIsOpen}
      />

      <Panel title={'Navigation'} name="navigation" width={400} showClose={false}>
        <Box alignItems="center" display="flex">
          <Box
            width={mapWidth}
            height={mapHeight}
            backgroundColor={backgroundColor}
            borderRadius="md"
            borderWidth="2px"
            borderStyle="solid"
            borderColor={borderColor}
            overflow="hidden"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Box position="relative" height={appHeight} width={appWidth}>
              {/* Create a copy of app array and sort it by update time */}
              {apps
                .slice()
                .sort((a, b) => a._updatedAt - b._updatedAt)
                .map((app) => {
                  return (
                    <Tooltip key={app._id} placement="top" label={`${app.data.type} : ${app.data.title}`} openDelay={500} hasArrow>
                      <Box
                        backgroundColor={borderColor}
                        position="absolute"
                        left={(app.data.position.x - appsX) * mapScale + 'px'}
                        top={(app.data.position.y - appsY) * mapScale + 'px'}
                        width={app.data.size.width * mapScale + 'px'}
                        height={app.data.size.height * mapScale + 'px'}
                        transition={'all .5s'}
                        _hover={{ backgroundColor: 'teal.200', transform: 'scale(1.1)' }}
                        onClick={() => moveToApp(app)}
                        borderWidth="1px"
                        borderStyle="solid"
                        borderColor={appBorderColor}
                        borderRadius="sm"
                        cursor="pointer"
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
                  return (
                    <NavMapCursor key={presence._id} presence={presence} user={u} mapScale={mapScale} boardShift={{ x: appsX, y: appsY }} />
                  );
                })}
            </Box>
          </Box>

          <Box display="flex" flexDir={'column'} ml="2" alignContent={'flexStart'}>
            {/* Board Actions */}
            <Box display="flex" mb="2">
              <Tooltip label={boardLocked ? 'Unlock View' : 'Lock View'} placement="top" hasArrow openDelay={500}>
                <IconButton
                  icon={boardLocked ? <MdLock /> : <MdLockOpen />}
                  colorScheme="teal"
                  size="sm"
                  aria-label="for board"
                  mr="2"
                  onClick={() => lockBoard(!boardLocked)}
                />
              </Tooltip>
              <Tooltip label="Clear Board" placement="top" hasArrow openDelay={500}>
                <IconButton icon={<MdDelete />} colorScheme="teal" size="sm" aria-label="clear" onClick={props.clearBoard} />
              </Tooltip>
            </Box>

            {/* Organize Apps and Fit View */}
            <Box display="flex" mb="2">
              <Tooltip label="Organize Apps" placement="top" hasArrow openDelay={500}>
                <IconButton icon={<MdGridView />} onClick={organizeOnOpen} colorScheme="teal" mr="2" size="sm" aria-label="clear" />
              </Tooltip>
              <Tooltip label="Show All Apps" placement="top" hasArrow openDelay={500}>
                <IconButton icon={<MdFitScreen />} colorScheme="teal" size="sm" aria-label="fit apps" onClick={props.fitApps} />
              </Tooltip>
            </Box>

            {/* Zoom Buttons */}
            <Box display="flex" mb="1">
              <ButtonGroup isAttached size="xs" colorScheme="teal">
                <Tooltip label="Zoom Out" placement="top" hasArrow openDelay={500}>
                  <IconButton icon={<MdRemove />} onClick={zoomOut} colorScheme="teal" aria-label="clear" />
                </Tooltip>
                <Tooltip label="Reset Zoom Level" placement="top" hasArrow openDelay={500}>
                  <IconButton
                    icon={<MdRestore />}
                    onClick={resetZoom}
                    colorScheme="teal"
                    borderX="solid 2px transparent"
                    aria-label="clear"
                  />
                </Tooltip>
                <Tooltip label="Zoom In" placement="top" hasArrow openDelay={500}>
                  <IconButton icon={<MdAdd />} colorScheme="teal" aria-label="clear" onClick={zoomIn} />
                </Tooltip>
              </ButtonGroup>
            </Box>
            <Box display="flex" mb="1" justifyContent={'center'}>
              <Text fontWeight="bold" fontSize="18">
                {formattedScale}
              </Text>
            </Box>
          </Box>
        </Box>
      </Panel>
    </>
  );
}

type NavMapCusorProps = {
  presence: Presence;
  user: User;
  boardShift: { x: number; y: number };
  mapScale: number;
};

const NavMapCursor = (props: NavMapCusorProps) => {
  const { user } = useUser();
  const self = props.user._id === user?._id;
  const color = useHexColor(props.user.data.color);
  const left = (props.presence.data.cursor.x - props.boardShift.x) * props.mapScale + 'px';
  const top = (props.presence.data.cursor.y - props.boardShift.y) * props.mapScale + 'px';
  return (
    <Box
      key={props.presence.data.userId}
      style={{
        position: 'absolute',
        left: left,
        top: top,
        transition: 'all 0.5s ease-in-out',
        pointerEvents: 'none',
        display: 'flex',
        zIndex: 100000,
      }}
      borderRadius="50%"
      backgroundColor={self ? 'white' : color}
      width={self ? '6px' : '4px'}
      height={self ? '6px' : '4px'}
    ></Box>
  );
};
