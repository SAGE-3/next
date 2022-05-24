/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';
import { AppExport, MenuBarProps } from '@sage3/shared/types';

import { leafBaseLayer, LeafletViewerProps, leafLocation, leafOverlay, leafZoom, meta } from './metadata';
import { useSageAssetUrl, useSageStateAtom } from '@sage3/frontend/smart-data/hooks';
import { Button, ButtonGroup, Tooltip, Box } from '@chakra-ui/react';
import { FaMinus, FaPlus, FaRoad } from 'react-icons/fa';
import { FiGlobe } from 'react-icons/fi';
import { useAction } from '@sage3/frontend/services';
import { S3AppIcon } from '@sage3/frontend/ui';
import { MdOutlinePlace } from 'react-icons/md';
import { truncateWithEllipsis } from '@sage3/frontend/utils/misc';

const Title = (props: LeafletViewerProps) => {
  const zoom = useSageStateAtom<leafZoom>(props.state.zoom);
  const location = useSageStateAtom<leafLocation>(props.state.location);

  return (
    <>
      <p style={{ fontWeight: 'bold', margin: 0 }}>Leaflet</p> &nbsp; &nbsp;
      <p style={{ margin: 0 }}>
        Location {location.data.value[0].toFixed(2)},{location.data.value[1].toFixed(2)}
      </p>{' '}
      &nbsp; &nbsp;
      <p style={{ margin: 0 }}>Zoom {zoom.data.value}</p>
    </>
  );
};

const Controls = (props: LeafletViewerProps) => {
  const zoom = useSageStateAtom<leafZoom>(props.state.zoom);
  const location = useSageStateAtom<leafLocation>(props.state.location);
  const baseLayer = useSageStateAtom<leafBaseLayer>(props.state.baseLayer);
  const overlay = useSageStateAtom<leafOverlay>(props.state.overlay);
  const geojson = useSageAssetUrl(props.data.layer);

  const { act } = useAction();

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Zoom In'} openDelay={400}>
          <Button onClick={() => zoom.setData({ value: zoom.data.value - 1 })}>
            <FaMinus />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Zoom Out'} openDelay={400}>
          <Button onClick={() => zoom.setData({ value: zoom.data.value + 1 })}>
            <FaPlus />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Satellite'} openDelay={400}>
          <Button onClick={() => baseLayer.setData({ value: 'World Imagery' })}>
            <FiGlobe />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Street'} openDelay={400}>
          <Button onClick={() => baseLayer.setData({ value: 'OpenStreetMap' })}>
            <FaRoad />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
};

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: LeafletViewerProps & MenuBarProps) => {
  const str = truncateWithEllipsis(props.data.layer.meta.filename, 17);

  return (
    <Tooltip hasArrow={true} label={props.showInfo ? props.data.layer.meta.filename : 'Leaflet Viewer'} openDelay={400}>
      <Box display="inline">
        {props.showIcon ? (
          <S3AppIcon icon={MdOutlinePlace} appTitle={props.showInfo ? str : undefined} />
        ) : props.showInfo ? (
          str
        ) : undefined}
      </Box>
    </Tooltip>
  );
};

const App = React.lazy(() => import('./leaflet-viewer'));

const LeafletViewer = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default LeafletViewer;
