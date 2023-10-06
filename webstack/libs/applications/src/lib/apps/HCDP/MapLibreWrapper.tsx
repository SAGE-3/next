/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { HStack, Box, ButtonGroup, Tooltip, Button, InputGroup, Input, useToast } from '@chakra-ui/react';
import { MdAdd, MdRemove, MdMap, MdTerrain } from 'react-icons/md';

// Data store
import create from 'zustand';
// Map library
import maplibregl from 'maplibre-gl';
// Geocoding
import * as esriLeafletGeocoder from 'esri-leaflet-geocoder';
// Turfjs geojson utilities functions
import bbox from '@turf/bbox';
import center from '@turf/center';
import { fromUrl } from 'geotiff';
//@ts-ignore
import parseGeoraster from 'georaster';
//@ts-ignore
import * as Plotty from 'plotty';

import { useAppStore, useAssetStore, useUIStore } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';
import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

// Styling
import './maplibre-gl.css';
import { TypedArray } from 'd3';

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

// Define the bounds
const bounds = [
  -159.816, // Minimum longitude
  18.849, // Minimum latitude
  -154.668, // Maximum longitude
  22.269, // Maximum latitude
];

// Calculate the coordinates for the four corners of the bounding box
const coordinates = [
  [bounds[0], bounds[1]],
  [bounds[0], bounds[3]],
  [bounds[2], bounds[3]],
  [bounds[2], bounds[1]],
  [bounds[0], bounds[1]], // Close the polygon
];
/* App component for MapGL */

function MapLibreWrapper(props: App): JSX.Element {
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
  const scale = useUIStore((state) => state.scale);
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

  useEffect(() => {
    const fetchData = async () => {
      const url = '/assets/HCDPTestData.tif';

      const tiff = await fromUrl(url);
      const image = await tiff.getImage();
      const data: any = await image.readRasters();
      const resolution = image.getResolution();
      const bbox = image.getBoundingBox();
      const { width, height } = data;
      const tiepoint = image.getTiePoints()[0];
      const [, yScale] = image.getFileDirectory().ModelPixelScale;

      const HCDPData = {
        nCols: width,
        nRows: height,
        xllCorner: tiepoint.x,
        yllCorner: tiepoint.y - height * yScale,
        cellXSize: resolution[0],
        cellYSize: resolution[1],
      };
      function convertTo2D(dataArray: any[], nRows: number, nCols: number) {
        const twoDArray: number[][] = [];
        for (let i = 0; i < nRows; i++) {
          const row = [];
          for (let j = 0; j < nCols; j++) {
            const index = i * nCols + j;
            row.push(dataArray[index]);
          }
          twoDArray.push(row);
        }
        return twoDArray;
      }
      const dataArray = convertTo2D(data[0], HCDPData.nRows, HCDPData.nCols);

      map.on('click', async (event: any) => {
        const [longitude, latitude]: number[] = [event.lngLat.lng, event.lngLat.lat];
        console.log(longitude * scale, latitude * scale);
        // Corrected formulas for pixel coordinates
        const pixelX = Math.floor((longitude - HCDPData.xllCorner) / HCDPData.cellXSize);
        const pixelY = Math.floor((HCDPData.yllCorner - latitude) / HCDPData.cellYSize);
        console.log(pixelX, pixelY);
        // console.log(dataArray[pixelX][pixelY]);
        // Ensure that the index is valid
        if (dataArray[pixelX] && dataArray[pixelX][pixelY]) {
          const value = dataArray[pixelX][pixelY];
          console.log(`Value at (${longitude}, ${latitude}): ${value}`);
        } else {
          console.log('Clicked outside the GeoTIFF bounds or invalid index calculated');
        }
      });
    };
    if (map) {
      fetchData();
    }
  }, [map]);

  useEffect(() => {
    if (map) {
      map.on('style.load', async () => {
        const url = '/assets/HCDPTestData.tif';

        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const georaster = await parseGeoraster(buffer);

        const tiff = await fromUrl(url);
        const image = await tiff.getImage();
        const data: any = await image.readRasters();
        const fileDirectory = image.getFileDirectory();

        for (let i = 0; i < data[0].length; i++) {
          if (data[0][i] == Number.parseFloat(fileDirectory.GDAL_NODATA) || isNaN(data[0][i]) || data[0][i] < 0) {
            data[0][i] = 0;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.setAttribute('id', 'canvas');
        console.log(georaster);
        // Example custom color scale
        const customColors = ['rgb(85, 95, 100, 0)', 'rgb(255, 209, 102, 255)', 'rgb(6, 214, 160, 255)', 'rgb(17, 138, 178, 255)'];
        const customStops = [0, 0.3, 0.5, 1];

        Plotty.addColorScale('custom', customColors, customStops);

        const plot = new Plotty.plot({
          canvas: canvas,
          data: data[0],
          width: georaster.width,
          height: georaster.height,
          domain: [0, 596.87255859375],
          colorScale: 'custom',
        });

        plot.render();

        const dataURL = canvas.toDataURL();

        map.addSource('geotiff', {
          type: 'image',
          url: dataURL,
          coordinates: [
            [-159.816, 22.269], // top left
            [-154.668, 22.269], // top right
            [-154.668, 18.849], // bottom right
            [-159.816, 18.849], // bottom left
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
      });
    }
  }, [map]);

  return (
    <>
      {' '}
      {/* One box for map, one box for container */}
      <Box id={'container' + props._id} w={props.data.size.width} h={props.data.size.height}>
        <Box id={'map' + props._id} w="100%" h="100%" />
      </Box>
    </>
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

export default MapLibreWrapper;
