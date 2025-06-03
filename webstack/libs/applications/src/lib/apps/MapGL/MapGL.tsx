/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useRef } from 'react';
import { HStack, Box, ButtonGroup, Tooltip, Button, InputGroup, Input, useToast, Select, useColorModeValue } from '@chakra-ui/react';
import { MdAdd, MdRemove, MdMap, MdTerrain } from 'react-icons/md';

// Data store
import { create } from 'zustand';
// Map library
import maplibregl from 'maplibre-gl';
// Geocoding
import * as esriLeafletGeocoder from 'esri-leaflet-geocoder';
// GeoTiff
import { fromUrl, TypedArray, ReadRasterResult } from 'geotiff';
// @ts-ignore
import * as Plotty from 'plotty';
// Turfjs geojson utilities functions
import bbox from '@turf/bbox';
import center from '@turf/center';

import { Asset } from '@sage3/shared/types';
import { isGeoTiff, isTiff } from '@sage3/shared';
import { useAppStore, useAssetStore, apiUrls, useUIStore } from '@sage3/frontend';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

// Styling
import './maplibre-gl.css';

// Get a URL for an asset
export function getStaticAssetUrl(filename: string): string {
  return apiUrls.assets.getAssetById(filename);
}

interface MapStore {
  map: { [key: string]: maplibregl.Map };
  saveMap: (id: string, map: maplibregl.Map) => void;
}

// Zustand store to communicate with toolbar
export const useStore = create<MapStore>()((set) => ({
  map: {},
  saveMap: (id: string, map: maplibregl.Map) => set((state) => ({ map: { ...state.map, ...{ [id]: map } } })),
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

type tiffProps = {
  min: number;
  max: number;
  width: number;
  height: number;
  data: ReadRasterResult | null;
  bbox: [number, number, number, number];
};

/* App component for MapGL */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // const [map, setMap] = useState<maplibregl.Map>();
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const saveMap = useStore((state) => state.saveMap);
  const map = useStore((state) => state.map[props._id]);

  // Assets store
  const assets = useAssetStore((state) => state.assets);
  const [file, setFile] = useState<Asset>();

  // Source
  const [source, setSource] = useState<{ id: string; data: any } | null>(null);

  const [tiff, setTiff] = useState<tiffProps>({
    min: 0,
    max: 0,
    width: 0,
    height: 0,
    data: null,
    bbox: [0, 0, 0, 0],
  });

  // Toast to inform user about errors
  const toast = useToast();

  const isFocused = useUIStore((state) => state.focusedAppId === props._id);
  // Div containing the map
  const divRef = useRef<HTMLDivElement>(null);
  const backgroundColor = useColorModeValue('white', 'gray.700');

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
        if (isGeoTiff(file.data.mimetype) || isTiff(file.data.mimetype)) {
          try {
            // Fetching the tiff file
            const tiff = await fromUrl(newURL);
            // Extracting metadata from tiff file
            const image = await tiff.getImage();
            const bbox: [number, number, number, number] = image.getBoundingBox() as [number, number, number, number];
            const geoKeys = image.getGeoKeys();
            if (geoKeys.GeographicTypeGeoKey != 4326) {
              // not GCS_WGS_84
              console.log('MapGL> not a GCS_WGS_84 file', geoKeys.GeographicTypeGeoKey);
              toast({
                title: 'Error',
                description: 'Only GCS_WGS_84 files can be loaded',
                status: 'error',
                duration: 3000,
                isClosable: true,
              });
              return;
            }

            const data = await image.readRasters();
            const { width, height } = data;

            // Compute min and max values
            let min = Infinity;
            let max = -Infinity;
            const values = data[0] as TypedArray;
            for (let i = 0; i < values.length; i++) {
              const value = values[i];
              if (value < min) min = value;
              if (value > max) max = value;
            }

            // Create canvas for geotiff
            const canvas = document.createElement('canvas');
            canvas.setAttribute('id', 'canvas');

            // Plot Geotiff in Plotty canvas
            // Plotty.addColorScale('custom', customColors, customStops);

            const plot = new Plotty.plot({
              canvas: canvas,
              data: data[0],
              width: width,
              height: height,
              domain: [0, max],
              colorScale: s.colorScale,
              // colorScale: 'custom',
            });
            plot.render();

            // Turn the canvas into an image
            const dataURL = canvas.toDataURL();

            // Add the image to the map
            map.addSource('geotiff', {
              type: 'image',
              url: dataURL,
              coordinates: [
                [bbox[0], bbox[3]], // top left
                [bbox[2], bbox[3]], // top right
                [bbox[2], bbox[1]], // bottom right
                [bbox[0], bbox[1]], // bottom left
              ],
            });
            map.addLayer({
              id: 'geotiff-layer',
              type: 'raster',
              source: 'geotiff',
              paint: {
                'raster-opacity': 0.7,
              },
            });
            center;
            const x = (bbox[0] + bbox[2]) / 2;
            const y = (bbox[1] + bbox[3]) / 2;
            const cc = [x, y];
            // Fit map: duration is zero to get a valid zoom value next
            map.fitBounds(bbox, { padding: 20, duration: 0 });
            updateState(props._id, { zoom: map.getZoom(), location: cc });

            setTiff({ min: min, max: max, width: width, height: height, data: data, bbox: bbox });
          } catch (error) {
            console.error(`Error Reading ${file.data.originalfilename}`, error);
          }
        } else {
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
            const box: [number, number, number, number] = bbox(gjson) as [number, number, number, number];
            const cc = center(gjson).geometry.coordinates;
            // Fit map: duration is zero to get a valid zoom value next
            map.fitBounds(box, { padding: 20, duration: 0 });
            updateState(props._id, { zoom: map.getZoom(), location: cc });
            // Add the source to the map
            setSource({ id: file._id, data: gjson });
          } catch (error) {
            toast({
              title: 'Error',
              description: 'Error loading GEOJSON file',
              status: 'error',
              duration: 3000,
              isClosable: true,
            });
          }
        }
      });
    }
  }, [file, map, setSource]);

  useEffect(() => {
    if (map) {
      if (map.getLayer('geotiff-layer')) {
        // Remove the geotiff layer if it exists
        map.removeLayer('geotiff-layer');
      }
      // Remove the geotiff source if it exists
      if (map.getSource('geotiff')) {
        map.removeSource('geotiff');
      }

      const canvas = document.createElement('canvas');
      canvas.setAttribute('id', 'canvas');

      if (s.colorScale === 'custom') {
        // Example custom color scale
        const customColors = ['rgb(85, 95, 100, 0)', 'rgb(255, 209, 102, 255)', 'rgb(6, 214, 160, 255)', 'rgb(17, 138, 178, 255)'];
        const customStops = [0, 0.3, 0.5, 1];
        Plotty.addColorScale('custom', customColors, customStops);
      }

      if (tiff.data !== null) {
        const plot = new Plotty.plot({
          canvas: canvas,
          data: tiff.data[0],
          width: tiff.width,
          height: tiff.height,
          domain: [0, tiff.max],
          colorScale: s.colorScale,
          // colorScale: 'custom',
        });
        plot.render();
        setTiff;
        // Turn the canvas into an image
        const dataURL = canvas.toDataURL();

        // Add the image to the map
        map.addSource('geotiff', {
          type: 'image',
          url: dataURL,
          coordinates: [
            [tiff.bbox[0], tiff.bbox[3]], // top left
            [tiff.bbox[2], tiff.bbox[3]], // top right
            [tiff.bbox[2], tiff.bbox[1]], // bottom right
            [tiff.bbox[0], tiff.bbox[1]], // bottom left
          ],
        });
        map.addLayer({
          id: 'geotiff-layer',
          type: 'raster',
          source: 'geotiff',
          paint: {
            'raster-opacity': 0.7,
          },
        });
        center;
        // const x = (tiff.bbox[0] + tiff.bbox[2]) / 2;
        // const y = (tiff.bbox[1] + tiff.bbox[3]) / 2;
        // // Fit map: duration is zero to get a valid zoom value next
        // map.fitBounds(bbox, { padding: 20, duration: 0 });
        // updateState(props._id, { zoom: map.getZoom(), location: cc });
      }
    }
  }, [s.colorScale]);

  // If the source is changed, add it to the map
  useEffect(() => {
    if (source) {
      addSource();
    }
  }, [source]);


  useEffect(() => {
    console.log('MapGL> AppComponent useEffect', props._id, isFocused, divRef.current);
    if (!divRef.current) return;
    console.log('MapGL> Creating map in div', divRef.current.id);
    const localmap = new maplibregl.Map({
      // container: 'map' + props._id,
      container: divRef.current as HTMLDivElement,
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
  }, [props._id, isFocused]);

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
        // speed: 0.2,
        // curve: 1,
        duration: 1000,
      });
    }
  }, [map, s.bearing, s.pitch, s.location[0], s.location[1], s.zoom]);

  // When the app is resized
  useEffect(() => {
    // when app is resized, reset the center
    if (map) {
      map.setCenter([s.location[0], s.location[1]], { duration: 0 });
      map.resize();
    }
  }, [props.data.size.width, props.data.size.height, map]);

  return (
    <AppWindow app={props} hideBackgroundIcon={MdMap}>
      {/* One box for map, one box for container */}
      {/* <Box id={'container' + props._id} w={props.data.size.width} h={props.data.size.height}> */}
      <Box ref={divRef} width="100%" height="100%" objectFit="contain"
        position="relative" background={backgroundColor}>
        {/* <Box id={'map' + props._id} w="100%" h="100%" /> */}
      </Box>
    </AppWindow >
  );
}

/* App toolbar component for the app MapGL */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const map = useStore((state) => state.map[props._id]);
  const [addrValue, setAddrValue] = useState('');
  const update = useAppStore((state) => state.update);

  // @ts-ignore
  const geocoder = new esriLeafletGeocoder.geocode({
    apikey: esriKey,
  });

  // from the UI to the react state
  const handleAddrChange = (event: React.ChangeEvent<HTMLInputElement>) => setAddrValue(event.target.value);
  const changeAddr = (evt: React.FormEvent) => {
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

  // Change the color scale for geotiffs
  const handleChangeColorScale = (event: React.ChangeEvent<HTMLSelectElement>) => {
    updateState(props._id, { colorScale: event.target.value });
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
      <Tooltip
        placement="top"
        hasArrow={true}
        label={s.assetid?.length ? 'This feature is only available for Geotiffs' : 'Color Scale'}
        openDelay={400}
      >
        <Select
          isDisabled={s.assetid?.length ? false : true}
          size="xs"
          w="10rem"
          placeholder={'Select Color Scale'}
          value={s.colorScale}
          onChange={handleChangeColorScale}
        >
          <option value="greys">Greys</option>
          <option value="inferno">Inferno</option>
          <option value="viridis">Viridis</option>
          <option value="turbo">Turbo</option>
          <option value="custom">HCDP (Custom)</option>
        </Select>
      </Tooltip>
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

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
