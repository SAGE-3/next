/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { StuckTypes, useAppStore, useUIStore } from '@sage3/frontend';

import { Panel } from '../Panel';

export interface MinimapProps { }

export function NavigationPanel() {
  // App Store
  const apps = useAppStore((state) => state.apps);
  // UI store
  const position = useUIStore((state) => state.navigationMenu.position);
  const setPosition = useUIStore((state) => state.navigationMenu.setPosition);
  const opened = useUIStore((state) => state.navigationMenu.opened);
  const setOpened = useUIStore((state) => state.navigationMenu.setOpened);
  const show = useUIStore((state) => state.navigationMenu.show);
  const setShow = useUIStore((state) => state.navigationMenu.setShow);
  const stuck = useUIStore((state) => state.navigationMenu.stuck);
  const setStuck = useUIStore((state) => state.navigationMenu.setStuck);
  const controllerPosition = useUIStore((state) => state.controller.position);

  // Board size from the store
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const displayScale = 25;

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

  return (
    <Panel
      title={'Minimap'}
      opened={opened}
      setOpened={setOpened}
      setPosition={setPosition}
      position={position}
      width={50 + boardWidth / displayScale}
      showClose={true}
      show={show}
      setShow={setShow}
      stuck={stuck}
      setStuck={setStuck}
    >
      <Box alignItems="center" p="1" width="100%" display="flex">
        <Box width={boardWidth / displayScale + 'px'} height={boardHeight / displayScale + 'px'}
          backgroundColor="#586274" borderRadius="md" border="solid teal 2px">
          <Box position="absolute">
            {apps.map((app) => {
              return (
                <Box
                  key={app._id}
                  backgroundColor="teal"
                  position="absolute"
                  left={app.data.position.x / displayScale + 'px'}
                  top={app.data.position.y / displayScale + 'px'}
                  width={app.data.size.width / displayScale + 'px'}
                  height={app.data.size.height / displayScale + 'px'}
                  transition={'all .2s'}
                ></Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Panel>
  );
}
