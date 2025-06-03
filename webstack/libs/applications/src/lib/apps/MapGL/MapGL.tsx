/**
 * Copyright (c) SAGE3 Development Team 2022.
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 * Distributed under the terms of the SAGE3 License.
 */

import { useEffect, useState, useRef } from 'react';
import { VStack, HStack, Box, ButtonGroup, Tooltip, Button, InputGroup, Input, useToast, Select } from '@chakra-ui/react';
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
import { state as AppState } from './index';

import './maplibre-gl.css';

/**----------------------------------------------------------
 * 1. Utility: Build a URL to fetch a static asset by filename
 *----------------------------------------------------------*/
export function getStaticAssetUrl(filename: string): string {
  return apiUrls.assets.getAssetById(filename);
}

/**----------------------------------------------------------
 * 2. Configure map baselayers (MapTiler keys + styles)
 *----------------------------------------------------------*/
const mapTilerAPI = 'elzgvVROErSfCRbrVabp';
const baselayers = {
  Satellite: `https://api.maptiler.com/maps/hybrid/style.json?key=${mapTilerAPI}`,
  OpenStreetMap: `https://api.maptiler.com/maps/streets/style.json?key=${mapTilerAPI}`,
};

/**----------------------------------------------------------
 * 3. ESRI Geocoder API Key (for address lookup in toolbar)
 *----------------------------------------------------------*/
const esriKey = 'AAPK74760e71edd04d12ac33fd375e85ba0d4CL8Ho3haHz1cOyUgnYG4UUEW6NG0xj2j1qsmVBAZNupoD44ZiSJ4DP36ksP-t3B';

/**----------------------------------------------------------
 * 4. Zustand store to hold references to MapLibre maps
 *----------------------------------------------------------*/
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

/**----------------------------------------------------------
 * 5. Zoom limits
 *----------------------------------------------------------*/
const MAX_ZOOM = 18;
const MIN_ZOOM = 1;

/**----------------------------------------------------------
 * 6. Type for storing GeoTIFF read results per‐asset
 *----------------------------------------------------------*/
type TiffProps = {
  min: number;
  max: number;
  width: number;
  height: number;
  data: ReadRasterResult;
  bbox: [number, number, number, number];
  fitted: boolean;
};

/**----------------------------------------------------------
 * 7. AppComponent: Renders the MapCanvas, initializes the map,
 *    and builds a collapsible “layer list” control inside the map.
 *----------------------------------------------------------*/
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  // Ref to hold the single MapLibre instance
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Save map into Zustand for toolbar access; ref is primary
  const saveMap = useStore((state) => state.saveMap);

  // All available assets
  const assets = useAssetStore((state) => state.assets);

  const toast = useToast();

  // Store per‐asset TIFF data (with `fitted` flag so we fit only once)
  const [tiffMap, setTiffMap] = useState<Record<string, TiffProps>>({});

  // Keep previous layers array for diffing
  const prevLayersRef = useRef<typeof s.layers>([]);

  // Collapsed state for the custom control
  const [layersCollapsed, setLayersCollapsed] = useState<boolean>(true);

  // Once we have a map, we'll create a placeholder for our custom control
  const layerControlContainerRef = useRef<HTMLDivElement | null>(null);
  const layerControlInstanceRef = useRef<maplibregl.IControl | null>(null);

  /**----------------------------------------------------------
   * 7.1 Initialize the map exactly once (on mount).
   *----------------------------------------------------------*/
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
      if (evt.originalEvent) {
        const z = initialMap.getZoom();
        const ctr = initialMap.getCenter();
        const p = initialMap.getPitch();
        const b = initialMap.getBearing();
        updateState(props._id, {
          zoom: z,
          location: [ctr.lng, ctr.lat],
          pitch: p,
          bearing: b,
        });
      }
    });

    // Add controls
    initialMap.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    initialMap.addControl(new maplibregl.NavigationControl({ showCompass: false }));
    initialMap.touchZoomRotate.disableRotation();
    initialMap.keyboard.disableRotation();
    initialMap.boxZoom.disable();

    // Create a <div> to hold our collapsible layer list
    const layerControlDiv = document.createElement('div');
    layerControlDiv.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    layerControlDiv.style.background = 'rgba(255,255,255,0.9)';
    layerControlDiv.style.padding = '4px';
    layerControlDiv.style.maxWidth = '180px';
    layerControlDiv.style.fontSize = '12px';

    layerControlContainerRef.current = layerControlDiv;

    const customLayerControl: maplibregl.IControl = {
      onAdd: () => layerControlDiv,
      onRemove: () => {
        if (layerControlDiv.parentNode) {
          layerControlDiv.parentNode.removeChild(layerControlDiv);
        }
      },
    };

    initialMap.addControl(customLayerControl, 'top-right');
    layerControlInstanceRef.current = customLayerControl;

    mapRef.current = initialMap;
    saveMap(props._id, initialMap);
  }, [props._id, saveMap, updateState]);

  /**----------------------------------------------------------
   * 7.2 Whenever s.layers or baselayer changes, rebuild control and re-add sources
   *----------------------------------------------------------*/
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    // 1) Handle style swap
    mapInstance.setStyle(baselayers[s.baseLayer as 'OpenStreetMap' | 'Satellite']);
    const onStyleData = () => {
      s.layers.forEach((layer) => {
        if (!layer.visible) return;
        const aid = layer.assetid;
        const geoJsonSrc = aid;
        const tiffSrc = `${aid}-tiff-source`;
        if (!mapInstance.getSource(geoJsonSrc) && !mapInstance.getSource(tiffSrc)) {
          const myAsset = assets.find((a) => a._id === aid);
          if (myAsset) {
            loadAssetLayer(aid, myAsset);
          }
        }
      });
    };
    mapInstance.once('styledata', onStyleData);

    // 2) Rebuild the collapsible layer list
    const container = layerControlContainerRef.current!;
    container.innerHTML = '';

    // Header row: title + collapse/expand button
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.cursor = 'pointer';
    header.style.marginBottom = layersCollapsed ? '0' : '6px';

    const title = document.createElement('span');
    title.innerText = 'Layers';
    title.style.fontWeight = 'bold';
    title.style.color = 'black';
    header.appendChild(title);

    const toggleBtn = document.createElement('span');
    toggleBtn.innerText = layersCollapsed ? '▶' : '▼';
    toggleBtn.style.fontSize = '12px';
    toggleBtn.style.color = 'black';
    header.appendChild(toggleBtn);

    header.onclick = () => {
      setLayersCollapsed((prev) => !prev);
    };
    container.appendChild(header);

    // If expanded, show list
    if (!layersCollapsed) {
      if (s.layers.length === 0) {
        const nothingText = document.createElement('div');
        nothingText.innerText = 'No layers';
        nothingText.style.color = '#555';
        nothingText.style.marginLeft = '4px';
        container.appendChild(nothingText);
      } else {
        s.layers.forEach((layer) => {
          const assetid = layer.assetid;
          const assetObj = assets.find((a) => a._id === assetid);
          const fullName = assetObj ? assetObj.data.originalfilename : assetid;
          const shortName = fullName.length > 18 ? fullName.slice(0, 15) + '…' : fullName;

          // Single row: [checkbox] [short name] [remove-icon]
          const row = document.createElement('div');
          row.style.color = 'black';
          row.style.display = 'flex';
          row.style.alignItems = 'center';
          row.style.marginLeft = '4px';
          row.style.marginBottom = '4px';

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = layer.visible;
          cb.style.marginRight = '6px';
          cb.onchange = () => {
            const updated = s.layers.map((l) => (l.assetid === assetid ? { ...l, visible: !l.visible } : l));
            updateState(props._id, { layers: updated });
          };
          row.appendChild(cb);

          const lbl = document.createElement('span');
          lbl.innerText = shortName;
          lbl.style.flex = '1';
          lbl.style.overflow = 'hidden';
          lbl.style.textOverflow = 'ellipsis';
          lbl.style.whiteSpace = 'nowrap';
          row.appendChild(lbl);

          const removeBtn = document.createElement('button');
          removeBtn.style.background = 'none';
          removeBtn.style.border = 'none';
          removeBtn.style.cursor = 'pointer';
          removeBtn.style.padding = '0';
          removeBtn.style.marginLeft = '6px';
          removeBtn.title = 'Remove layer';
          removeBtn.innerHTML =
            '<svg height="12" width="12" viewBox="0 0 24 24"><path fill="#bb0000" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12Z" /></svg>';
          removeBtn.onclick = () => {
            const updated = s.layers.filter((l) => l.assetid !== assetid);
            updateState(props._id, { layers: updated });
          };
          row.appendChild(removeBtn);

          container.appendChild(row);
        });
      }
    }

    return () => {
      mapInstance.off('styledata', onStyleData);
    };
  }, [s.baseLayer, JSON.stringify(s.layers), assets, layersCollapsed, updateState, props._id]);

  /**----------------------------------------------------------
   * 7.3 Sync viewport when state changes remotely (no re-init)
   *----------------------------------------------------------*/
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    mapInstance.easeTo({
      center: [s.location[0], s.location[1]],
      zoom: s.zoom,
      pitch: s.pitch,
      bearing: s.bearing,
      duration: 1000,
    });
  }, [s.location, s.zoom, s.pitch, s.bearing]);

  /**----------------------------------------------------------
   * 7.4 On unmount, destroy the single map instance (free WebGL)
   *----------------------------------------------------------*/
  useEffect(() => {
    return () => {
      const mapInstance = mapRef.current;
      if (mapInstance) {
        mapInstance.remove();
        mapRef.current = null;
      }
    };
  }, []);

  /**----------------------------------------------------------
   * 7.5 When s.layers changes, diff against prevLayers and add/remove accordingly
   *----------------------------------------------------------*/
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    const prevLayers = prevLayersRef.current;
    const currLayers = s.layers;

    const prevLookup = Object.fromEntries(prevLayers.map((l) => [l.assetid, l.visible]));
    const currLookup = Object.fromEntries(currLayers.map((l) => [l.assetid, l.visible]));

    // Removed or toggled-off
    for (const [assetid, wasVisible] of Object.entries(prevLookup)) {
      const isPresentNow = assetid in currLookup;
      const isNowVisible = currLookup[assetid];
      if (!isPresentNow || (wasVisible && !isNowVisible)) {
        removeAssetFromMap(assetid);
        setTiffMap((m) => {
          const copy = { ...m };
          delete copy[assetid];
          return copy;
        });
      }
    }

    // Newly added or toggled-on
    for (const layer of currLayers) {
      const { assetid, visible } = layer;
      const wasVisible = prevLookup[assetid];
      if (visible && !wasVisible) {
        const myAsset = assets.find((a) => a._id === assetid);
        if (myAsset) {
          loadAssetLayer(assetid, myAsset);
        }
      }
    }

    prevLayersRef.current = currLayers.slice();
  }, [JSON.stringify(s.layers), assets]);

  /**----------------------------------------------------------
   * 7.6 Helper: Remove all sources & layers for a given asset ID
   *----------------------------------------------------------*/
  function removeAssetFromMap(assetid: string) {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    // GeoTIFF naming
    const tiffSourceName = `${assetid}-tiff-source`;
    const tiffLayerName = `${assetid}-tiff-layer`;
    if (mapInstance.getLayer(tiffLayerName)) {
      mapInstance.removeLayer(tiffLayerName);
    }
    if (mapInstance.getSource(tiffSourceName)) {
      mapInstance.removeSource(tiffSourceName);
    }

    // GeoJSON naming
    const lineLayer = `${assetid}-line`;
    const fillLayer = `${assetid}-fill`;
    const symLayer = `${assetid}-symbol`;
    if (mapInstance.getLayer(lineLayer)) {
      mapInstance.removeLayer(lineLayer);
    }
    if (mapInstance.getLayer(fillLayer)) {
      mapInstance.removeLayer(fillLayer);
    }
    if (mapInstance.getLayer(symLayer)) {
      mapInstance.removeLayer(symLayer);
    }
    if (mapInstance.getSource(assetid)) {
      mapInstance.removeSource(assetid);
    }
  }

  /**----------------------------------------------------------
   * 7.7 Helper: Load a single asset (GeoTIFF or GeoJSON) onto the map,
   *     with guard so we never re-add an existing source, and only fit once
   *----------------------------------------------------------*/
  async function loadAssetLayer(assetid: string, asset: Asset) {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    const newURL = getStaticAssetUrl(asset.data.file);

    // GEO TIFF
    if (isGeoTiff(asset.data.mimetype) || isTiff(asset.data.mimetype)) {
      const sourceName = `${assetid}-tiff-source`;
      const layerName = `${assetid}-tiff-layer`;

      if (mapInstance.getSource(sourceName)) {
        return;
      }

      try {
        const t = await fromUrl(newURL);
        const image = await t.getImage();
        const bboxCoords = image.getBoundingBox() as [number, number, number, number];
        const geoKeys = image.getGeoKeys();
        if (geoKeys.GeographicTypeGeoKey !== 4326) {
          toast({
            title: 'Error',
            description: 'Only GeoTIFFs with CRS = EPSG:4326 supported.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
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
        canvas.setAttribute('id', `canvas-${assetid}`);

        if (s.colorScale === 'custom') {
          const customColors = ['rgba(85, 95, 100, 0)', 'rgba(255, 209, 102, 1)', 'rgba(6, 214, 160, 1)', 'rgba(17, 138, 178, 1)'];
          const customStops = [0, 0.3, 0.5, 1];
          Plotty.addColorScale('custom', customColors, customStops);
        }

        const plot = new Plotty.plot({
          canvas,
          data: pixels,
          width,
          height,
          domain: [0, max],
          colorScale: s.colorScale,
        });
        plot.render();

        const dataURL = canvas.toDataURL();

        mapInstance.addSource(sourceName, {
          type: 'image',
          url: dataURL,
          coordinates: [
            [bboxCoords[0], bboxCoords[3]],
            [bboxCoords[2], bboxCoords[3]],
            [bboxCoords[2], bboxCoords[1]],
            [bboxCoords[0], bboxCoords[1]],
          ],
        });
        mapInstance.addLayer({
          id: layerName,
          type: 'raster',
          source: sourceName,
          paint: { 'raster-opacity': 0.7 },
        });

        setTiffMap((m) => {
          const existing = m[assetid]?.fitted;
          if (!existing) {
            const ctrX = (bboxCoords[0] + bboxCoords[2]) / 2;
            const ctrY = (bboxCoords[1] + bboxCoords[3]) / 2;
            mapInstance.fitBounds(bboxCoords, { padding: 20, duration: 0 });
            // Skipped updateState to avoid locking view
          }
          return {
            ...m,
            [assetid]: {
              min,
              max,
              width,
              height,
              data,
              bbox: bboxCoords,
              fitted: true,
            },
          };
        });
      } catch (err) {
        console.error(`Error loading GeoTIFF ${asset.data.originalfilename}:`, err);
      }
      return;
    }

    // GEO JSON
    try {
      const sourceName = assetid;
      if (mapInstance.getSource(sourceName)) {
        return;
      }

      const response = await fetch(newURL, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      });
      const gjson = await response.json();

      const box = bbox(gjson) as [number, number, number, number];
      const ctr = center(gjson).geometry.coordinates as [number, number];

      if (!mapInstance.getSource(sourceName)) {
        mapInstance.fitBounds(box, { padding: 20, duration: 0 });
        // Skipped updateState to avoid locking view
      }

      mapInstance.addSource(sourceName, {
        type: 'geojson',
        data: gjson,
      });
      mapInstance.addLayer({
        id: `${assetid}-line`,
        source: sourceName,
        type: 'line',
        paint: {
          'line-color': '#000000',
          'line-width': 2,
        },
        filter: ['==', '$type', 'Polygon'],
      });
      mapInstance.addLayer({
        id: `${assetid}-fill`,
        source: sourceName,
        type: 'fill',
        paint: {
          'fill-outline-color': '#000000',
          'fill-color': '#39b5e6',
          'fill-opacity': 0.4,
        },
        filter: ['==', '$type', 'Polygon'],
      });
      mapInstance.addLayer({
        id: `${assetid}-symbol`,
        source: sourceName,
        type: 'circle',
        paint: {
          'circle-color': '#ff7800',
          'circle-opacity': 0.4,
          'circle-stroke-width': 2,
          'circle-radius': 5,
        },
        filter: ['==', '$type', 'Point'],
      });
    } catch (err) {
      console.error(`Error loading GeoJSON ${asset.data.originalfilename}:`, err);
    }
  }

  /**----------------------------------------------------------
   * 7.8 When colorScale or layers change, re-render only visible TIFF layers
   *----------------------------------------------------------*/
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    Object.entries(tiffMap).forEach(([assetid, props]) => {
      const layerState = s.layers.find((l) => l.assetid === assetid);
      if (!layerState?.visible) return;

      const sourceName = `${assetid}-tiff-source`;
      const layerName = `${assetid}-tiff-layer`;

      if (mapInstance.getLayer(layerName)) {
        mapInstance.removeLayer(layerName);
      }
      if (mapInstance.getSource(sourceName)) {
        mapInstance.removeSource(sourceName);
      }

      const { width, height, data: rasterData, max, bbox: coords } = props;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      if (s.colorScale === 'custom') {
        const customColors = ['rgba(85, 95, 100, 0)', 'rgba(255, 209, 102, 1)', 'rgba(6, 214, 160, 1)', 'rgba(17, 138, 178, 1)'];
        const customStops = [0, 0.3, 0.5, 1];
        Plotty.addColorScale('custom', customColors, customStops);
      }

      const plot = new Plotty.plot({
        canvas,
        data: rasterData[0] as TypedArray,
        width,
        height,
        domain: [0, max],
        colorScale: s.colorScale,
      });
      plot.render();

      const dataURL = canvas.toDataURL();
      if (!mapInstance.getSource(sourceName)) {
        mapInstance.addSource(sourceName, {
          type: 'image',
          url: dataURL,
          coordinates: [
            [coords[0], coords[3]],
            [coords[2], coords[3]],
            [coords[2], coords[1]],
            [coords[0], coords[1]],
          ],
        });
        mapInstance.addLayer({
          id: layerName,
          type: 'raster',
          source: sourceName,
          paint: { 'raster-opacity': 0.7 },
        });
      }
    });
  }, [s.colorScale, JSON.stringify(s.layers), tiffMap]);

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
  const [selectedAsset, setSelectedAsset] = useState<string>('');

  const toast = useToast();
  // @ts-ignore
  const geocoder = new esriLeafletGeocoder.geocode({ apikey: esriKey });

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
  const handleChangeColorScale = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    updateState(props._id, { colorScale: evt.target.value });
  };

  /**----------------------------------------------------------
   * 8.1 Add a new layer: append { assetid, visible: true } to s.layers
   *----------------------------------------------------------*/
  const addLayer = () => {
    if (!selectedAsset) {
      toast({
        title: 'No Asset Selected',
        description: 'Please choose an asset from the dropdown first.',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }
    if (s.layers.find((l) => l.assetid === selectedAsset)) {
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
      layers: [...s.layers, { assetid: selectedAsset, visible: true }],
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

      {/* Color Scale Dropdown */}
      <Tooltip
        placement="top"
        hasArrow
        label={s.layers.length ? 'Choose Color Scale (GeoTIFF only)' : 'Color Scale (GeoTIFF only)'}
        openDelay={400}
      >
        <Select
          isDisabled={s.layers.length === 0}
          size="xs"
          w="10rem"
          placeholder="Select Color Scale"
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
        <Select
          size="xs"
          w="200px"
          placeholder="Choose asset to add…"
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
        >
          {mapAssets.map((a) => (
            <option key={a._id} value={a._id}>
              {a.data.originalfilename}
            </option>
          ))}
        </Select>
        <Button size="xs" colorScheme="blue" onClick={addLayer}>
          Add Layer
        </Button>
      </HStack>
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
