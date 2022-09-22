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
import { useAppStore } from '@sage3/frontend';
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

  const [maxWidth, setMaxWidth] = useState(500);
  const [maxHeight, setMaxHeight] = useState(500);

  // Size
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [minX, setMinX] = useState(0);
  const [maxX, setMaxX] = useState(0);
  const [minY, setMinY] = useState(0);
  const [maxY, setMaxY] = useState(0);
  const [scale, setScale] = useState(1);

  const fetchBoardApp = useAppStore((state) => state.fetchBoardApps);

  const ref = useRef<HTMLDivElement>(null);

  const backgroundColor = useColorModeValue('gray.100', 'gray.700');
  useEffect(() => {
    const newWindowSize = () => {
      if (ref.current) {
        setMaxWidth(1000);
        setMaxHeight(800);
      }
    };
    window.addEventListener('resize', newWindowSize);
    return () => window.removeEventListener('resize', newWindowSize);
  }, []);

  useEffect(() => {
    if (apps.length > 0) {
      const xvals = [] as number[];
      const yvals = [] as number[];
      apps.forEach((app) => {
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
      const width = 3840;
      const height = 2160;
      const scale = Math.min(maxWidth / width, maxHeight / height);
      setScale(scale);
      setMinX(minX);
      setMaxX(maxX);
      setMinY(minY);
      setMaxY(maxY);
      setWidth(width);
      setHeight(height);
      console.log('here i am', maxWidth, maxHeight, width, height);
    }
  }, [apps, maxWidth, maxHeight]);

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
    <Box ref={ref} width="1000px" height="800px" backgroundColor={backgroundColor} borderRadius="md" display="flex" flexDir="column">
      <Text fontSize="4xl">{props.board.data.name} Preview</Text>
      <Box
        width={width + 'px'}
        height={height + 'px'}
        borderRadius="md"
        pointerEvents="none"
        transform={`scale(${scale})`}
        transformOrigin="top left"
        border="solid red 1px"
      >
        {apps.map((app) => {
          const appDataCopy = JSON.parse(JSON.stringify(app));
          const Component = Applications[appDataCopy.data.type].AppComponent;

          return (
            // Wrap the components in an errorboundary to protect the board from individual app errors
            <ErrorBoundary
              key={app._id}
              fallbackRender={({ error, resetErrorBoundary }) => (
                <AppError error={error} resetErrorBoundary={resetErrorBoundary} app={appDataCopy} />
              )}
            >
              <Component key={app._id} {...appDataCopy}></Component>
            </ErrorBoundary>
          );
        })}
      </Box>
    </Box>
  );
}
