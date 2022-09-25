/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Text, useColorMode, useColorModeValue } from '@chakra-ui/react';
import { AppError, Applications } from '@sage3/applications/apps';
import { App } from '@sage3/applications/schema';
import { useAppStore, useBoardStore, useUIStore } from '@sage3/frontend';
import { sageColorByName } from '@sage3/shared';
import { Board } from '@sage3/shared/types';
import { useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { readAndApplyDeleteSet } from 'yjs/dist/src/internals';

type BoardPreviewProps = {
  board: Board;
};

/**
 * Board Preview component
 * @returns
 */
export function BoardPreview(props: BoardPreviewProps) {
  const [apps, setApps] = useState<App[]>([]);

  const boardHeight = useUIStore((state) => state.boardHeight);
  const boardWidth = useUIStore((state) => state.boardWidth);

  const borderWidth = 4;
  const maxWidth = 1200 - borderWidth * 2;
  const maxHeight = 675 - borderWidth * 2;

  const scale = Math.min(maxWidth / boardWidth, maxHeight / boardHeight);

  const fetchBoardApp = useAppStore((state) => state.fetchBoardApps);
  const backgroundColor = useColorModeValue('gray.100', 'gray.700');

  useEffect(() => {
    async function fetchApps() {
      const resApps = await fetchBoardApp(props.board._id);
      if (resApps) {
        setApps(resApps);
      }
    }
    fetchApps();
  }, [props.board._id]);

  return (
    <Box
      width={maxWidth + 'px'}
      height={maxHeight + 'px'}
      backgroundColor={backgroundColor}
      borderRadius="md"
      pointerEvents="none"
      border={`solid ${borderWidth}px ${sageColorByName(props.board.data.color)}`}
      overflow="hidden"
    >
      <Box width={maxWidth + 'px'} height={maxHeight + 'px'} transform={`scale(${scale})`} transformOrigin="top left">
        {apps.map((app) => {
          const Component = Applications[app.data.type].AppComponent;
          return (
            // Wrap the components in an errorboundary to protect the board from individual app errors
            <ErrorBoundary
              key={app._id}
              fallbackRender={({ error, resetErrorBoundary }) => (
                <AppError error={error} resetErrorBoundary={resetErrorBoundary} app={app} />
              )}
            >
              <Component key={app._id} {...app}></Component>
            </ErrorBoundary>
          );
        })}
      </Box>
    </Box>
  );
}
