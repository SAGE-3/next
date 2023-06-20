/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

import { useAppStore, useAssetStore, useHexColor, useHotkeys, useUIStore } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';
import { App } from '../../schema';

import { state as AppState } from './index';

// Leaflet plus React
import * as Leaflet from 'leaflet';
import { MapContainer, TileLayer, LayersControl, Marker, Popup } from 'react-leaflet';

// Import the CSS style sheet from the node_modules folder
import 'leaflet/dist/leaflet.css';

import create from 'zustand';
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

function LeafletWrapper(props: App & { children: any; map: any; setMap: any }) {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);

  const selectedId = useUIStore((state) => state.selectedAppId);
  const selected = props._id === selectedId;

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
            }).addTo(props.map);
            // Fit view to new data
            const bounds = overlayLayer.current.getBounds();
            const center = bounds.getCenter();
            props.map.setView(center);
            const value: [number, number] = [center.lat, center.lng];
            updateState(props._id, { location: value });
            props.map.fitBounds(bounds);
            // Add a new control (don't know how to add it to main control, need the list of layers)
            Leaflet.control.layers({}, { 'Data layer': overlayLayer.current }).addTo(props.map);
          });
      }
    }
  }, [file]);

  useEffect(() => {
    if (!props.map) return;
    // put in the  zustand store
    saveMap(props._id, props.map);
    // Update the default markers
    Leaflet.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      iconUrl: 'assets/marker-icon.png',
      shadowUrl: 'assets/marker-shadow.png',
      shadowSize: [0, 0],
      iconSize: [24, 40],
    });
  }, [props.map, s.overlay]);

  // Add or remove the overlay layer with the geojson data
  useEffect(() => {
    if (s.overlay && props.map) {
      overlayLayer.current?.addTo(props.map);
    } else {
      if (props.map) overlayLayer.current?.removeFrom(props.map);
    }
  }, [props.map, s.overlay]);

  // Window resize
  useEffect(() => {
    if (props.map) {
      // Using timeout here due to invalidateSize seems to be ahead of the parent div's size being set
      // 250ms seems to fix the issue when resizing
      // what?
      setTimeout(() => {
        if (props.map) {
          // props.map.invalidateSize();
          if (props.map.getCenter().lat !== s.location[0] || props.map.getCenter().lng !== s.location[1]) {
            const loc = new Leaflet.LatLng(props.map.getCenter().lat, props.map.getCenter().lng);
            props.map.setView(loc);
          }
        }
      }, 250);
    }
  }, [props.data.size.width, props.data.size.height, props.map]);

  // Location sync
  const onMove = useCallback(() => {
    if (props.map) {
      const value: [number, number] = [props.map.getCenter().lat, props.map.getCenter().lng];
      updateState(props._id, { location: value });
    }
  }, [props.map, s.location]);

  // Drag events
  useEffect(() => {
    if (props.map) {
      props.map.on('dragend', onMove);
    }
    return () => {
      if (props.map) {
        props.map.off('dragend', onMove);
      }
    };
  }, [props.map, onMove]);

  // Synchronize the view
  useEffect(() => {
    if (props.map) {
      const loc = new Leaflet.LatLng(s.location[0], s.location[1]);
      props.map.setView(loc);
    }
  }, [s.location, props.map]);

  // BaseLayer sync
  const onBaseLayerChange = useCallback(
    (e: any) => {
      const value = e.name;
      updateState(props._id, { baseLayer: value });
    },
    [s.baseLayer]
  );

  useEffect(() => {
    if (props.map) {
      props.map.on('baselayerchange', onBaseLayerChange);
    }
    return () => {
      if (props.map) {
        props.map.off('baselayerchange', onBaseLayerChange);
      }
    };
  }, [props.map, onBaseLayerChange]);

  // Overlay layer control
  const onOverlayAdd = useCallback(() => {
    updateState(props._id, { overlay: true });
  }, [s.overlay]);

  const onOverlayRemove = useCallback(() => {
    updateState(props._id, { overlay: false });
  }, [s.overlay]);

  useEffect(() => {
    if (props.map) {
      props.map.on('overlayadd', onOverlayAdd);
      props.map.on('overlayremove', onOverlayRemove);
    }
    return () => {
      if (props.map) {
        props.map.off('overlayadd', onOverlayAdd);
        props.map.off('overlayremove', onOverlayRemove);
      }
    };
  }, [props.map]);

  useEffect(() => {
    if (props.map) {
      props.map.invalidateSize();
    }
  }, [props.map, s.baseLayer]);

  useEffect(() => {
    if (props.map) {
      props.map.setZoom(s.zoom);
    }
  }, [props.map, s.zoom]);

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
    <MapContainer
      center={[s.location[0], s.location[1]]}
      zoom={s.zoom}
      keyboard={false}
      preferCanvas={true}
      style={{ height: `91%`, width: `100%`, zIndex: 0 }}
      ref={props.setMap}
      attributionControl={false}
    >
      <LayersControl>{props.children}</LayersControl>
    </MapContainer>
  );
}

export default LeafletWrapper;
