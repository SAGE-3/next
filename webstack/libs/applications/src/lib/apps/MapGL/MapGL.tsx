/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@sage3/frontend';
import { Button, Box } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

import maplibregl from 'maplibre-gl';

// Styling
import './maplibre-gl.css';

/* App component for MapGL */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const [map, setMap] = useState<maplibregl.Map>();
  const updateState = useAppStore((state) => state.updateState);

  useEffect(() => {
    setMap(() => {
      console.log('MapGL: creating map', props._id);
      return new maplibregl.Map({
        container: 'map' + props._id,
        style: 'https://api.maptiler.com/maps/bright/style.json?key=4vBZtdgkPHakm28uzrnt',
        // style: 'https://demotiles.maplibre.org/style.json',
        // style: {
        //   "version": 8,
        //   "sources": {
        //     "osm": {
        //       "type": "raster",
        //       "tiles": ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
        //       "tileSize": 256,
        //       "attribution": "OpenStreetMap Contributors",
        //       "maxzoom": 19
        //     }
        //   },
        //   "layers": [
        //     {
        //       "id": "osm",
        //       "type": "raster",
        //       "source": "osm" // This must match the source key above
        //     }
        //   ]
        // },
        center: [s.location[1], s.location[0]],
        zoom: s.zoom
      });
    });
  }, [props._id]);

  useEffect(() => {
    map?.resize();
  }, [props.data.size.width, props.data.size.height]);

  return (
    <AppWindow app={props}>
      <Box id={'map' + props._id} w="100%" h="100%"></Box>
    </AppWindow>
  );
}

/* App toolbar component for the app MapGL */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (<> </>);
}

export default { AppComponent, ToolbarComponent };
