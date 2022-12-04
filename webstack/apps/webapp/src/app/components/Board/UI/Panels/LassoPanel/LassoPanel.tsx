/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { MouseEventHandler, useEffect } from 'react';
import { Box, Button, useToast, Tooltip } from '@chakra-ui/react';

import { BsPencilFill } from 'react-icons/bs';
import { FaEraser, FaTrash, FaCamera } from 'react-icons/fa';

import { useUIStore, StuckTypes, useAppStore } from '@sage3/frontend';
import { SAGEColors } from '@sage3/shared';

import { ColorPicker } from 'libs/frontend/src/lib/ui/components/general';
import { Panel } from '../Panel';
import { isElectron } from 'libs/applications/src/lib/apps/Cobrowse/util';

export interface LassoPanelProps {
  boardId: string;
  roomId: string;
}

export function LassoPanel(props: LassoPanelProps) {
  const position = useUIStore((state) => state.lassoPanel.position);
  const setPosition = useUIStore((state) => state.lassoPanel.setPosition);
  const opened = useUIStore((state) => state.lassoPanel.opened);
  const setOpened = useUIStore((state) => state.lassoPanel.setOpened);
  const show = useUIStore((state) => state.lassoPanel.show);
  const setShow = useUIStore((state) => state.lassoPanel.setShow);
  const stuck = useUIStore((state) => state.lassoPanel.stuck);
  const setStuck = useUIStore((state) => state.lassoPanel.setStuck);
  const zIndex = useUIStore((state) => state.panelZ).indexOf('lasso');
  const controllerPosition = useUIStore((state) => state.controller.position);
  // Apps
  const hideUI = useUIStore((state) => state.hideUI);
  const showUI = useUIStore((state) => state.displayUI);
  const fitApps = useUIStore((state) => state.fitApps);
  const apps = useAppStore((state) => state.apps);
  const toast = useToast();

  // Whiteboard information
  const lassoMode = useUIStore((state) => state.lassoMode);
  const setLassoMode = useUIStore((state) => state.setLassoMode);
  const setClearLassos = useUIStore((state) => state.setClearLassos);
  const setClearAllLassos = useUIStore((state) => state.setClearAllLassos);
  const lassoColor = useUIStore((state) => state.lassoColor);
  const setLassoColor = useUIStore((state) => state.setLassoColor);

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

  const handleColorChange = (color: SAGEColors) => {
    setLassoMode(true);
    setLassoColor(color);
  };

  const screenshot = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.shiftKey) {
      // Cleanup the board
      toast.closeAll();
      hideUI();
      fitApps(apps);
    }
    // Ask electron to take a screenshot
    if (isElectron()) {
      const electron = window.require('electron');
      const ipcRenderer = electron.ipcRenderer;
      setTimeout(() => {
        // send the message to the main process
        // small delay to make sure the board is rendered
        ipcRenderer.send('take-screenshot');
      }, 100);
      // Restore the UI
      setTimeout(() => {
        if (event.shiftKey) {
          showUI();
        }
      }, 3000);
    }
  };

  return (
    <Panel
      title={'Annotation'}
      name="lasso"
      opened={opened}
      setOpened={setOpened}
      setPosition={setPosition}
      position={position}
      width={600}
      showClose={true}
      show={show}
      setShow={setShow}
      stuck={stuck}
      setStuck={setStuck}
      zIndex={zIndex}
    >
      <Box alignItems="center" pb="1" width="100%" display="flex">
        <Tooltip placement="top" hasArrow label={lassoMode ? 'Disable Lasso' : 'Enable Lasso'}>
          <Button onClick={() => setLassoMode(!lassoMode)} size="sm" mr="2" colorScheme={lassoMode ? 'green' : 'gray'}>
            <BsPencilFill />
          </Button>
        </Tooltip>

        <ColorPicker selectedColor={lassoColor} onChange={handleColorChange} size="sm"></ColorPicker>

        <Tooltip placement="top" hasArrow label="Erase Your Lines">
          <Button onClick={() => setClearLassos(true)} ml="2" size="sm">
            <FaEraser />
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow label="Erase All">
          <Button onClick={() => setClearAllLassos(true)} ml="2" size="sm">
            <FaTrash />
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow openDelay={1600} label="Screenshot in SAGE3 client (maximize your window for high-quality)">
          <Button onClick={screenshot} ml="2" size="sm" disabled={!isElectron()}>
            <FaCamera />
          </Button>
        </Tooltip>
      </Box>
    </Panel>
  );
}
