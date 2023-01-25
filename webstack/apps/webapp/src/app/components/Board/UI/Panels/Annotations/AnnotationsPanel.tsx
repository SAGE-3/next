/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Box, Button, useToast, Tooltip } from '@chakra-ui/react';

import { BsPencilFill } from 'react-icons/bs';
import { FaEraser, FaTrash, FaCamera } from 'react-icons/fa';

import { useUIStore, useAppStore, isElectron } from '@sage3/frontend';
import { SAGEColors } from '@sage3/shared';

import { ColorPicker } from 'libs/frontend/src/lib/ui/components/general';
import { Panel } from '../Panel';

export interface AnnotationsPanelProps {
  boardId: string;
  roomId: string;
}

export function AnnotationsPanel(props: AnnotationsPanelProps) {
  // UI Store
  const hideUI = useUIStore((state) => state.hideUI);
  const showUI = useUIStore((state) => state.displayUI);
  const fitApps = useUIStore((state) => state.fitApps);
  const apps = useAppStore((state) => state.apps);
  const toast = useToast();

  // Whiteboard information
  const whiteboardMode = useUIStore((state) => state.whiteboardMode);
  const setWhiteboardMode = useUIStore((state) => state.setWhiteboardMode);
  const setClearMarkers = useUIStore((state) => state.setClearMarkers);
  const setClearAllMarkers = useUIStore((state) => state.setClearAllMarkers);
  const markerColor = useUIStore((state) => state.markerColor);
  const setMarkerColor = useUIStore((state) => state.setMarkerColor);

  const handleColorChange = (color: SAGEColors) => {
    setWhiteboardMode(true);
    setMarkerColor(color);
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
      setTimeout(() => {
        // send the message to the main process
        // small delay to make sure the board is rendered
        window.electron.send('take-screenshot', {});
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
    <Panel title="Annotations" name="annotations" width={600} showClose={false} zIndex={100}>
      <Box alignItems="center" pb="1" width="100%" display="flex">
        <Tooltip placement="top" hasArrow label={whiteboardMode ? 'Disable Marker' : 'Enable Marker'}>
          <Button onClick={() => setWhiteboardMode(!whiteboardMode)} size="sm" mr="2" colorScheme={whiteboardMode ? 'green' : 'gray'}>
            <BsPencilFill />
          </Button>
        </Tooltip>

        <ColorPicker selectedColor={markerColor} onChange={handleColorChange} size="sm"></ColorPicker>

        <Tooltip placement="top" hasArrow label="Erase Your Lines">
          <Button onClick={() => setClearMarkers(true)} ml="2" size="sm">
            <FaEraser />
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow label="Erase All">
          <Button onClick={() => setClearAllMarkers(true)} ml="2" size="sm">
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
