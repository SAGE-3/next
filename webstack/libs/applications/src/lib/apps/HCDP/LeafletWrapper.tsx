/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { HStack, InputGroup, Input, ButtonGroup, Tooltip, Button, useColorModeValue, propNames } from '@chakra-ui/react';

import { useAppStore, useAssetStore, useHexColor, useHotkeys, useUIStore } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';
import { App, AppSchema } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Leaflet plus React
import * as Leaflet from 'leaflet';
import * as esriLeafletGeocoder from 'esri-leaflet-geocoder';
import { MapContainer, TileLayer, LayersControl, Marker, Popup } from 'react-leaflet';

// Import the CSS style sheet from the node_modules folder
import 'leaflet/dist/leaflet.css';

import create from 'zustand';
import { MdAdd, MdMap, MdRemove, MdTerrain } from 'react-icons/md';
import React from 'react';

// Zustand store to communicate with toolbar
export const useStore = create((set: any) => ({
  map: {} as { [key: string]: Leaflet.Map },
  saveMap: (id: string, map: Leaflet.Map) => set((state: any) => ({ map: { ...state.map, ...{ [id]: map } } })),
}));

// Get a URL for an asset
export function getStaticAssetUrl(filename: string): string {
  return `api/assets/static/${filename}`;
}

const maxZoom = 18;
const minZoom = 1;

function LeafletWrapper(props: App & { children: any }) {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);

  const selectedId = useUIStore((state) => state.selectedAppId);
  const selected = props._id === selectedId;

  // The map: any, I kown, should be Leaflet.Map but don't work
  const [map, setMap] = useState<any>();
  // Keep an handle of the overlay, to show/hide
  const overlayLayer = useRef<Leaflet.GeoJSON>();
  // Assets store
  const assets = useAssetStore((state) => state.assets);
  const [file, setFile] = useState<Asset>();
  const saveMap = useStore((state: any) => state.saveMap);

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
    if (file) {
      const newURL = getStaticAssetUrl(file.data.file);

      // Fetch the data from local server
      if (newURL) {
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
            // Create special marker
            const markerOptions = {
              radius: 5,
              fillColor: '#ff7800',
              color: '#000',
              weight: 1,
              opacity: 1,
              fillOpacity: 0.4,
            };
            // Add the data into a layer
            overlayLayer.current = Leaflet.geoJSON(gson, {
              // draw circles on the map instead  of markers
              pointToLayer: function (feature, latlng) {
                return Leaflet.circleMarker(latlng, markerOptions);
              },
            }).addTo(map);
            // Fit view to new data
            const bounds = overlayLayer.current.getBounds();
            const center = bounds.getCenter();
            map.setView(center);
            const value: [number, number] = [center.lat, center.lng];
            updateState(props._id, { location: value });
            map.fitBounds(bounds);
            // Add a new control (don't know how to add it to main control, need the list of layers)
            Leaflet.control.layers({}, { 'Data layer': overlayLayer.current }).addTo(map);
          });
      }
    }
  }, [file]);

  useEffect(() => {
    if (!map) return;
    // put in the  zustand store
    saveMap(props._id, map);
    // Update the default markers
    Leaflet.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      iconUrl: 'assets/marker-icon.png',
      shadowUrl: 'assets/marker-shadow.png',
      shadowSize: [0, 0],
      iconSize: [24, 40],
    });
  }, [map, s.overlay]);

  // Add or remove the overlay layer with the geojson data
  useEffect(() => {
    if (s.overlay && map) {
      overlayLayer.current?.addTo(map);
    } else {
      if (map) overlayLayer.current?.removeFrom(map);
    }
  }, [map, s.overlay]);

  // Window resize
  useEffect(() => {
    if (map) {
      // Using timeout here due to invalidateSize seems to be ahead of the parent div's size being set
      // 250ms seems to fix the issue when resizing
      // what?
      setTimeout(() => {
        if (map) {
          map.invalidateSize();
          if (map.getCenter().lat !== s.location[0] || map.getCenter().lng !== s.location[1]) {
            const loc = new Leaflet.LatLng(map.getCenter().lat, map.getCenter().lng);
            map.setView(loc);
          }
        }
      }, 250);
    }
  }, [props.data.size.width, props.data.size.height, map]);

  // Location sync
  const onMove = useCallback(() => {
    if (map) {
      const value: [number, number] = [map.getCenter().lat, map.getCenter().lng];
      updateState(props._id, { location: value });
    }
  }, [map, s.location]);

  // Drag events
  useEffect(() => {
    if (map) {
      map.on('dragend', onMove);
    }
    return () => {
      if (map) {
        map.off('dragend', onMove);
      }
    };
  }, [map, onMove]);

  // Synchronize the view
  useEffect(() => {
    if (map) {
      const loc = new Leaflet.LatLng(s.location[0], s.location[1]);
      map.setView(loc);
    }
  }, [s.location, map]);

  // BaseLayer sync
  const onBaseLayerChange = useCallback(
    (e: any) => {
      const value = e.name;
      updateState(props._id, { baseLayer: value });
    },
    [s.baseLayer]
  );

  useEffect(() => {
    if (map) {
      map.on('baselayerchange', onBaseLayerChange);
    }
    return () => {
      if (map) {
        map.off('baselayerchange', onBaseLayerChange);
      }
    };
  }, [map, onBaseLayerChange]);

  // Overlay layer control
  const onOverlayAdd = useCallback(() => {
    updateState(props._id, { overlay: true });
  }, [s.overlay]);

  const onOverlayRemove = useCallback(() => {
    updateState(props._id, { overlay: false });
  }, [s.overlay]);

  useEffect(() => {
    if (map) {
      map.on('overlayadd', onOverlayAdd);
      map.on('overlayremove', onOverlayRemove);
    }
    return () => {
      if (map) {
        map.off('overlayadd', onOverlayAdd);
        map.off('overlayremove', onOverlayRemove);
      }
    };
  }, [map]);

  useEffect(() => {
    if (map) {
      map.invalidateSize();
    }
  }, [map, s.baseLayer]);

  useEffect(() => {
    if (map) {
      map.setZoom(s.zoom);
    }
  }, [map, s.zoom]);

  // Zoom in on the map
  const incZoom = () => {
    if (selected) {
      const zoom = s.zoom + 1;
      const limitZoom = Math.min(zoom, maxZoom);
      updateState(props._id, { zoom: limitZoom });
    }
  };

  // Zoom out on the map
  const decZoom = () => {
    if (selected) {
      const zoom = s.zoom - 1;
      const limitZoom = Math.max(zoom, minZoom);
      updateState(props._id, { zoom: limitZoom });
    }
  };

  // + and - keyboard keys for zooming
  useHotkeys('=', incZoom, { dependencies: [selected, s.zoom] });
  useHotkeys('-', decZoom, { dependencies: [selected, s.zoom] });

  return (
    <AppWindow app={props}>
      <MapContainer
        center={[s.location[0], s.location[1]]}
        zoom={s.zoom}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        keyboard={false}
        preferCanvas={true}
        style={{ height: `100%`, width: `100%`, zIndex: 0 }}
        ref={setMap}
        attributionControl={false}
        zoomControl={false}
      >
        <LayersControl>
          {props.children}
          {/* <LayersControl.BaseLayer checked={s.baseLayer === 'World Imagery'} name="World Imagery">
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer> */}
        </LayersControl>
      </MapContainer>
    </AppWindow>
  );
}

export default LeafletWrapper;
