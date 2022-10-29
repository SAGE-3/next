/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect } from 'react';
import { Box, Button, Tooltip } from '@chakra-ui/react';

import { BsPencilFill } from 'react-icons/bs';
import { FaEraser, FaTrash } from 'react-icons/fa';

import { useUIStore, StuckTypes, useHotkeys } from '@sage3/frontend';
import { SAGEColors } from '@sage3/shared';

import { ColorPicker } from 'libs/frontend/src/lib/ui/components/general';
import { Panel } from '../Panel';

export interface WhiteboardPanelProps {
  boardId: string;
  roomId: string;
}

export function WhiteboardPanel(props: WhiteboardPanelProps) {
  const position = useUIStore((state) => state.whiteboardPanel.position);
  const setPosition = useUIStore((state) => state.whiteboardPanel.setPosition);
  const opened = useUIStore((state) => state.whiteboardPanel.opened);
  const setOpened = useUIStore((state) => state.whiteboardPanel.setOpened);
  const show = useUIStore((state) => state.whiteboardPanel.show);
  const setShow = useUIStore((state) => state.whiteboardPanel.setShow);
  const stuck = useUIStore((state) => state.whiteboardPanel.stuck);
  const setStuck = useUIStore((state) => state.whiteboardPanel.setStuck);
  const zIndex = useUIStore((state) => state.panelZ).indexOf('whiteboard');
  const controllerPosition = useUIStore((state) => state.controller.position);

  // Whiteboard information
  const whiteboardMode = useUIStore((state) => state.whiteboardMode);
  const setWhiteboardMode = useUIStore((state) => state.setWhiteboardMode);
  const setClearMarkers = useUIStore((state) => state.setClearMarkers);
  const setClearAllMarkers = useUIStore((state) => state.setClearAllMarkers);
  const markerColor = useUIStore((state) => state.markerColor);
  const setMarkerColor = useUIStore((state) => state.setMarkerColor);

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
    setMarkerColor(color);
  };

  return (
    <Panel
      title={'Whiteboard'}
      name="whiteboard"
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
      </Box>
    </Panel>
  );
}
