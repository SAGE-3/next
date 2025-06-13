/**
 * Copyright (c) SAGE3 Development Team 2022.
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 * Distributed under the terms of the SAGE3 License.
 */

import { useEffect, useState, useRef } from 'react';
import {
  HStack,
  Box,
  ButtonGroup,
  Tooltip,
  Button,
  InputGroup,
  Input,
  useToast,
  Select,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { MdAdd, MdRemove, MdMap, MdTerrain } from 'react-icons/md';
import maplibregl from 'maplibre-gl';
import * as esriLeafletGeocoder from 'esri-leaflet-geocoder';
import { fromUrl, TypedArray, ReadRasterResult } from 'geotiff';
// @ts-ignore
import * as Plotty from 'plotty';
import bbox from '@turf/bbox';
import center from '@turf/center';
import { create } from 'zustand';

import { Asset } from '@sage3/shared/types';
import { isGeoTiff, isTiff } from '@sage3/shared';
import { useAppStore, useAssetStore, apiUrls } from '@sage3/frontend';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState, LayerType } from './index';

import { getHexColor } from '@sage3/shared';

import './maplibre-gl.css';

const mapTilerAPI = 'elzgvVROErSfCRbrVabp';
const baselayers = {
  Satellite: `https://api.maptiler.com/maps/hybrid/style.json?key=${mapTilerAPI}`,
  OpenStreetMap: `https://api.maptiler.com/maps/streets/style.json?key=${mapTilerAPI}`,
};

const esriKey = 'AAPK74760e71edd04d12ac33fd375e85ba0d4CL8Ho3haHz1cOyUgnYG4UUEW6NG0xj2j1qsmVBAZNupoD44ZiSJ4DP36ksP-t3B';

function getStaticAssetUrl(filename: string): string {
  return apiUrls.assets.getAssetById(filename);
}

function clearAllLayersAndSources(map: maplibregl.Map) {
  const style = map.getStyle();

  // 1️⃣ Remove **every** layer
  (style.layers || []).forEach(({ id }) => {
    if (map.getLayer(id)) {
      try {
        map.removeLayer(id);
      } catch (e) {
        /* ignore */
      }
    }
  });

  // 2️⃣ Remove **every** source
  Object.keys(style.sources || {}).forEach((srcId) => {
    if (map.getSource(srcId)) {
      try {
        map.removeSource(srcId);
      } catch (e) {
        /* ignore */
      }
    }
  });
}

async function loadLayersOnMap(
  map: maplibregl.Map,
  assets: Asset[],
  layers: LayerType[],
  basemap: keyof typeof baselayers = 'OpenStreetMap'
) {
  // Ensure the map is ready before adding layers
  if (!map || !map.isStyleLoaded()) {
    console.warn('Map is not ready or style is not loaded.');
    return;
  }

  // Remove all existing layers on map if they exists
  clearAllLayersAndSources(map);
  // Readd the base layer and then load terrain and other layers
  map.setStyle(baselayers[basemap]);

  // Add 3d Terrain
  // --- add your DEM source ---
  map.addSource('terrain', {
    type: 'raster-dem',
    // MapTiler terrain-RGB tiles; swap YOUR_KEY for your MapTiler key
    url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${mapTilerAPI}`,
    tileSize: 512,
    maxzoom: 14,
  });

  // --- turn on 3D terrain ---
  map.setTerrain({ source: 'terrain', exaggeration: 1.2 });

  for (const layer of layers) {
    const asset = assets.find((a) => a._id === layer.assetId);
    if (!asset) {
      console.warn(`Asset with ID ${layer.assetId} not found.`);
      continue;
    }
    try {
      // GEO TIFF
      if (isGeoTiff(asset.data.mimetype) || isTiff(asset.data.mimetype)) {
        addGeoTiffToMap(map, layer, asset);
      } else if (asset.data.mimetype === 'application/geo+json' || asset.data.mimetype === 'application/json') {
        addGeoJsonToMap(map, layer, asset);
      }
    } catch (error) {
      console.error(`Error loading layer ${layer.assetId}:`, error);
    }
  }
}

async function addGeoTiffToMap(map: maplibregl.Map, layer: LayerType, asset: Asset) {
  const layerId = layer.assetId;
  const sourceName = `${layerId}-tiff-source`;
  const layerName = `${layerId}-tiff-layer`;
  const assetURL = getStaticAssetUrl(asset.data.file);
  if (map.getSource(sourceName)) {
    return;
  }

  try {
    const tiff = await fromUrl(assetURL);
    const image = await tiff.getImage();
    const bboxCoords = image.getBoundingBox() as [number, number, number, number];
    const geoKeys = image.getGeoKeys();
    if (geoKeys.GeographicTypeGeoKey !== 4326) {
      console.warn(`GeoTIFF ${assetURL} is not in WGS84 (EPSG:4326) coordinate system.`);
      return;
    }

    const data = await image.readRasters();
    const width = image.getWidth();
    const height = image.getHeight();
    const pixels = data[0] as TypedArray;

    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < pixels.length; i++) {
      const v = pixels[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.setAttribute('id', `canvas-${layerId}`);

    const plot = new Plotty.plot({
      canvas,
      data: pixels,
      width,
      height,
      domain: [0, max],
      colorScale: layer.colorScale,
    });
    plot.render();

    const dataURL = canvas.toDataURL();

    map.addSource(sourceName, {
      type: 'image',
      url: dataURL,
      coordinates: [
        [bboxCoords[0], bboxCoords[3]],
        [bboxCoords[2], bboxCoords[3]],
        [bboxCoords[2], bboxCoords[1]],
        [bboxCoords[0], bboxCoords[1]],
      ],
    });
    map.addLayer({
      id: layerName,
      type: 'raster',
      source: sourceName,
      paint: { 'raster-opacity': 0.7 },
    });
  } catch (error) {
    console.error(`Error loading GeoTIFF ${assetURL}:`, error);
    throw error;
  }
}

async function addGeoJsonToMap(map: maplibregl.Map, layer: LayerType, asset: Asset) {
  const layerId = layer.assetId;
  if (map.getSource(layerId)) {
    return;
  }
  const assetURL = getStaticAssetUrl(asset.data.file);

  const response = await fetch(assetURL, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  const gjson = await response.json();

  map.addSource(layerId, {
    type: 'geojson',
    data: gjson,
  });
  map.addLayer({
    id: `${layerId}-line`,
    source: layerId,
    type: 'line',
    paint: {
      'line-color': '#000000',
      'line-width': 2,
    },
    filter: ['==', '$type', 'Polygon'],
  });
  map.addLayer({
    id: `${layerId}-fill`,
    source: layerId,
    type: 'fill',
    paint: {
      'fill-outline-color': '#000000',
      'fill-color': getHexColor(layer.color),
      'fill-opacity': 0.4,
    },
    filter: ['==', '$type', 'Polygon'],
  });
  map.addLayer({
    id: `${layerId}-symbol`,
    source: layerId,
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

interface MapStore {
  map: { [appId: string]: maplibregl.Map };
  saveMap: (appId: string, map: maplibregl.Map) => void;
}
export const useStore = create<MapStore>((set) => ({
  map: {},
  saveMap: (id, map) =>
    set((state) => ({
      map: { ...state.map, [id]: map },
    })),
}));

const MAX_ZOOM = 18;
const MIN_ZOOM = 1;

type TiffProps = {
  min: number;
  max: number;
  width: number;
  height: number;
  data: ReadRasterResult;
  bbox: [number, number, number, number];
  fitted: boolean;
};

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  // Ref to hold the single MapLibre instance
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Save map into Zustand for toolbar access; ref is primary
  const saveMap = useStore((state) => state.saveMap);

  const toast = useToast();

  function refreshLayers() {
    if (!mapRef.current) {
      console.warn('Map instance is not initialized.');
      return;
    }
    const assets = useAssetStore.getState().assets;
    loadLayersOnMap(mapRef.current, assets, s.layers, s.baseLayer as any);
  }

  // Create a ref to hold the current map instance
  useEffect(() => {
    if (mapRef.current) {
      return;
    }
    const containerId = `map${props._id}`;
    const initialMap = new maplibregl.Map({
      container: containerId,
      style: baselayers[s.baseLayer as 'OpenStreetMap' | 'Satellite'],
      center: s.location as maplibregl.LngLatLike,
      zoom: s.zoom,
      pitch: s.pitch || 0,
      bearing: s.bearing || 0,
      attributionControl: false,
    });

    // Sync user pan/zoom back to SAGE3
    initialMap.on('moveend', (evt) => {
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

    // Add controls
    initialMap.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    initialMap.addControl(new maplibregl.NavigationControl({ showCompass: true }));
    initialMap.touchZoomRotate.disableRotation();
    initialMap.keyboard.disableRotation();
    initialMap.boxZoom.disable();

    initialMap.on('load', () => {
      mapRef.current = initialMap;
      refreshLayers();
    });

    saveMap(props._id, initialMap);
  }, [props._id, saveMap, updateState]);

  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;
    refreshLayers();
  }, [s.baseLayer]);
  /**----------------------------------------------------------
   * 7.8 When layers change, re-render layers
   *----------------------------------------------------------*/
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;
    // Reload Layers
    refreshLayers();
  }, [JSON.stringify(s.layers)]);

  // When the state is changed
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (mapInstance) {
      // Update center from server, duration 0 to update immediately
      mapInstance.easeTo({
        bearing: s.bearing,
        pitch: s.pitch,
        center: [s.location[0], s.location[1]],
        zoom: s.zoom,
        duration: 0,
      });

      // Update the title of the app
    }
  }, [s.bearing, s.pitch, s.location[0], s.location[1], s.zoom]);

  /**----------------------------------------------------------
   * 7.9 Handle map resize when the app window changes size
   *----------------------------------------------------------*/
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;
    mapInstance.setCenter([s.location[0], s.location[1]], { duration: 0 });
    mapInstance.resize();
  }, [props.data.size.width, props.data.size.height, s.location]);

  return (
    <AppWindow app={props} hideBackgroundIcon={MdMap}>
      <Box id={`container${props._id}`} w={props.data.size.width} h={props.data.size.height}>
        <Box id={`map${props._id}`} w="100%" h="100%" />
      </Box>
    </AppWindow>
  );
}

/**----------------------------------------------------------
 * 8. ToolbarComponent: Renders address search, asset dropdown,
 *    and “Add Layer” button (no layer list here anymore).
 *----------------------------------------------------------*/
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);

  const map = useStore((state) => state.map[props._id]);
  const assets = useAssetStore((state) => state.assets);
  const mapAssets = assets.filter(
    (a) => isGeoTiff(a.data.mimetype) || isTiff(a.data.mimetype) || a.data.mimetype === 'application/geo+json'
  );

  const [addrValue, setAddrValue] = useState<string>('');

  const toast = useToast();
  // @ts-ignore
  const geocoder = new esriLeafletGeocoder.geocode({ apikey: esriKey });

  const { isOpen, onOpen, onClose } = useDisclosure();

  /** Address search handlers **/
  const handleAddrChange = (evt: React.ChangeEvent<HTMLInputElement>) => setAddrValue(evt.target.value);
  const changeAddr = (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!map) return;
    geocoder.text(addrValue).run((err: any, results: any) => {
      if (err) {
        console.warn('Geocoder error:', err);
        return;
      }
      const res = results.results[0];
      if (res && res.latlng) {
        const center: [number, number] = [res.latlng.lng, res.latlng.lat];
        const ne = res.bounds._northEast;
        const sw = res.bounds._southWest;
        const box: [number, number, number, number] = [sw.lng, sw.lat, ne.lng, ne.lat];

        map.fitBounds(new maplibregl.LngLatBounds(box), { duration: 0 });
        map.setCenter(center, { duration: 0 });

        const newZoom = map.getZoom();
        updateState(props._id, { location: center, zoom: newZoom, bearing: 0 });
        update(props._id, { title: res.text });
      }
    });
  };

  /** Zoom / baselayer handlers **/
  const incZoom = () => {
    if (!map) return;
    const target = Math.min(s.zoom + 1, MAX_ZOOM);
    map.zoomTo(target);
    updateState(props._id, { zoom: target });
  };
  const decZoom = () => {
    if (!map) return;
    const target = Math.max(s.zoom - 1, MIN_ZOOM);
    map.zoomTo(target);
    updateState(props._id, { zoom: target });
  };
  const changeToSatellite = () => updateState(props._id, { baseLayer: 'Satellite' });
  const changeToStreetMap = () => updateState(props._id, { baseLayer: 'OpenStreetMap' });

  /**----------------------------------------------------------
   * 8.1 Add a new layer: append { assetid, visible: true } to s.layers
   *----------------------------------------------------------*/
  const addLayer = (selectedAssetId: string) => {
    if (!selectedAssetId) {
      toast({
        title: 'No Asset Selected',
        description: 'Please choose an asset from the dropdown first.',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }
    if (s.layers.find((l) => l.assetId === selectedAssetId)) {
      toast({
        title: 'Already Added',
        description: 'That asset is already in your layer list.',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
      return;
    }
    updateState(props._id, {
      layers: [...s.layers, { assetId: selectedAssetId, visible: true, color: 'red', colorScale: 'turbo', opacity: 1 }],
    });
  };

  return (
    <HStack spacing={2}>
      {/* Address Search */}
      <ButtonGroup>
        <form onSubmit={changeAddr}>
          <InputGroup size="xs" minWidth="200px">
            <Input
              value={addrValue}
              onChange={handleAddrChange}
              onPaste={(evt) => evt.stopPropagation()}
              bg="whiteAlpha.300"
              placeholder="Enter a place or address"
              _placeholder={{ opacity: 1, color: 'gray.400' }}
            />
          </InputGroup>
        </form>
      </ButtonGroup>

      {/* Zoom Buttons */}
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top" hasArrow label="Zoom In" openDelay={400}>
          <Button onClick={incZoom} isDisabled={s.zoom >= MAX_ZOOM}>
            <MdAdd fontSize="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow label="Zoom Out" openDelay={400}>
          <Button onClick={decZoom} isDisabled={s.zoom <= MIN_ZOOM}>
            <MdRemove fontSize="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>

      {/* Baselayer Toggles */}
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top" hasArrow label="Street Map" openDelay={400}>
          <Button onClick={changeToStreetMap}>
            <MdMap fontSize="20px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow label="Satellite Map" openDelay={400}>
          <Button onClick={changeToSatellite}>
            <MdTerrain fontSize="20px" />
          </Button>
        </Tooltip>
      </ButtonGroup>

      {/* Asset Dropdown + Add Layer Button */}
      <HStack spacing={2}>
        <Button size="xs" colorScheme="teal" onClick={onOpen} leftIcon={<MdAdd />} isDisabled={!mapAssets.length}>
          Add Layer
        </Button>
      </HStack>
      {/* Add Layer Modal */}
      <AddLayerModal isOpen={isOpen} onClose={onClose} onAddLayer={addLayer} assets={mapAssets} />

      {/* Custom Layer Control */}
    </HStack>
  );
}

/**----------------------------------------------------------
 * 9. GroupedToolbarComponent: returns null when multiple apps are selected
 *----------------------------------------------------------*/
const GroupedToolbarComponent = (): JSX.Element | null => {
  return null;
};

/**----------------------------------------------------------
 * 10. Export all three components for SAGE3
 *----------------------------------------------------------*/
export default {
  AppComponent,
  ToolbarComponent,
  GroupedToolbarComponent,
};

// An Add Layer Modal using the Chakra UI Modal component
function AddLayerModal({
  isOpen,
  onClose,
  onAddLayer,
  assets,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAddLayer: (assetId: string) => void;
  assets: Asset[];
}): JSX.Element {
  const [selectedAsset, setSelectedAsset] = useState<string>('');

  return (
    <Box>
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Layer</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Select placeholder="Select an asset" value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value)}>
              {assets.map((asset) => (
                <option key={asset._id} value={asset._id}>
                  {asset.data.originalfilename}
                </option>
              ))}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              onClick={() => {
                if (selectedAsset) {
                  onAddLayer(selectedAsset);
                  setSelectedAsset(''); // Reset selection
                  onClose(); // Close the modal
                }
              }}
            >
              Add Layer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
