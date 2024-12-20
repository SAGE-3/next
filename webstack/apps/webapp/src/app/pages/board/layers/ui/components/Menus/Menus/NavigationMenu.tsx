/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Box, useColorModeValue, Tooltip, Button } from '@chakra-ui/react';

import { FaPython } from 'react-icons/fa';
import { BsFiletypePdf } from 'react-icons/bs';
import { MdImage, MdOutlineStickyNote2, MdMovie, MdWindow, MdChat } from 'react-icons/md';

import { App } from '@sage3/applications/schema';
import { useThrottleScale, useThrottleApps, useHexColor, useUIStore, useUser } from '@sage3/frontend';

// Icons for the minimap
const appIcons = {
  ImageViewer: <MdImage />,
  PDFViewer: <BsFiletypePdf />,
  Stickie: <MdOutlineStickyNote2 />,
  SageCell: <FaPython />,
  VideoViewer: <MdMovie />,
  Chat: <MdChat />,
};
type AppIconsKey = keyof typeof appIcons;
const appIconsDefined = Object.keys(appIcons) as AppIconsKey[];

export function NavigationMenu() {
  // App Store
  const apps = useThrottleApps(250);

  // UI Store
  const fitAllApps = useUIStore((state) => state.fitAllApps);
  const fitApps = useUIStore((state) => state.fitAppsById);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const userViewport = useUIStore((state) => state.viewport);

  const { user } = useUser();

  // User viewport
  const viewportBorderColor = useHexColor(user ? user.data.color : 'red.300');
  const userViewportBGColor = useColorModeValue('#00000022', '#ffffff44');

  const backgroundColor = useColorModeValue('gray.100', 'gray.600');
  const borderColor = 'teal.500'; // useColorModeValue('teal.500', 'teal.500');
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
    fitApps([app._id]);
  };

  return (
    <Box alignItems="center" display="flex" flexDir="column" gap="2">
      <Box
        width={mapWidth}
        height={mapHeight}
        backgroundColor={backgroundColor}
        borderRadius="md"
        borderWidth="1px"
        borderStyle="solid"
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
                    backgroundColor={app.data.type === 'Stickie' ? app.data.state.color + '.400' : borderColor}
                    position="absolute"
                    left={(app.data.position.x - appsX) * mapScale + 'px'}
                    top={(app.data.position.y - appsY) * mapScale + 'px'}
                    width={app.data.size.width * mapScale + 'px'}
                    height={app.data.size.height * mapScale + 'px'}
                    transition={'all .5s'}
                    onClick={() => moveToApp(app)}
                    borderWidth="1px"
                    borderStyle="solid"
                    borderColor={appBorderColor}
                    borderRadius="sm"
                    cursor="pointer"
                    justifyContent={'center'}
                    alignItems={'center'}
                    display={'flex'}
                    fontSize={Math.min(app.data.size.width * mapScale, app.data.size.height * mapScale) / 1.5}
                    _hover={{ backgroundColor: 'teal.200', transform: 'scale(1.1)' }}
                  >
                    {
                      // Pick an app icon
                      appIconsDefined.includes(app.data.type as AppIconsKey) ? appIcons[app.data.type as AppIconsKey] : <MdWindow />
                    }
                  </Box>
                </Tooltip>
              );
            })}
          {/* View of the User's Viewport */}
          {userViewport && (
            <Box
              backgroundColor={userViewportBGColor}
              position="absolute"
              left={(userViewport.position.x - appsX) * mapScale + 'px'}
              top={(userViewport.position.y - appsY) * mapScale + 'px'}
              width={userViewport.size.width * mapScale + 'px'}
              height={userViewport.size.height * mapScale + 'px'}
              transition={'all .5s'}
              _hover={{ backgroundColor: 'teal.200', transform: 'scale(1.1)' }}
              borderWidth="2px"
              borderStyle="dashed"
              borderColor={viewportBorderColor}
              borderRadius="sm"
              pointerEvents={'none'}
            ></Box>
          )}
        </Box>
      </Box>
      <Button size="xs" colorScheme={user?.data.color} width="100% " variant="outline" onClick={fitAllApps}>
        Show All Apps
      </Button>
    </Box>
  );
}
