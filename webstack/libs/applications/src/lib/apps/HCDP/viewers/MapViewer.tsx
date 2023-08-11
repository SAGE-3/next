/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { HStack, Box, ButtonGroup, Tooltip, Button, InputGroup, Input } from '@chakra-ui/react';
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

import { useAppStore, useAssetStore } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';
import { App } from '../../../schema';
import { state as AppState } from '../index';
// import { state as AppState } from './index';
import redMarker from './redMarker.png';

// Styling
import './maplibre-gl.css';
import React from 'react';

// Get a URL for an asset
export function getStaticAssetUrl(filename: string): string {
  return `/api/assets/static/${filename}`;
}

// Zustand store to communicate with toolbar
export const useStore = create((set) => ({
  map: {} as { [key: string]: maplibregl.Map },
  saveMap: (id: string, map: maplibregl.Map) => set((state: any) => ({ map: { ...state.map, ...{ [id]: map } } })),
}));

const maxZoom = 18;
const minZoom = 1;

const MapViewer = (props: App & { isSelectingStations: boolean }): JSX.Element => {
  const s = props.data.state as AppState;
  // const [map, setMap] = useState<maplibregl.Map>();
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const saveMap = useStore((state: any) => state.saveMap);
  const map = useStore((state: any) => state.map[props._id]);
  // Presence Information
  // const { user } = useUser();
  const stationDataRef = React.useRef(stationData);
  const stationNameRef = React.useRef(s.stationNames);

  // Assets store
  const assets = useAssetStore((state) => state.assets);
  const [file, setFile] = useState<Asset>();

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
      map.on('load', () => {
        const newURL = getStaticAssetUrl(file.data.file);
        console.log('MapGL> Adding source to map', newURL);
        // Get the GEOJSON data from the asset
        fetch(newURL, {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        })
          .then(function (response) {
            return response.json();
          })
          .then(function (gson) {
            // Add the source to the map
            map.addSource(file._id, {
              type: 'geojson',
              data: gson,
            });
            // Layer for Polygons (lines and fills)
            map.addLayer({
              id: file._id + 'line',
              source: file._id,
              type: 'line',
              paint: {
                'line-color': '#000',
                'line-width': 2,
              },
              filter: ['==', '$type', 'Polygon'],
            });
            map.addLayer({
              id: file._id + 'fill',
              source: file._id,
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
              id: file._id + 'symbol',
              source: file._id,
              type: 'circle',
              paint: {
                'circle-color': '#ff7800',
                'circle-opacity': 0.4,
                'circle-stroke-width': 2,
                'circle-radius': 5,
              },
              filter: ['==', '$type', 'Point'],
            });

            // Calculate the bounding box and center using turf library
            const box = bbox(gson);
            const cc = center(gson).geometry.coordinates;

            // Duration is zero to get a valid zoom value next
            map.fitBounds(box, { padding: 20, duration: 0 });
            updateState(props._id, { zoom: map.getZoom(), location: cc });
          });
      });
    }
  }, [file, map]);

  useEffect(() => {
    const localmap = new maplibregl.Map({
      container: 'map' + props._id,
      attributionControl: false,
      style: 'https://api.maptiler.com/maps/bright/style.json?key=4vBZtdgkPHakm28uzrnt',

      center: s.location as maplibregl.LngLatLike,
      zoom: s.zoom,
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
    localmap.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    // Remove compass
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
      // if (props.isSelectingStations) {
      //   for (let i = 0; i < stationData.length; i++) {
      //     const marker = new maplibregl.Marker().setLngLat([stationData[i].lon, stationData[i].lat]).addTo(map);
      //   }
      // } else {
      //   const marker = new maplibregl.Marker().setLngLat([-156.3554, 20.7067]).addTo(map);
      //   marker.on('mouseenter', () => {
      //     console.log('Clicked');
      //   });
      // }

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

  useEffect(() => {
    if (map) {
      if (props.isSelectingStations) {
        const selectedStations = stationDataRef.current.filter((stationData) => s.stationNames.includes(stationData.name));
        const notSelectedStations = stationDataRef.current.filter((stationData) => !s.stationNames.includes(stationData.name));

        map.loadImage('https://maplibre.org/maplibre-gl-js/docs/assets/custom_marker.png', (error: any, image: any) => {
          if (error) {
            console.log(error);
          } else {
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
                'circle-radius': 15,
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
              const stationIsSelected = s.stationNames.includes(stationInfo.name) || stationNameRef.current.includes(stationInfo.name);

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
                el.style.width = '35px';
                el.style.height = '35px';
                el.style.borderRadius = '50%';
                el.style.cursor = 'pointer';
                el.style.border = '2px solid black';
                el.style.backgroundColor = '#CC4833';
                el.style.zIndex = '1000';
                new maplibregl.Marker(el).setLngLat(e.features[0].geometry.coordinates).addTo(map);
                const tmpSelectedStations = s.stationNames;
                tmpSelectedStations.push(stationInfo.name);
                updateState(props._id, { stationNames: tmpSelectedStations });
                stationNameRef.current = [...s.stationNames, stationInfo.name];
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
                'circle-radius': 15,
                'circle-color': '#CC4833',
                'circle-stroke-color': 'black',
                'circle-stroke-width': 2,
              },
            });

            map.on('click', 'selectedCircle', (e: any) => {
              console.log('CLIKED< I AM SUPPOSED TO BE CLICKED');

              const stationInfo = JSON.parse(e.features[0].properties.stationInfo);
              const element = document.getElementById(`marker-${stationInfo.name}`);
              const stationIsSelected = s.stationNames.includes(stationInfo.name) || stationNameRef.current.includes(stationInfo.name);
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
                el.style.width = '35px';
                el.style.height = '35px';
                el.style.borderRadius = '50%';
                el.style.cursor = 'pointer';
                el.style.border = '2px black solid';

                el.style.backgroundColor = 'white';
                // el.style.opacity = '0.1';
                el.style.zIndex = '1000';
                new maplibregl.Marker(el).setLngLat(e.features[0].geometry.coordinates).addTo(map);

                // tmpSelectedStations = tmpSelectedStations.filter((name: string) => name !== stationInfo.name);
                for (let i = 0; i < tmpSelectedStations.length; i++) {
                  if (tmpSelectedStations[i] === stationInfo.name) {
                    tmpSelectedStations.splice(i, 1);
                  }
                }
              }
              updateState(props._id, { stationNames: tmpSelectedStations });
              stationNameRef.current = [...s.stationNames, stationInfo.name];
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
          }
        });
      }
    }
  }, [map, JSON.stringify(s.stationNames), stationDataRef.current]);
  return (
    <>
      {/* One box for map, one box for container */}
      {/* <Box id={'container' + props._id} w={props.data.size.width} h={props.data.size.height}> */}
      <Box id={'map' + props._id} w={'100%'} h={'100%'} />
      {/* </Box> */}
    </>
  );
};

export default MapViewer;

// For now, this is hard-coded. Will change when HCDP is ready.
export const stationData: { lat: number; lon: number; name: string; selected: boolean }[] = [
  {
    lat: 20.8415,
    lon: -156.2948,
    name: '017HI',
    selected: false,
  },
  {
    lat: 20.7067,
    lon: -156.3554,
    name: '016HI',
    selected: false,
  },
  {
    lat: 20.7579,
    lon: -156.32,
    name: '001HI',
    selected: false,
  },
  {
    lat: 20.7598,
    lon: -156.2482,
    name: '002HI',
    selected: false,
  },
  {
    lat: 20.7382,
    lon: -156.2458,
    name: '013HI',
    selected: false,
  },
  {
    lat: 20.7104,
    lon: -156.2567,
    name: '003HI',
    selected: false,
  },
  {
    lat: 19.6974,
    lon: -155.0954,
    name: '005HI',
    selected: false,
  },
  {
    lat: 19.964,
    lon: -155.25,
    name: '006HI',
    selected: false,
  },
  {
    lat: 19.932,
    lon: -155.291,
    name: '007HI',
    selected: false,
  },
  {
    lat: 19.748,
    lon: -155.996,
    name: '008HI',
    selected: false,
  },
  {
    lat: 19.803,
    lon: -155.851,
    name: '009HI',
    selected: false,
  },
  {
    lat: 19.73,
    lon: -155.87,
    name: '010HI',
    selected: false,
  },
  {
    lat: 21.333,
    lon: -157.8025,
    name: '011HI',
    selected: false,
  },
  {
    lat: 21.3391,
    lon: -157.8369,
    name: '012HI',
    selected: false,
  },
  {
    lat: 22.2026,
    lon: -159.5188,
    name: '014HI',
    selected: false,
  },
  {
    lat: 22.1975,
    lon: -159.421,
    name: '015HI',
    selected: false,
  },
];
