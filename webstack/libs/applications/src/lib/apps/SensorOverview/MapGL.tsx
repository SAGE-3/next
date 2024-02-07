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
  map: { [key: string]: maplibregl.Map },
  saveMap: (id: string, map: maplibregl.Map) => void,
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
      if (props.isSelectingStations) {
        const selectedStations = stationDataRef.current.filter((stationData) => s.stationNames.includes(stationData.name));
        const notSelectedStations = stationDataRef.current.filter((stationData) => !s.stationNames.includes(stationData.name));
        map.on('load', () => {
          console.log(s.stationNames);

          // map.addImage('custom-marker', image);
          // Add a GeoJSON source with 3 points.

          /**
           * NOT SELECTED STATION
           */
          map.addSource('notSelectedStations', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: notSelectedStations.map((s) => {
                return {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [s.lon, s.lat],
                  },
                  properties: {
                    stationInfo: s,
                  },
                };
              }),
            },
          });

          map.addLayer({
            id: 'notSelectedCircle',
            type: 'circle',
            source: 'notSelectedStations',
            paint: {
              'circle-radius': 10,
              'circle-stroke-color': 'black',
              'circle-stroke-width': 2,
              'circle-color': 'white',
            },
          });

          // Center the map on the coordinates of any clicked symbol from the 'symbols' layer.
          map.on('click', 'notSelectedCircle', (e: any) => {
            // map.flyTo({
            //   center: e.features[0].geometry.coordinates,
            // });
            const stationInfo = JSON.parse(e.features[0].properties.stationInfo);
            const element = document.getElementById(`marker-${stationInfo.name}`);
            const stationIsSelected = s.stationNames.includes(stationInfo.name) || props.stationNameRef.current.includes(stationInfo.name);

            if (element && stationIsSelected) {
              const tmpSelectedStations = s.stationNames;
              // tmpSelectedStations = tmpSelectedStations.filter((name: string) => name !== stationInfo.name);
              for (let i = 0; i < tmpSelectedStations.length; i++) {
                if (tmpSelectedStations[i] === stationInfo.name) {
                  tmpSelectedStations.splice(i, 1);
                }
              }
              updateState(props._id, { stationNames: tmpSelectedStations });

              // stationNameRef.current = s.stationNames.filter((name: string) => name !== stationInfo.name);
              element?.remove();
            } else {
              const el = document.createElement('div');
              el.className = 'marker';
              el.id = `marker-${stationInfo.name}`;
              // el.style.backgroundImage =
              //   'url(https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRra1KaZfDLJB7aDhaXpGKAg8IVxS8phSpXP2iOJcUq_VGVSjLZ7YueJm_Dvys4nuW_8_E&usqp=CAU)';
              el.style.width = '23px';
              el.style.height = '23px';
              el.style.borderRadius = '50%';
              el.style.cursor = 'pointer';
              el.style.border = '2px solid black';
              el.style.backgroundColor = '#CC4833';
              el.style.zIndex = '1000';
              new maplibregl.Marker({ element: el }).setLngLat(e.features[0].geometry.coordinates).addTo(map);
              const tmpSelectedStations = s.stationNames;
              tmpSelectedStations.push(stationInfo.name);
              updateState(props._id, { stationNames: tmpSelectedStations });
              props.stationNameRef.current = [...s.stationNames, stationInfo.name];
            }
          });

          // Change the cursor to a pointer when the it enters a feature in the 'symbols' layer.
          map.on('mouseenter', 'notSelectedCircle', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          // Change it back to a pointer when it leaves.
          map.on('mouseleave', 'notSelectedCircle', () => {
            map.getCanvas().style.cursor = '';
          });

          /**
           * SELECTED STATION
           */
          map.addSource('selectedStations', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: selectedStations.map((s) => {
                return {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [s.lon, s.lat],
                  },
                  properties: {
                    stationInfo: s,
                  },
                };
              }),
            },
          });

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

          map.on('click', 'selectedCircle', (e: any) => {
            console.log('CLIKED< I AM SUPPOSED TO BE CLICKED');

            const stationInfo = JSON.parse(e.features[0].properties.stationInfo);
            const element = document.getElementById(`marker-${stationInfo.name}`);
            const stationIsSelected = s.stationNames.includes(stationInfo.name) || props.stationNameRef.current.includes(stationInfo.name);
            const tmpSelectedStations = s.stationNames;

            if (element && stationIsSelected) {
              element?.remove();
              tmpSelectedStations.push(stationInfo.name);
            } else {
              const el = document.createElement('div');
              el.className = 'marker';
              el.id = `marker-${stationInfo.name}`;
              // el.style.backgroundImage =
              //   'url(https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRra1KaZfDLJB7aDhaXpGKAg8IVxS8phSpXP2iOJcUq_VGVSjLZ7YueJm_Dvys4nuW_8_E&usqp=CAU)';
              el.style.width = '23px';
              el.style.height = '23px';
              el.style.borderRadius = '50%';
              el.style.cursor = 'pointer';
              el.style.border = '2px black solid';

              el.style.backgroundColor = 'white';
              // el.style.opacity = '0.1';
              el.style.zIndex = '1000';
              new maplibregl.Marker({ element: el }).setLngLat(e.features[0].geometry.coordinates).addTo(map);

              // tmpSelectedStations = tmpSelectedStations.filter((name: string) => name !== stationInfo.name);
              for (let i = 0; i < tmpSelectedStations.length; i++) {
                if (tmpSelectedStations[i] === stationInfo.name) {
                  tmpSelectedStations.splice(i, 1);
                }
              }
            }
            updateState(props._id, { stationNames: tmpSelectedStations });
            props.stationNameRef.current = [...s.stationNames, stationInfo.name];
            // stationNameRef.current = tmpSelectedStations;
          });
          // Change the cursor to a pointer when the it enters a feature in the 'symbols' layer.
          map.on('mouseenter', 'selectedCircle', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          // Change it back to a pointer when it leaves.
          map.on('mouseleave', 'selectedCircle', () => {
            map.getCanvas().style.cursor = '';
          });
        });
      }
    }
  }, [map, JSON.stringify(s.stationNames), stationDataRef.current, props.stationNameRef.current]);

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
