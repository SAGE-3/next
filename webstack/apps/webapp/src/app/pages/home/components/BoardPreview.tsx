/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { memo, useMemo, useEffect, useRef } from 'react';
import { Box, Text, Icon, useColorModeValue } from '@chakra-ui/react';
import { MdLock } from 'react-icons/md';

import { useHexColor } from '@sage3/frontend';
import { Board, Position, Size } from '@sage3/shared/types';
import { AppName } from '@sage3/applications/schema';

// Minimal app layout info needed to render the spatial preview
export type AppInfo = { position: Position; size: Size; type: AppName; id: string };

const PADDING = 2;

export const BoardPreview = memo(function BoardPreview(props: {
  board: Board;
  width: number;
  height: number;
  isSelected?: boolean;
  appInfo: AppInfo[];
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const boardColor = useHexColor(props.board.data.color);
  const appBorderColorValue = useColorModeValue('gray.700', 'gray.200');
  const appBorderColor = useHexColor(appBorderColorValue);
  const linearBGColor = useColorModeValue(
    `linear-gradient(172deg, #fafafa, #fbfbfb, #eeeeee)`,
    `linear-gradient(172deg, #2e2e2e, #313131, #292929)`,
  );

  const { boardWidth, boardHeight, appsX, appsY, mapScale } = useMemo(() => {
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    for (const app of props.appInfo) {
      left = Math.min(left, app.position.x);
      top = Math.min(top, app.position.y);
      right = Math.max(right, app.position.x + app.size.width);
      bottom = Math.max(bottom, app.position.y + app.size.height);
    }
    if (!props.appInfo.length) return { boardWidth: 0, boardHeight: 0, appsX: 0, appsY: 0, mapScale: 1 };
    const width = right - left;
    const height = bottom - top;
    const scale = Math.min((props.width - 2 * PADDING) / (width || 1), (props.height - 2 * PADDING) / (height || 1)) * 0.85;
    return { boardWidth: width * scale, boardHeight: height * scale, appsX: left, appsY: top, mapScale: scale };
  }, [props.appInfo, props.width, props.height]);

  // Redraw canvas when layout or colors change
  useEffect(() => {
    if (canvasRef.current && props.appInfo.length > 0) {
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

        props.appInfo.forEach((app) => {
          const x = (app.position.x - appsX) * mapScale + PADDING;
          const y = (app.position.y - appsY) * mapScale + PADDING;
          const width = app.size.width * mapScale;
          const height = app.size.height * mapScale;
          ctx.fillRect(x, y, width, height);
          ctx.strokeRect(x, y, width, height);
        });
      }
    }
  }, [props.appInfo, props.board.data.isPrivate, boardColor, appBorderColor, mapScale, appsX, appsY, boardWidth, boardHeight]);

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
            fontSize="60px"
            pointerEvents="none"
            color={boardColor}
            m="0"
            p="0"
            _hover={{ cursor: 'initial' }}
            as={MdLock}
            textAlign={'center'}
            mb={2}
          />
          <Text fontWeight="bold" fontSize="xl" color={boardColor}>
            Private
          </Text>
        </>
      ) : props.appInfo.length > 0 ? (
        <canvas ref={canvasRef} style={{ width: `${boardWidth + 2 * PADDING}px`, height: `${boardHeight + 2 * PADDING}px` }} />
      ) : (
        <Text fontSize="xl" mb="2" color={boardColor} fontWeight="bold" css={{ textWrap: 'balance' }}>
          No Opened Applications
        </Text>
      )}
    </Box>
  );
});
