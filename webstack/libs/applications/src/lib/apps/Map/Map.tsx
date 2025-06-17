/**
 * Copyright (c) SAGE3 Development Team 2025.
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
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Divider,
  Checkbox,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text,
} from '@chakra-ui/react';
import { MdAdd, MdMap, MdTerrain, MdArrowDropUp, MdArrowDropDown } from 'react-icons/md';
import maplibregl, { MapLayerEventType } from 'maplibre-gl';
import * as esriLeafletGeocoder from 'esri-leaflet-geocoder';
import { fromUrl, TypedArray } from 'geotiff';
// @ts-ignore
import * as Plotty from 'plotty';

import { create } from 'zustand';

import { Asset } from '@sage3/shared/types';
import { isGeoTiff, isTiff } from '@sage3/shared';
import { useAppStore, useAssetStore, apiUrls, useHexColor } from '@sage3/frontend';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState, LayerType } from './index';

import { getHexColor, SAGEColors, colors } from '@sage3/shared';

import './maplibre-gl.css';

// Maplibre and MapTiler configuration
const mapTilerAPI = 'elzgvVROErSfCRbrVabp';
const baselayers = {
  Satellite: `https://api.maptiler.com/maps/hybrid/style.json?key=${mapTilerAPI}`,
  OpenStreetMap: `https://api.maptiler.com/maps/streets/style.json?key=${mapTilerAPI}`,
};
const esriKey = 'AAPK74760e71edd04d12ac33fd375e85ba0d4CL8Ho3haHz1cOyUgnYG4UUEW6NG0xj2j1qsmVBAZNupoD44ZiSJ4DP36ksP-t3B';

// Map Event types to track registered listeners
type MapEventListener = {
  event: keyof MapLayerEventType;
  layerId: string;
  handler: (e: any) => void;
};
const registeredEventListeners: Map<maplibregl.Map, MapEventListener[]> = new Map();

// Function to add event listeners
function registerMapEvent(map: maplibregl.Map, event: keyof MapLayerEventType, layerId: string, handler: (e: any) => void) {
  map.on(event, layerId, handler);

  if (!registeredEventListeners.has(map)) {
    registeredEventListeners.set(map, []);
  }

  registeredEventListeners.get(map)!.push({ event, layerId, handler });
}

// Get a static asset URL
function getStaticAssetUrl(filename: string): string {
  return apiUrls.assets.getAssetById(filename);
}

// Functon to clear all layers and sources from the map
function clearAllLayersAndSources(map: maplibregl.Map) {
  const style = map.getStyle();

  // Remove **every** layer
  (style.layers || []).forEach(({ id }) => {
    if (map.getLayer(id)) {
      try {
        map.removeLayer(id);
      } catch (e) {
        /* ignore */
      }
    }
  });

  // Remove **every** source
  Object.keys(style.sources || {}).forEach((srcId) => {
    if (map.getSource(srcId)) {
      try {
        map.removeSource(srcId);
      } catch (e) {
        /* ignore */
      }
    }
  });

  // Remove all click events
  const listeners = registeredEventListeners.get(map);
  if (listeners) {
    for (const { event, layerId, handler } of listeners) {
      try {
        map.off(event, layerId, handler);
      } catch (e) {
        /* ignore */
      }
    }
    registeredEventListeners.delete(map);
  }
}

/**
 * Load layers onto the map.
 * @param map - The map instance to load layers onto.
 * @param assets - The assets to be used for the layers.
 * @param layers - The layers to be added to the map.
 * @param basemap - The base map type to use.
 */
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

  // 1) Clear your old layers then swap in the new style
  clearAllLayersAndSources(map);
  map.once('styledata', async () => {
    console.log('Style data loaded, adding layers...');
    // @ts-ignore: ProjectionSpecification in our version doesn’t list “name”
    map.setProjection({ name: 'mercator' });

    // 3) Now add your DEM + terrain

    // 5) Finally, re-add your GeoTIFF / GeoJSON layers
    await Promise.all(
      layers.map((layer) => {
        if (!layer.visible) {
          return Promise.resolve();
        }
        const asset = assets.find((a) => a._id === layer.assetId);
        return asset
          ? isGeoTiff(asset.data.mimetype) || isTiff(asset.data.mimetype)
            ? addGeoTiffToMap(map, layer, asset)
            : addGeoJsonToMap(map, layer, asset)
          : Promise.resolve();
      })
    );
    // sleep for a bit to ensure all layers are added
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (map.getSource('dem-source')) {
      map.removeSource('dem-source');
    }
    map.addSource('dem-source', {
      type: 'raster-dem',
      url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${mapTilerAPI}`,
      tileSize: 512,
      maxzoom: 14,
    });

    map.setTerrain({ source: 'dem-source', exaggeration: 1.2 });
  });

  // 7) Kick off the style swap
  map.setStyle(baselayers[basemap]);
}

// Add a GeoTIFF layer to the map
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
      paint: { 'raster-opacity': layer.opacity || 1.0 },
    });
  } catch (error) {
    console.error(`Error loading GeoTIFF ${assetURL}:`, error);
    throw error;
  }
}

//  Add a GeoJSON layer to the map
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
      'line-color': getHexColor(layer.color),
      'line-width': 2,
      'line-opacity': layer.opacity || 1.0,
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
      'fill-opacity': layer.opacity || 1.0,
    },
    filter: ['==', '$type', 'Polygon'],
  });
  map.addLayer({
    id: `${layerId}-symbol`,
    source: layerId,
    type: 'circle',
    paint: {
      'circle-color': getHexColor(layer.color),
      'circle-opacity': layer.opacity || 1.0,
      'circle-stroke-width': 2,
      'circle-radius': 5,
    },
    filter: ['==', '$type', 'Point'],
  });
  map.addLayer({
    id: `${layerId}-linestring`,
    type: 'line',
    source: layerId,

    paint: {
      'line-color': getHexColor(layer.color),
      'line-width': 1,
      'line-opacity': layer.opacity || 1.0,
    },
    filter: ['==', '$type', 'LineString'],
  });

  // When a click event occurs on a feature in the states layer, open a popup at the
  // location of the click, with description HTML from its properties.
  registerMapEvent(map, 'click', `${layerId}-fill`, (e) => {
    const features = e.features;
    if (!features || features.length === 0) {
      return;
    }
    // show all features in the popup as a list

    // get feature.properties keys
    const featureList = features
      .map((feature: any) => {
        const properties = feature.properties || {};
        return (
          `<strong>Properties</strong><br/>` +
          Object.entries(properties)
            .map(([key, value]) => `${key}: ${value}`)
            .join('<br/>')
        );
      })
      .join('<hr/>');
    const popupHTML = `<div style="color: black">${featureList}</div>`;

    new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHTML).addTo(map);
  });

  // Change the cursor to a pointer when the mouse is over the states layer.
  registerMapEvent(map, 'mouseenter', `${layerId}-fill`, () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  // Change it back to a pointer when it leaves.
  registerMapEvent(map, 'mouseleave', `${layerId}-fill`, () => {
    map.getCanvas().style.cursor = '';
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


// The map app component
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  // Ref to hold the single MapLibre instance
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Save map into Zustand for toolbar access; ref is primary
  const saveMap = useStore((state) => state.saveMap);

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
    }
  }, [s.bearing, s.pitch, s.location[0], s.location[1], s.zoom]);

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
        <LegendOverlay layers={s.layers} appId={props._id} />
      </Box>
    </AppWindow>
  );
}

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
    // Get a color for the new layer that isn't already used
    const usedColors = s.layers.map((l) => l.color);
    const availableColors = colors.filter((c) => !usedColors.includes(c));
    if (availableColors.length === 0) {
      availableColors.push('red'); // Fallback color
    }
    const selectedColor = availableColors[0]; // Use the first available color
    const selectedColorScale = 'turbo'; // Default color scale
    updateState(props._id, {
      layers: [
        ...s.layers,
        { assetId: selectedAssetId, visible: true, color: selectedColor, colorScale: selectedColorScale, opacity: 0.5 },
      ],
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

function LegendOverlay(props: { layers: LayerType[]; appId: string }) {
  const assets = useAssetStore((state) => state.assets);

  const toggleLayerVisibilty = (assetId: string) => {
    const updatedLayers = props.layers.map((layer) => (layer.assetId === assetId ? { ...layer, visible: !layer.visible } : layer));
    useAppStore.getState().updateState(props.appId, { layers: updatedLayers });
  };

  // Color the text selection
  const colorLayer = (assetId: string, value: string) => {
    const updatedLayers = props.layers.map((layer) => {
      if (layer.assetId === assetId) {
        return { ...layer, color: value };
      }
      return layer;
    });
    useAppStore.getState().updateState(props.appId, { layers: updatedLayers });
  };

  const setLayerColorScale = (assetId: string, value: string) => {
    const updatedLayers = props.layers.map((layer) => {
      if (layer.assetId === assetId) {
        return { ...layer, colorScale: value };
      }
      return layer;
    });
    useAppStore.getState().updateState(props.appId, { layers: updatedLayers });
  };

  // Opacity of layer
  const setLayerOpacity = (assetId: string, value: number) => {
    const updatedLayers = props.layers.map((layer) => {
      if (layer.assetId === assetId) {
        // Ensure value is between 0 and 1, and is just to two decimal places
        value = Math.max(0, Math.min(1, parseFloat(value.toFixed(2))));
        return { ...layer, opacity: value };
      }
      return layer;
    });
    useAppStore.getState().updateState(props.appId, { layers: updatedLayers });
  };

  // Remove Layer
  const removeLayer = (assetId: string) => {
    const updatedLayers = props.layers.filter((layer) => layer.assetId !== assetId);
    useAppStore.getState().updateState(props.appId, { layers: updatedLayers });
  };

  const [minimized, setMinimized] = useState(false);

  const redHex = useHexColor('red');
  const orangeHex = useHexColor('orange');
  const yellowHex = useHexColor('yellow');
  const greenHex = useHexColor('green');
  const tealHex = useHexColor('teal');
  const blueHex = useHexColor('blue');
  const cyanHex = useHexColor('cyan');
  const purpleHex = useHexColor('purple');
  const pinkHex = useHexColor('pink');
  const colors: { name: string; value: SAGEColors; hex: string }[] = [
    { name: 'Red', value: 'red', hex: redHex },
    { name: 'Orange', value: 'orange', hex: orangeHex },
    { name: 'Yellow', value: 'yellow', hex: yellowHex },
    { name: 'Green', value: 'green', hex: greenHex },
    { name: 'Teal', value: 'teal', hex: tealHex },
    { name: 'Blue', value: 'blue', hex: blueHex },
    { name: 'Cyan', value: 'cyan', hex: cyanHex },
    { name: 'Purple', value: 'purple', hex: purpleHex },
    { name: 'Pink', value: 'pink', hex: pinkHex },
  ];

  // Color Scales for geotiffs
  // CSS For the color scales to show on the legend select
  // Greyscale: black → white
  const greys = 'linear-gradient(to right, ' + '#000000, #333333, #666666, #999999, #CCCCCC, #FFFFFF' + ')';

  // Inferno: low (dark navy) → high (pale yellow)
  const inferno = 'linear-gradient(to right, ' + '#000004, #420A68, #932567, #DD513A, #FCCA3E, #FCFFA4' + ')';

  // Viridis: low (dark purple) → high (bright yellow-green)
  const viridis = 'linear-gradient(to right, ' + '#440154, #3B528B, #21918C, #5EC962, #FDE725' + ')';

  // Turbo: low (deep purple) → high (light yellow)
  const turbo =
    'linear-gradient(to right, ' +
    '#30123b, #3e3891, #455ccf, #4680f6, ' +
    '#3ba0fd, #23c3e4, #18ddc2, #2cf09e, ' +
    '#59fb73, #8fff49, #b4f836, #d7e535, ' +
    '#efcd3a, #fdae35, #fd8a26, #f26014, ' +
    '#e14109, #c52603, #a41301, #7a0403' +
    ')';

  const colorScales = [
    { name: 'Greyscale', value: 'greys', hex: greys },
    { name: 'Inferno', value: 'inferno', hex: inferno },
    { name: 'Viridis', value: 'viridis', hex: viridis },
    { name: 'Turbo', value: 'turbo', hex: turbo },
  ];

  return (
    <Box
      display="flex"
      flexDir="column"
      position="absolute"
      top="4"
      left="4"
      bg="whiteAlpha.800"
      p="2"
      borderRadius="md"
      boxShadow="md"
      zIndex={10}
      fontSize="xs"
    >
      <Box display="flex" justifyContent={'left'} alignItems="center" mb="0">
        <Text color="black" size="md">
          Layer Legend
        </Text>
        {/* Minimize Legend  Button*/}
        <IconButton
          icon={!minimized ? <MdArrowDropUp /> : <MdArrowDropDown />}
          color={'black'}
          variant="ghost"
          size="xs"
          fontSize="24px"
          onClick={() => setMinimized(!minimized)}
          aria-label="Toggle Legend Visibility"
        />
      </Box>
      {!minimized && (
        <>
          <Divider my="1" bg="black" />
          {props.layers.map((layer) => {
            const asset = assets.find((a) => a._id === layer.assetId);
            if (!asset) {
              console.warn(`Asset with ID ${layer.assetId} not found.`);
              return null;
            }
            const layerIsGeoTiff = isGeoTiff(asset.data.mimetype) || isTiff(asset.data.mimetype);
            // Name to show that is limited to 20 characters. if it  is longer, truncate it and add ellipsis
            let name = 'Unknown Layer';

            if (asset.data.originalfilename) {
              name =
                asset.data.originalfilename.length > 30
                  ? asset.data.originalfilename.substring(0, 30) + '...'
                  : asset.data.originalfilename;
            }

            return (
              <HStack spacing="2" key={layer.assetId} mb="1" justifyContent={'space-between'}>
                <Box display="flex" alignContent={'center'} justifyContent={'left'}>
                  <Checkbox
                    isChecked={layer.visible}
                    onChange={() => toggleLayerVisibilty(layer.assetId)}
                    colorScheme="teal"
                    size="md"
                    mr="2"
                    sx={{
                      // target the square control
                      '.chakra-checkbox__control': {
                        borderColor: 'gray.800', // darker border
                        borderWidth: '1px', // thicker if you like
                      },
                    }}
                  />
                  {/* Layer Name */}
                  <Text color="black">{name}</Text>
                </Box>

                {/* Chakra Menu Button to select a color */}
                <Box display="flex" alignItems="center" justifyContent="right" width="100%">
                  {/* Opacity Select */}
                  <Popover placement="bottom">
                    <PopoverTrigger>
                      <Button color="gray.800" size="xs" mx="1" height="20px" width="40px">
                        {(layer.opacity * 100).toFixed(0)}%
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent width="200px">
                      <PopoverArrow />
                      <PopoverCloseButton />
                      <PopoverHeader>Opacity</PopoverHeader>
                      <PopoverBody>
                        {/* Chakra Slider to set opacity*/}
                        <Slider
                          // Ensure value is between 0 and 100 and shows no decimals
                          defaultValue={layer.opacity * 100}
                          aria-label="Opacity Slider"
                          colorScheme={'teal'}
                          min={0}
                          max={100}
                          step={1}
                          width="100%"
                          onChangeEnd={(val) => setLayerOpacity(layer.assetId, val / 100)}
                        >
                          <SliderTrack>
                            <SliderFilledTrack />
                          </SliderTrack>
                          <SliderThumb />
                        </Slider>
                      </PopoverBody>
                    </PopoverContent>
                  </Popover>

                  {!layerIsGeoTiff ? (
                    <Menu>
                      <MenuButton
                        as={Button}
                        size="xs"
                        colorScheme={layer.color}
                        mx="1"
                        height="20px"
                        border="solid 1px black"
                      ></MenuButton>

                      <MenuList>
                        {/* MenuItems are not rendered unless Menu is open */}
                        {colors.map((color) => (
                          <MenuItem onClick={() => colorLayer(layer.assetId, color.value)} key={props.appId + color.value}>
                            <Box w="16px" h="16px" bg={color.hex} mr="2" borderRadius="100%" border="solid 1px black" />
                            {color.name}
                          </MenuItem>
                        ))}
                      </MenuList>
                    </Menu>
                  ) : (
                    <Menu>
                      <MenuButton
                        as={Button}
                        size="xs"
                        backgroundImage={layer.colorScale ? colorScales.find((c) => c.value === layer.colorScale)?.hex : greys}
                        mx="1"
                        height="20px"
                        border="solid 1px black"
                        _hover={{
                          backgroundImage: layer.colorScale ? colorScales.find((c) => c.value === layer.colorScale)?.hex : greys,
                        }}
                      ></MenuButton>
                      <MenuList>
                        {colorScales.map((scale) => (
                          <MenuItem key={props.appId + scale.value} onClick={() => setLayerColorScale(layer.assetId, scale.value)}>
                            <Box w="16px" h="16px" backgroundImage={scale.hex} mr="2" borderRadius="100%" border="solid 1px black" />

                            {scale.name}
                          </MenuItem>
                        ))}
                      </MenuList>
                    </Menu>
                  )}
                  <Button
                    size="xs"
                    colorScheme="red"
                    variant="ghost"
                    color={redHex}
                    height="20px"
                    fontSize="12px"
                    onClick={() => removeLayer(layer.assetId)}
                    aria-label={`Remove Layer ${name}`}
                  >
                    X
                  </Button>
                </Box>
              </HStack>
            );
          })}
        </>
      )}
    </Box>
  );
}
