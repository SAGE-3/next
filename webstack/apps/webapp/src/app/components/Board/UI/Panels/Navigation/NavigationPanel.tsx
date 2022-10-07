/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { Box, useColorModeValue, Tooltip, IconButton } from '@chakra-ui/react';
import { MdFullscreen, MdGridView, MdDelete, MdLock, MdLockOpen, MdZoomOutMap } from 'react-icons/md';

import { StuckTypes, useAppStore, useHexColor, usePresenceStore, useUIStore, useUser, useUsersStore } from '@sage3/frontend';
import { App } from '@sage3/applications/schema';
import { Panel } from '../Panel';

export interface NavProps {
  fitApps: () => void;
  clearBoard: () => void;
  boardId: string;
}

export function NavigationPanel(props: NavProps) {
  // App Store
  const apps = useAppStore((state) => state.apps);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
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

  const displayScale = 25;
  const scale = useUIStore((state) => state.scale);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const setScale = useUIStore((state) => state.setScale);

  const mapWidth = 200;
  const mapHeight = 140;

  const [centerX, setCenterX] = useState(0);
  const [centerY, setCenterY] = useState(0);
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
      const centerX = Math.min(...appsLeft);
      const centerY = Math.min(...appsTop);

      console.log(apps);
      console.log('centerX', centerX);
      console.log('centerY', centerY);
      console.log('mapScale', mapScale);
      setAppHeight(height * mapScale);
      setAppWidth(width * mapScale);
      setCenterX(centerX);
      setCenterY(centerY);
      setMapScale(mapScale);
    }
  }, [apps]);

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

  const backgroundColor = useColorModeValue('gray.100', 'gray.600');
  const borderColor = useColorModeValue('teal.500', 'teal.500');
  const appBorderColor = useColorModeValue('teal.600', 'teal.100');

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
          <Box overflow="hidden" position="relative" height={appHeight} width={appWidth}>
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
                      left={(app.data.position.x - centerX) * mapScale + 'px'}
                      top={(app.data.position.y - centerY) * mapScale + 'px'}
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
                const self = u._id === user?._id;
                const color = useHexColor(u.data.color);
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
                    backgroundColor={self ? 'white' : color}
                    width={self ? '6px' : '4px'}
                    height={self ? '6px' : '4px'}
                  ></Box>
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
              aria-label="fir board"
              mb="1"
              onClick={() => lockBoard(!boardLocked)}
            />
          </Tooltip>
          <Tooltip label="Fit Apps" placement="top-start" hasArrow openDelay={500}>
            <IconButton icon={<MdGridView />} colorScheme="teal" mb="1" size="sm" aria-label="fit apps" onClick={props.fitApps} />
          </Tooltip>
          <Tooltip label="Reset Zoom" placement="top-start" hasArrow openDelay={500}>
            <IconButton icon={<MdZoomOutMap />} colorScheme="teal" mb="1" size="sm" aria-label="clear" onClick={() => setScale(1)} />
          </Tooltip>
          <Tooltip label="Clear Board" placement="top-start" hasArrow openDelay={500}>
            <IconButton icon={<MdDelete />} colorScheme="teal" size="sm" aria-label="clear" onClick={props.clearBoard} />
          </Tooltip>
        </Box>
      </Box>
    </Panel>
  );
}
