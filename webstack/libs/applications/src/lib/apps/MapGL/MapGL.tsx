/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { HStack, Box, ButtonGroup, Tooltip, Button, InputGroup, Input, useToast } from '@chakra-ui/react';
import { MdAdd, MdRemove, MdMap, MdTerrain, Md3DRotation } from 'react-icons/md';

// Data store
import create from 'zustand';
// Map library
import maplibregl from 'maplibre-gl';
// Geocoding
import * as esriLeafletGeocoder from 'esri-leaflet-geocoder';
// Turfjs geojson utilities functions
import bbox from '@turf/bbox';
import center from '@turf/center';

import { useAppStore, useAssetStore } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';
import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

// Styling
import './maplibre-gl.css';

// Get a URL for an asset
export function getStaticAssetUrl(filename: string): string {
  return `/api/assets/static/${filename}`;
}

// Zustand store to communicate with toolbar
export const useStore = create((set) => ({
  map: {} as { [key: string]: maplibregl.Map },
  saveMap: (id: string, map: maplibregl.Map) => set((state: any) => ({ map: { ...state.map, ...{ [id]: map } } })),
}));

// Zoom levels
const maxZoom = 18;
const minZoom = 1;

// ArcGIS API Key
const esriKey = 'AAPK74760e71edd04d12ac33fd375e85ba0d4CL8Ho3haHz1cOyUgnYG4UUEW6NG0xj2j1qsmVBAZNupoD44ZiSJ4DP36ksP-t3B';

// MapTiler API Key
const mapTilerAPI = 'elzgvVROErSfCRbrVabp';
const baselayers = {
  Satellite: `https://api.maptiler.com/maps/hybrid/style.json?key=${mapTilerAPI}`,
  OpenStreetMap: `https://api.maptiler.com/maps/streets/style.json?key=${mapTilerAPI}`,
};

/* App component for MapGL */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // const [map, setMap] = useState<maplibregl.Map>();
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const saveMap = useStore((state: any) => state.saveMap);
  const map = useStore((state: any) => state.map[props._id]);

  // Assets store
  const assets = useAssetStore((state) => state.assets);
  const [file, setFile] = useState<Asset>();

  // Source
  const [source, setSource] = useState<{ id: string; data: any } | null>(null);

  // Toast to inform user about errors
  const toast = useToast();

  // Add the source to the map
  // This is needed when the baselayer is changed
  function addSource() {
    if (source) {
      // Check if the source is already added
      if (map.getSource(source.id)) {
        return;
      }
      // Add the source to the map
      map.addSource(source.id, {
        type: 'geojson',
        data: source.data,
      });
      // Layer for Polygons (lines and fills)
      map.addLayer({
        id: source.id + 'line',
        source: source.id,
        type: 'line',
        paint: {
          'line-color': '#000',
          'line-width': 2,
        },
        filter: ['==', '$type', 'Polygon'],
      });
      map.addLayer({
        id: source.id + 'fill',
        source: source.id,
        type: 'fill',
        paint: {
          'fill-outline-color': '#000',
          'fill-color': '#39b5e6',
          'fill-opacity': 0.4,
        },
        filter: ['==', '$type', 'Polygon'],
      });
      // Layer for points
      map.addLayer({
        id: source.id + 'symbol',
        source: source.id,
        type: 'circle',
        paint: {
          'circle-color': '#ff7800',
          'circle-opacity': 0.4,
          'circle-stroke-width': 2,
          'circle-radius': 5,
        },
        filter: ['==', '$type', 'Point'],
      });
    }
  }

  // Convert ID to asset
  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.assetid);
    if (myasset) {
      setFile(myasset);
      // Update the app title
      update(props._id, { title: myasset?.data.originalfilename });
    }
  }, [s.assetid, assets]);

  // Convert asset to URL
  useEffect(() => {
    if (file && map) {
      // when the map is loaded, add the source and layers
      map.on('load', async () => {
        const newURL = getStaticAssetUrl(file.data.file);
        console.log('MapGL> Adding source to map', newURL);
        // Get the GEOJSON data from the asset
        const response = await fetch(newURL, {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        const gjson = await response.json();

        // Check if the file is valid
        // bbox will throw an error if an invalid geojson is passed
        try {
          // Calculate the bounding box and center using turf library
          const box = bbox(gjson);
          const cc = center(gjson).geometry.coordinates;
          // Duration is zero to get a valid zoom value next
          map.fitBounds(box, { padding: 20, duration: 0 });
          updateState(props._id, { zoom: map.getZoom(), location: cc });
          // Add the source to the map
          setSource({ id: file._id, data: gjson });
        } catch (error: any) {
          toast({
            title: 'Error',
            description: 'Error loading GEOJSON file',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      });
    }
  }, [file, map, setSource]);

  // If the source is changed, add it to the map
  useEffect(() => {
    if (source) {
      addSource();
    }
  }, [source]);

  useEffect(() => {
    const localmap = new maplibregl.Map({
      container: 'map' + props._id,
      attributionControl: false,
      style: baselayers[s.baseLayer as 'OpenStreetMap' | 'Satellite'],
      center: s.location as maplibregl.LngLatLike,
      zoom: s.zoom,
      pitch: s.pitch || 0,
      bearing: s.bearing || 0,
    });

    localmap.on('moveend', (evt) => {
      // if originalEvent is null, this is a programmatic move
      if (evt.originalEvent) {
        const lmap = evt.target;
        const zoom = lmap.getZoom();
        const center = lmap.getCenter();
        const pitch = lmap.getPitch();
        const bearing = lmap.getBearing();

        // Update center and zoom level
        updateState(props._id, { zoom: zoom, location: [center.lng, center.lat], pitch: pitch, bearing: bearing });
      }
    });

    // Add button for attribution
    localmap.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    // Remove compass
    localmap.addControl(new maplibregl.NavigationControl({ showCompass: false }));

    // Disable map rotations
    // localmap.dragRotate.disable();
    localmap.touchZoomRotate.disableRotation();
    localmap.keyboard.disableRotation();
    // Disable map zooming with a box (shift click and drag)
    localmap.boxZoom.disable();

    // Save map to store
    saveMap(props._id, localmap);
  }, [props._id]);

  // When the baselayer is changed
  useEffect(() => {
    if (map) {
      (map as maplibregl.Map).setStyle(baselayers[s.baseLayer as 'OpenStreetMap' | 'Satellite']);
      // When the base layer changes readd the sources
      setTimeout(addSource, 100);
    }
  }, [map, s.baseLayer]);

  // When the state is changed
  useEffect(() => {
    if (map) {
      // Update center from server, duration 0 to update immediately
      map.easeTo({
        bearing: s.bearing,
        pitch: s.pitch,
        center: [s.location[0], s.location[1]],
        zoom: s.zoom,
        speed: 0.2,
        curve: 1,
        duration: 1000,
      });
    }
  }, [map, s.bearing, s.pitch, s.location[0], s.location[1], s.zoom]);

  // When the app is resized
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

  // @ts-ignore
  const geocoder = new esriLeafletGeocoder.geocode({
    apikey: esriKey,
  });

  // from the UI to the react state
  const handleAddrChange = (event: any) => setAddrValue(event.target.value);
  const changeAddr = (evt: any) => {
    evt.preventDefault();

    geocoder.text(addrValue).run((err: any, results: any, response: any) => {
      if (err) {
        console.log('MapGL> Geocoder error:', err);
        return;
      }
      const res = results.results[0];
      if (res && res.latlng) {
        const center: [number, number] = [res.latlng.lng, res.latlng.lat];
        // Bounds
        const ne = res.bounds._northEast;
        const sw = res.bounds._southWest;
        const bbox = [sw.lng, sw.lat, ne.lng, ne.lat] as [number, number, number, number];
        map.fitBounds(new maplibregl.LngLatBounds(bbox), { duration: 0 });
        map.setCenter(center, { duration: 0 });

        // Sync zoom after fitting bounds
        const newZoom = map.getZoom();
        updateState(props._id, { location: center, zoom: newZoom, bearing: 0 });

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

  // Change Baselayer to Satellite
  const changeToSatellite = () => {
    updateState(props._id, { baseLayer: 'Satellite' });
  };

  // Change Baselayer to OpenStreetMap
  const changeToStreetMap = () => {
    updateState(props._id, { baseLayer: 'OpenStreetMap' });
  };

  return (
    <HStack>
      <ButtonGroup>
        <form onSubmit={changeAddr}>
          <InputGroup size="xs" minWidth="200px">
            <Input
              defaultValue={addrValue}
              onChange={handleAddrChange}
              onPaste={(event) => {
                event.stopPropagation();
              }}
              backgroundColor="whiteAlpha.300"
              placeholder="Enter a place or address"
              _placeholder={{ opacity: 1, color: 'gray.400' }}
            />
          </InputGroup>
        </form>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top" hasArrow={true} label={'Zoom In'} openDelay={400}>
          <Button isDisabled={s.zoom > maxZoom} onClick={incZoom}>
            <MdAdd fontSize="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Zoom Out'} openDelay={400}>
          <Button isDisabled={s.zoom <= minZoom} onClick={decZoom}>
            <MdRemove fontSize="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top" hasArrow={true} label={'Street Map'} openDelay={400}>
          <Button onClick={changeToStreetMap}>
            <MdMap fontSize="20px" />
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Satellite Map'} openDelay={400}>
          <Button onClick={changeToSatellite}>
            <MdTerrain fontSize="20px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </HStack>
  );
}

export default { AppComponent, ToolbarComponent };
