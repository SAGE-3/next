/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useEffect, useRef } from 'react';
import { Box, Text, Icon, useColorModeValue } from '@chakra-ui/react';
import { MdLock } from 'react-icons/md';

import { App, AppName } from '@sage3/applications/schema';
import { APIHttp, useHexColor } from '@sage3/frontend';
import { Board, Position, Size } from '@sage3/shared/types';

export function BoardPreview(props: { board: Board; width: number; height: number; isSelected?: boolean }): JSX.Element {
  const [appInfo, setAppInfo] = useState<{ position: Position; size: Size; type: AppName; id: string }[]>([]);
  const [boardWidth, setBoardWidth] = useState(0);
  const [boardHeight, setBoardHeight] = useState(0);
  const [appsX, setAppsX] = useState(0);
  const [appsY, setAppsY] = useState(0);
  const [mapScale, setMapScale] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const boardColor = useHexColor(props.board.data.color);
  const appBorderColorValue = useColorModeValue('gray.700', 'gray.200');
  const appBorderColor = useHexColor(appBorderColorValue);
  const linearBGColor = useColorModeValue(
    `linear-gradient(172deg, #fafafa, #fbfbfb, #eeeeee)`,
    `linear-gradient(172deg, #2e2e2e, #313131, #292929)`
  );

  const PADDING = 2; // Padding in pixels

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

      const mapScale = Math.min((props.width - 2 * PADDING) / width, (props.height - 2 * PADDING) / height) * 0.85;
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

  useEffect(() => {
    if (canvasRef.current && appInfo.length > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        const canvasWidth = boardWidth + 2 * PADDING;
        const canvasHeight = boardHeight + 2 * PADDING;
        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = boardColor;
        ctx.strokeStyle = appBorderColor;
        ctx.lineWidth = 1;

        appInfo.forEach((app) => {
          const x = (app.position.x - appsX) * mapScale + PADDING;
          const y = (app.position.y - appsY) * mapScale + PADDING;
          const width = app.size.width * mapScale;
          const height = app.size.height * mapScale;

          ctx.fillRect(x, y, width, height);
          ctx.strokeRect(x, y, width, height);
        });
      }
    }
  }, [appInfo, boardColor, appBorderColor, mapScale, appsX, appsY, boardWidth, boardHeight]);

  return (
    <Box
      width={`${props.width}px`}
      height={`${props.height}px`}
      backgroundSize="contain"
      borderRadius="xl"
      background={linearBGColor}
      p="2"
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
        <canvas ref={canvasRef} style={{ width: `${boardWidth + 2 * PADDING}px`, height: `${boardHeight + 2 * PADDING}px` }} />
      ) : (
        <Text fontSize="2xl" mb="2" color={boardColor} fontWeight="bold" css={{ textWrap: 'balance' }}>
          No Opened Applications
        </Text>
      )}
    </Box>
  );
}
