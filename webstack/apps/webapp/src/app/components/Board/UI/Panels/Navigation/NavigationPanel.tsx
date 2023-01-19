/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import {
  Box, useColorModeValue, Tooltip, IconButton,
  Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay,
  useDisclosure
} from '@chakra-ui/react';

import { MdGridView, MdDelete, MdLock, MdLockOpen, MdFitScreen } from 'react-icons/md';

import { StuckTypes, useAppStore, useHexColor, usePresenceStore, useUIStore, useUser, useUsersStore } from '@sage3/frontend';
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
  const updateApp = useAppStore((state) => state.update);
  // UI store
  const position = useUIStore((state) => state.navigationPanel.position);
  const setPosition = useUIStore((state) => state.navigationPanel.setPosition);
  const opened = useUIStore((state) => state.navigationPanel.opened);
  const setOpened = useUIStore((state) => state.navigationPanel.setOpened);
  const show = useUIStore((state) => state.navigationPanel.show);
  const setShow = useUIStore((state) => state.navigationPanel.setShow);
  const stuck = useUIStore((state) => state.navigationPanel.stuck);
  const setStuck = useUIStore((state) => state.navigationPanel.setStuck);
  const controllerPosition = useUIStore((state) => state.controller.position);
  const boardLocked = useUIStore((state) => state.boardLocked);
  const lockBoard = useUIStore((state) => state.lockBoard);
  const zIndex = useUIStore((state) => state.panelZ).indexOf('navigation');

  const scale = useUIStore((state) => state.scale);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const setScale = useUIStore((state) => state.setScale);

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
      const aspectRatio = width / height;

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

  // Organize the apps to the current user's screen
  const organizeApps = () => {
    if (apps.length > 0) {
      const buffer = 100 / scale;
      const winWidth = window.innerWidth / scale - buffer;
      const winHeight = window.innerHeight / scale - buffer;

      const bX = -boardPosition.x + buffer / 2;
      const bY = -boardPosition.y + buffer / 2;

      const xSpacing = 20;
      const ySpacing = 40;
      const numCols = Math.max(1, Math.ceil(Math.sqrt(apps.length)));
      const numRows = Math.ceil(Math.sqrt(apps.length));

      const colWidth = (winWidth - xSpacing * numCols) / numCols;
      const rowHeight = (winHeight - ySpacing * numRows) / numRows;
      let currentCol = 0;
      let currentRow = 0;
      apps.forEach((el) => {
        const aspect = el.data.size.width / el.data.size.height;
        let width = Math.floor(Math.min(colWidth, rowHeight * aspect));
        let height = Math.floor(Math.min(rowHeight, colWidth / aspect));
        width = Math.max(200, width);
        height = Math.max(100, height);

        let x = Math.floor(bX + currentCol * xSpacing + currentCol * colWidth + (colWidth - width) / 2);
        let y = Math.floor(bY + currentRow * ySpacing + currentRow * rowHeight + (rowHeight - height) / 2);

        if (currentCol >= numCols - 1) {
          currentCol = 0;
          currentRow++;
        } else {
          currentCol++;
        }

        updateApp(el._id, { position: { x, y, z: el.data.position.z }, size: { width, height, depth: el.data.size.depth } });
      });
    }
  };

  // Result the confirmation modal
  const onOrganizeConfirm = () => {
    organizeApps();
    organizeOnClose();
  };

  return (
    <>
      {/* Organize board dialog */}
      <Modal isCentered isOpen={organizeIsOpen} onClose={organizeOnClose}>
        <OrganizeBoardModal onClick={onOrganizeConfirm} onClose={organizeOnClose} isOpen={organizeIsOpen}></OrganizeBoardModal>
      </Modal>

      <Panel
        title={'Navigation'}
        name="navigation"
        opened={opened}
        setOpened={setOpened}
        setPosition={setPosition}
        position={position}
        width={400}
        showClose={true}
        show={show}
        setShow={setShow}
        stuck={stuck}
        setStuck={setStuck}
        zIndex={zIndex}
      >
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
                    <Tooltip key={app._id} placement="top-start" label={`${app.data.type} : ${app.data.title}`} openDelay={500} hasArrow>
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
            <Tooltip label={boardLocked ? 'Unlock board' : 'Lock board'} placement="top-start" hasArrow openDelay={500}>
              <IconButton
                icon={boardLocked ? <MdLock /> : <MdLockOpen />}
                colorScheme="teal"
                size="sm"
                aria-label="for board"
                mb="1"
                onClick={() => lockBoard(!boardLocked)}
              />
            </Tooltip>
            <Tooltip label="Fit Apps" placement="top-start" hasArrow openDelay={500}>
              <IconButton icon={<MdFitScreen />} colorScheme="teal" mb="1" size="sm" aria-label="fit apps" onClick={props.fitApps} />
            </Tooltip>
            <Tooltip label="Organize Apps" placement="top-start" hasArrow openDelay={500}>
              <IconButton icon={<MdGridView />} onClick={organizeOnOpen} colorScheme="teal" mb="1" size="sm" aria-label="clear" />
            </Tooltip>
            <Tooltip label="Clear Board" placement="top-start" hasArrow openDelay={500}>
              <IconButton icon={<MdDelete />} colorScheme="teal" size="sm" aria-label="clear" onClick={props.clearBoard} />
            </Tooltip>
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


type OrganizeBoardProps = {
  onClick: () => void;
  onClose: () => void;
  isOpen: boolean;
};

export function OrganizeBoardModal(props: OrganizeBoardProps) {
  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false} isCentered={true}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Organize the Board</ModalHeader>
        <ModalBody>Are you sure you want to automatically organize the applications?</ModalBody>
        <ModalFooter>
          <Button colorScheme="green" size="sm" mr={3} onClick={props.onClose}>
            Cancel
          </Button>
          <Button colorScheme="red" size="sm" onClick={props.onClick}>
            Yes, Organize the Board
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
