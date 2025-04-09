/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Tooltip, IconButton, Divider } from '@chakra-ui/react';

import { useUIStore, useThrottleApps } from '@sage3/frontend';
import { MdDeselect } from 'react-icons/md';

type EscapeAppProps = {};
const APP_SPACE_BUFFER = 150;

export function EscapeApp(props: EscapeAppProps) {
  const apps = useThrottleApps(1000);
  const viewport = useUIStore((state) => state.viewport);
  const [viewportInApp, setViewportInApp] = useState(false);

  // UiStore
  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);

  useEffect(() => {
    if (!selectedAppId) {
      setViewportInApp(false);
      return;
    }

    let vpInApp = false;
    for (let i = 0; i < apps.length; i++) {
      const app = apps[i];
      const h = app.data.size.height;
      const w = app.data.size.width;
      const x = app.data.position.x;
      const y = app.data.position.y;
      const vx = viewport.position.x;
      const vy = viewport.position.y;
      const vw = viewport.size.width;
      const vh = viewport.size.height;
      const isInside =
        vx >= x - APP_SPACE_BUFFER &&
        vx + vw <= x + w + APP_SPACE_BUFFER &&
        vy >= y - APP_SPACE_BUFFER &&
        vy + vh <= y + h + APP_SPACE_BUFFER;

      if (isInside) {
        vpInApp = true;
        break;
      }
    }
    setViewportInApp(vpInApp);
  }, [apps, viewport, selectedAppId]);

  return (
    <>
      {viewportInApp && (
        <>
          <Divider orientation="vertical" mx="1" />
          <Tooltip label={'Deselect App'} placement={'top'} hasArrow={true} openDelay={400}>
            <IconButton
              borderRadius={'0.5rem 0.5rem 0.5rem 0.5rem'}
              size="sm"
              colorScheme={'red'}
              icon={<MdDeselect />}
              fontSize="xl"
              aria-label={'input-type'}
              onClick={() => {
                setSelectedApp('');
              }}
            ></IconButton>
          </Tooltip>
        </>
      )}
    </>
  );
}
