/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Text } from '@chakra-ui/react';
import { AppError, Applications } from '@sage3/applications/apps';
import { App } from '@sage3/applications/schema';
import { useAppStore } from '@sage3/frontend';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

type BoardPreviewProps = {
  boardId: string;
};
/**
 * Board Preview component
 * @returns
 */
export function BoardPreview(props: BoardPreviewProps) {
  const [apps, setApps] = useState<App[]>([]);

  const maxWidth = 500;
  const maxHeight = 500;

  // Size
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [minX, setMinX] = useState(0);
  const [maxX, setMaxX] = useState(0);
  const [minY, setMinY] = useState(0);
  const [maxY, setMaxY] = useState(0);
  const [scale, setScale] = useState(1);

  const fetchBoardApp = useAppStore((state) => state.fetchBoardApps);

  useEffect(() => {
    async function fetchApps() {
      const resApps = await fetchBoardApp(props.boardId);
      if (resApps) {
        const xvals = [] as number[];
        const yvals = [] as number[];
        resApps.forEach((app) => {
          const x1 = app.data.position.x;
          const y1 = app.data.position.y;
          const x2 = x1 + app.data.size.width;
          const y2 = y1 + app.data.size.height;
          xvals.push(x1, x2);
          yvals.push(y1, y2);
        });
        const maxX = Math.max(...xvals);
        const maxY = Math.max(...yvals);
        const minX = Math.min(...xvals);
        const minY = Math.min(...yvals);
        const width = maxX - minX;
        const height = maxY - minY;
        const scale = Math.min(maxWidth / width, maxHeight / height);
        setScale(scale);
        setMinX(minX);
        setMaxX(maxX);
        setMinY(minY);
        setMaxY(maxY);
        setWidth(width);
        setHeight(height);
        setApps(resApps);
      }
    }

    fetchApps();
  }, [props.boardId]);

  return (
    <Box>
      <Text fontSize="4xl">Board Preview</Text>
      <Text fontSize="2xl">{props.boardId}</Text>
      <Box
        width={width + 'px'}
        height={height + 'px'}
        pointerEvents="none"
        transform={`scale(${scale})`}
        position="absolute"
        transformOrigin="top left"
      >
        {apps.map((app) => {
          const Component = Applications[app.data.type].AppComponent;
          app.data.position.x = app.data.position.x - minX;
          app.data.position.y = app.data.position.y - minY;

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
