/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { HStack, Box, ButtonGroup, Tooltip, Button, InputGroup, Input } from '@chakra-ui/react';

import create from 'zustand';
import maplibregl from 'maplibre-gl';
import * as esriLeafletGeocoder from 'esri-leaflet-geocoder';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

import { useAppStore } from '@sage3/frontend';

import { MdAdd, MdRemove, MdMap, MdTerrain } from 'react-icons/md';

// Styling
import './maplibre-gl.css';

// Zustand store to communicate with toolbar
export const useStore = create((set) => ({
  map: {} as { [key: string]: maplibregl.Map },
  saveMap: (id: string, map: maplibregl.Map) => set((state: any) => ({ map: { ...state.map, ...{ [id]: map } } })),
}));

const maxZoom = 18;
const minZoom = 1;

/* App component for MapGL */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // const [map, setMap] = useState<maplibregl.Map>();
  const updateState = useAppStore((state) => state.updateState);
  const saveMap = useStore((state: any) => state.saveMap);
  const map = useStore((state: any) => state.map[props._id]);
  // Presence Information
  // const { user } = useUser();

  useEffect(() => {
    const localmap = new maplibregl.Map({
      container: 'map' + props._id,
      attributionControl: false,
      // style: 'https://api.maptiler.com/maps/bright/style.json?key=4vBZtdgkPHakm28uzrnt',
      // style: 'https://demotiles.maplibre.org/style.json',

      style: {
        "version": 8,
        "sources": {
          "world": {
            "type": "raster",
            "tiles": ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
            "tileSize": 256,
            "attribution": "Tiles &copy; Esri &mdash; Source: Esri, and the GIS User Community",
            "maxzoom": 19
          }
        },
        "layers": [
          {
            "id": "world",
            "type": "raster",
            "source": "world"
          }
        ]
      },


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

      center: s.location as maplibregl.LngLatLike,
      zoom: s.zoom
    });

    localmap.on('moveend', (evt) => {
      // if originalEvent is null, this is a programmatic move
      if (evt.originalEvent) {
        const lmap = evt.target;
        const zoom = lmap.getZoom();
        const center = lmap.getCenter();
        // Update center and zoom level
        updateState(props._id, { zoom: zoom, location: [center.lng, center.lat] });
      }
    });

    // Add button for attribution
    localmap.addControl(new maplibregl.AttributionControl({ compact: true }));

    localmap.addControl(new maplibregl.NavigationControl({ showCompass: false }));

    // Disable map rotations
    localmap.dragRotate.disable();
    localmap.touchZoomRotate.disableRotation();
    localmap.keyboard.disableRotation();
    // Disable map zooming with a box (shift click and drag)
    localmap.boxZoom.disable();

    // Save map to store
    saveMap(props._id, localmap);
  }, [props._id]);

  useEffect(() => {
    if (map) {
      // Update zoom from server, duration 0 to update immediately
      map.zoomTo(s.zoom, { duration: 0 });
    }
  }, [map, s.zoom]);

  useEffect(() => {
    if (map) {
      // Update center from server, duration 0 to update immediately
      map.setCenter([s.location[0], s.location[1]], { duration: 0 });
    }
  }, [map, s.location]);

  useEffect(() => {
    // when app is resized, reset the center
    if (map) {
      map.setCenter(s.location, { duration: 0 });
      map.resize();
    }
  }, [props.data.size.width, props.data.size.height, map]);

  return (
    <AppWindow app={props}>
      {/* One box for map, one box for container */}
      <Box id={'container' + props._id} w={props.data.size.width} h={props.data.size.height}>
        <Box id={'map' + props._id} w="100%" h="100%" />
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app MapGL */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const map = useStore((state: any) => state.map[props._id]);
  const [addrValue, setAddrValue] = useState('');
  const update = useAppStore((state) => state.update);

  const apiKey = 'AAPK74760e71edd04d12ac33fd375e85ba0d4CL8Ho3haHz1cOyUgnYG4UUEW6NG0xj2j1qsmVBAZNupoD44ZiSJ4DP36ksP-t3B';
  // @ts-expect-error
  const geocoder = new esriLeafletGeocoder.geocode({
    apikey: apiKey,

  });

  // from the UI to the react state
  const handleAddrChange = (event: any) => setAddrValue(event.target.value);
  const changeAddr = (evt: any) => {
    evt.preventDefault();

    geocoder.text(addrValue).run(function (err: any, results: any, response: any) {
      if (err) {
        console.log('geocoder> error:', err);
        return;
      }
      const res = results.results[0];
      if (res && res.latlng) {
        const center: [number, number] = [res.latlng.lng, res.latlng.lat];
        // Bounds
        const ne = res.bounds._northEast;
        const sw = res.bounds._southWest;
        const bbox = [[sw.lng, sw.lat], [ne.lng, ne.lat]];
        map.fitBounds(new maplibregl.LngLatBounds(bbox), { duration: 0 });
        map.setCenter(center, { duration: 0 });

        // Sync zoom after fitting bounds
        const newZoom = map.getZoom();
        updateState(props._id, { location: center, zoom: newZoom });

        // Update the app title
        update(props._id, { title: res.text });
      }
    });
  };

  // Zoom in on the map
  const incZoom = () => {
    const zoom = s.zoom + 1;
    const limitZoom = Math.min(zoom, maxZoom);
    map.zoomTo(limitZoom);
    updateState(props._id, { zoom: limitZoom });
  };

  // Zoom out on the map
  const decZoom = () => {
    const zoom = s.zoom - 1;
    const limitZoom = Math.max(zoom, minZoom);
    map.zoomTo(limitZoom);
    updateState(props._id, { zoom: limitZoom });
  };

  return (
    <HStack>
      <ButtonGroup>
        <form onSubmit={changeAddr}>
          <InputGroup size="xs" minWidth="80px">
            <Input
              defaultValue={addrValue}
              onChange={handleAddrChange}
              onPaste={(event) => {
                event.stopPropagation();
              }}
              backgroundColor="whiteAlpha.300"
              placeholder="Type a place or address"
              _placeholder={{ opacity: 1, color: 'gray.400' }}
            />
          </InputGroup>
        </form>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Zoom In'} openDelay={400}>
          <Button isDisabled={s.zoom > maxZoom} onClick={incZoom}>
            <MdAdd fontSize="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Zoom Out'} openDelay={400}>
          <Button isDisabled={s.zoom <= minZoom} onClick={decZoom}>
            <MdRemove fontSize="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </HStack>
  );
}

export default { AppComponent, ToolbarComponent };
