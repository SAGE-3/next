/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useState, useEffect } from 'react';
import { Box, Text, Icon, useColorModeValue, Tooltip } from '@chakra-ui/react';
import { MdLock } from 'react-icons/md';

import { APIHttp, useHexColor } from '@sage3/frontend';
import { Board, Position, Size } from '@sage3/shared/types';
import { App, AppName } from '@sage3/applications/schema';

/* App component for BoardLink */

export function BoardPreview(props: { board: Board; width: number; height: number; isSelected?: boolean }): JSX.Element {
  // Apps
  const [appInfo, setAppInfo] = useState<{ position: Position; size: Size; type: AppName; id: string }[]>([]);
  const [boardWidth, setBoardWidth] = useState(0);
  const [boardHeight, setBoardHeight] = useState(0);
  const [appsX, setAppsX] = useState(0);
  const [appsY, setAppsY] = useState(0);
  const [mapScale, setMapScale] = useState(1);

  // Color
  const boardColor = useHexColor(props.board.data.color);
  const appBorderColorValue = useColorModeValue('gray.700', 'gray.200');
  const appBorderColor = useHexColor(appBorderColorValue);
  const linearBGColor = useColorModeValue(
    `linear-gradient(172deg, #fafafa, #fbfbfb, #eeeeee)`,
    `linear-gradient(172deg, #2e2e2e, #313131, #292929)`
  );

  async function updateAppInfo() {
    const res = await APIHttp.QUERY<App>('/apps', { boardId: props.board._id });
    if (res.success && res.data) {
      const apps = res.data;
      const appArray = [] as { position: Position; size: Size; type: AppName; id: string }[];
      apps.forEach((app) => {
        const aInfo = { position: app.data.position, size: app.data.size, type: app.data.type, id: app._id };
        appArray.push(aInfo);
      });
      const appsLeft = apps.map((app) => app.data.position.x);
      const appsRight = apps.map((app) => app.data.position.x + app.data.size.width);
      const appsTop = apps.map((app) => app.data.position.y);
      const appsBottom = apps.map((app) => app.data.position.y + app.data.size.height);

      const width = Math.max(...appsRight) - Math.min(...appsLeft);
      const height = Math.max(...appsBottom) - Math.min(...appsTop);

      const mapScale = Math.min(props.width / width, props.height / height) * 0.85;
      const x = Math.min(...appsLeft);
      const y = Math.min(...appsTop);

      setBoardHeight(height * mapScale);
      setBoardWidth(width * mapScale);
      setAppsX(x);
      setAppsY(y);
      setMapScale(mapScale);
      setAppInfo(appArray);
    }
  }

  useEffect(() => {
    updateAppInfo();
  }, [props.board._id]);

  return (
    <Box
      width={`${props.width}px`}
      height={`${props.height}px`}
      backgroundSize="contain"
      borderRadius="xl"
      background={linearBGColor}
      p="2"
      // border={`1px solid ${!props.isSelected ? 'lightgray' : boardColor}`}
      display="flex"
      alignItems="center"
      justifyContent="center"
      textAlign={'center'}
      flexDir={'column'}
    >
      {props.board.data.isPrivate ? (
        <>
          <Icon
            aria-label="LockBoard"
            fontSize="96px"
            pointerEvents="none"
            color={boardColor}
            m="0"
            p="0"
            _hover={{ cursor: 'initial' }}
            as={MdLock}
            textAlign={'center'}
            mb={2}
          />
        </>
      ) : appInfo.length > 0 ? (
        <Box position="relative" height={boardHeight} width={boardWidth}>
          {appInfo.map((app) => {
            return (
              <Box
                backgroundColor={boardColor}
                position="absolute"
                left={(app.position.x - appsX) * mapScale + 'px'}
                top={(app.position.y - appsY) * mapScale + 'px'}
                width={app.size.width * mapScale + 'px'}
                height={app.size.height * mapScale + 'px'}
                transition={'all .5s'}
                borderWidth="1px"
                borderStyle="solid"
                borderColor={appBorderColor}
                borderRadius="sm"
                key={app.id}
              ></Box>
            );
          })}
        </Box>
      ) : (
        <Text fontSize="2xl" mb="2" color={boardColor} fontWeight="bold" css={{ textWrap: 'balance' }}>
          No Opened Applications
        </Text>
      )}
    </Box>
  );
}
