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
import { create } from 'zustand';
// Map library
import maplibregl from 'maplibre-gl';
// Geocoding
import * as esriLeafletGeocoder from 'esri-leaflet-geocoder';
// Turfjs geojson utilities functions
import bbox from '@turf/bbox';
import center from '@turf/center';

import { useAppStore, useAssetStore, useThrottleScale, useUIStore, apiUrls } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';
import { App } from '@sage3/applications/schema';
// import { state as AppState } from '../index';
import { state as AppState } from './index';
// import { state as AppState } from './index';
import { stationData } from './SensorOverview';

// Styling
import './maplibre-gl.css';
import React from 'react';

// Get a URL for an asset
export function getStaticAssetUrl(filename: string): string {
  return apiUrls.assets.getAssetById(filename);
}

// Zustand store to communicate with toolbar
interface MapStore {
  map: { [key: string]: maplibregl.Map };
  saveMap: (id: string, map: maplibregl.Map) => void;
}

const useStore = create<MapStore>()((set) => ({
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

const MapGL = (
  props: App & { isSelectingStations: boolean; isLoaded?: boolean; stationMetadata?: any; stationNameRef: any }
): JSX.Element => {
  const s = props.data.state as AppState;
  // const [map, setMap] = useState<maplibregl.Map>();
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const saveMap = useStore((state) => state.saveMap);
  const map = useStore((state) => state.map[props._id]);
  const stationDataRef = React.useRef(stationData);
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

  // useEffect(() => {
  //   if (map) {
  //     const mapContainer = map.getContainer();
  //     mapContainer.style.transform = `scale(${1 / scale})`;
  //   }
  // }, [scale]);

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
          map.fitBounds([box[0], box[1], box[2], box[3]], { padding: 20, duration: 0 });
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
        // updateState(props._id, { zoom: zoom, location: [center.lng, center.lat], pitch: pitch, bearing: bearing });
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

  useEffect(() => {
    if (map) {
      const updateMapSources = () => {
        const selectedStations = stationDataRef.current.filter((stationData) => s.stationNames.includes(stationData.id));

        const notSelectedStations = stationDataRef.current.filter((stationData) => !s.stationNames.includes(stationData.id));

        // Update the 'selectedStations' source
        if (map.getSource('selectedStations')) {
          //@ts-ignore
          map.getSource('selectedStations').setData({
            type: 'FeatureCollection',
            features: selectedStations.map((station) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [station.lon, station.lat],
              },
              properties: {
                stationInfo: station,
              },
            })),
          });
        }

        // Update the 'notSelectedStations' source
        if (map.getSource('notSelectedStations')) {
          //@ts-ignore
          map.getSource('notSelectedStations').setData({
            type: 'FeatureCollection',
            features: notSelectedStations.map((station) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [station.lon, station.lat],
              },
              properties: {
                stationInfo: station,
              },
            })),
          });
        }
      };

      if (props.isSelectingStations) {
        map.on('load', () => {
          const selectedStations = stationDataRef.current.filter((stationData) => s.stationNames.includes(stationData.id));

          const notSelectedStations = stationDataRef.current.filter((stationData) => !s.stationNames.includes(stationData.id));
          // Add sources
          map.addSource('selectedStations', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: selectedStations.map((station) => ({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [station.lon, station.lat],
                },
                properties: {
                  stationInfo: station,
                },
              })),
            },
          });

          map.addSource('notSelectedStations', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: notSelectedStations.map((station) => ({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [station.lon, station.lat],
                },
                properties: {
                  stationInfo: station,
                },
              })),
            },
          });

          // Add layers
          map.addLayer({
            id: 'selectedCircle',
            type: 'circle',
            source: 'selectedStations',
            paint: {
              'circle-radius': 10,
              'circle-color': '#CC4833',
              'circle-stroke-color': 'black',
              'circle-stroke-width': 2,
            },
          });

          map.addLayer({
            id: 'notSelectedCircle',
            type: 'circle',
            source: 'notSelectedStations',
            paint: {
              'circle-radius': 10,
              'circle-color': 'white',
              'circle-stroke-color': 'black',
              'circle-stroke-width': 2,
            },
          });

          map.on('click', 'notSelectedCircle', (e: any) => {
            const stationInfo = JSON.parse(e.features[0].properties.stationInfo);

            // Create marker
            const el = document.createElement('div');
            el.className = 'marker';
            el.id = `marker-${stationInfo.id}`;
            el.style.width = '23px';
            el.style.height = '23px';
            el.style.borderRadius = '50%';
            el.style.cursor = 'pointer';
            el.style.border = '2px solid black';
            el.style.backgroundColor = '#CC4833';
            el.style.zIndex = '1000';

            new maplibregl.Marker({ element: el }).setLngLat(e.features[0].geometry.coordinates).addTo(map);

            // Update state by adding the station to the selected list
            if (!props.stationNameRef.current.includes(stationInfo.id)) {
              props.stationNameRef.current.push(stationInfo.id);
              updateState(props._id, { stationNames: props.stationNameRef.current });
            }
          });

          map.on('click', 'selectedCircle', (e: any) => {
            const stationInfo = JSON.parse(e.features[0].properties.stationInfo);
            const element = document.getElementById(`marker-${stationInfo.id}`);

            if (element) {
              // Remove marker from the map
              element.remove();
            }

            // Update state by removing the station from the selected list
            const updatedStations = props.stationNameRef.current.filter((name: string) => name !== stationInfo.id);
            props.stationNameRef.current = updatedStations;
            updateState(props._id, { stationNames: updatedStations });
          });

          // Add tooltip
          const tooltip = document.createElement('div');
          tooltip.style.position = 'absolute';
          tooltip.style.backgroundColor = 'white';
          tooltip.style.border = '2px solid black';
          tooltip.style.borderRadius = '8px';
          tooltip.style.padding = '5px';
          tooltip.style.pointerEvents = 'none';
          tooltip.style.display = 'none';
          tooltip.style.zIndex = '999999';
          tooltip.style.color = 'black';
          document.body.appendChild(tooltip);

          const showTooltip = (e: any, data: any) => {
            console.log(data);
            tooltip.style.display = 'block';
            tooltip.style.left = `${e.clientX + 5}px`;
            tooltip.style.top = `${e.clientY + 5}px`;
            tooltip.innerHTML = `
            <strong>Name:</strong> ${data.name} (${data.id})<br/>
            <strong>Coordinates:</strong> [${data.lon.toFixed(1)}, ${data.lat.toFixed(1)}]<br/>
            <strong>Elevation:</strong> ${data.elevation.toFixed(1)}
          `;
          };

          const hideTooltip = () => {
            tooltip.style.display = 'none';
          };

          map.on('mouseenter', 'notSelectedCircle', (e: any) => {
            map.getCanvas().style.cursor = 'pointer';
            const stationInfo = JSON.parse(e.features[0].properties.stationInfo);
            showTooltip(e.originalEvent, stationInfo);
          });

          map.on('mouseleave', 'notSelectedCircle', () => {
            map.getCanvas().style.cursor = '';
            hideTooltip();
          });

          map.on('mouseenter', 'selectedCircle', (e: any) => {
            map.getCanvas().style.cursor = 'pointer';
            const stationInfo = JSON.parse(e.features[0].properties.stationInfo);
            showTooltip(e.originalEvent, stationInfo);
          });

          map.on('mouseleave', 'selectedCircle', () => {
            map.getCanvas().style.cursor = '';
            hideTooltip();
          });
        });
      }

      updateMapSources(); // Ensure sources are updated when s.stationNames changes
    }
  }, [map, props.isSelectingStations, s.stationNames]);

  return (
    <>
      {/* One box for map, one box for container */}
      {/* <Box id={'container' + props._id} w={props.data.size.width} h={props.data.size.height}> */}
      <Box id={'map' + props._id} w={'100%'} h={'100%'} />
      {/* </Box> */}
    </>
  );
};

export default MapGL;
