/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useSageStateAtom, useSageAssetUrl } from '@sage3/frontend/smart-data/hooks';

import { leafBaseLayer, LeafletViewerProps, leafLocation, leafOverlay, leafZoom } from './metadata';

// Leaflet plus React
import * as Leaflet from 'leaflet';
import { MapContainer, TileLayer, LayersControl } from 'react-leaflet';

// Import the CSS style sheet from the node_modules folder
import 'leaflet/dist/leaflet.css';

/**
 * LeafletViewer application
 * @param props
 * @returns component
 */
export const LeafletViewer = (props: LeafletViewerProps): JSX.Element => {
  const zoom = useSageStateAtom<leafZoom>(props.state.zoom);
  const location = useSageStateAtom<leafLocation>(props.state.location);
  const baseLayer = useSageStateAtom<leafBaseLayer>(props.state.baseLayer);
  const overlay = useSageStateAtom<leafOverlay>(props.state.overlay);
  const geojson = useSageAssetUrl(props.data.layer);

  // The map
  const [map, setMap] = useState<Leaflet.Map>();

  // Keep an handle of the overlay, to show/hide
  const overlayLayer = useRef<Leaflet.GeoJSON>();

  useEffect(() => {
    if (!map) return;

    // Update the default markers
    Leaflet.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      iconUrl: 'assets/marker-icon.png',
      shadowUrl: 'assets/marker-shadow.png',
      shadowSize: [0, 0],
      iconSize: [24, 40]
    });

    // Fetch the data from local server
    fetch(geojson.data.url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }).then(function (response) {
      return response.json();
    }).then(function (gson) {
      // Create special marker
      const markerOptions = {
        radius: 5,
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.4
      };

      // Add the data into a layer
      overlayLayer.current = Leaflet.geoJSON(gson, {
        // draw circles on the map instead  of markers
        pointToLayer: function (feature, latlng) {
          return Leaflet.circleMarker(latlng, markerOptions);
        }
      }).addTo(map);

      // Fit view to new data
      map.fitBounds(overlayLayer.current.getBounds());

      // Add a new control (don't know how to add it to main control, need the list of layers)
      Leaflet.control.layers({}, {
        "Data layer": overlayLayer.current
      }).addTo(map);

    })
  }, [map, geojson.data.url, overlay]);

  // Add or remove the overlay layer with the geojson data
  useEffect(() => {
    if (overlay.data.value && map) {
      overlayLayer.current?.addTo(map);
    } else {
      if (map)
        overlayLayer.current?.removeFrom(map)
    }
  }, [map, overlay.data.value])

  // Window resize
  useEffect(() => {
    if (map) {
      // Using timeout here due to invalidateSize seems to be ahead of the parent div's size being set
      // 250ms seems to fix the issue when resizing
      setTimeout(() => {
        map.invalidateSize();
        if (map.getCenter().lat !== location.data.value[0] || map.getCenter().lng !== location.data.value[1]) {
          const loc = new Leaflet.LatLng(map.getCenter().lat, map.getCenter().lng);
          map.setView(loc);
        }
      }, 250)
    }
  }, [props.position.width, props.position.height, map, location.data.value]);

  // Location sync
  const onMove = useCallback(() => {
    if (map) {
      const value: [number, number] = [map.getCenter().lat, map.getCenter().lng];
      location.setData({ value: value });
    }
  }, [map, location]);

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
    if (!location.isPending && map) {
      const loc = new Leaflet.LatLng(location.data.value[0], location.data.value[1]);
      map.setView(loc);
    }
  }, [location.data.value, location.isPending, map]);

  // BaseLayer sync
  const onBaseLayerChange = useCallback(
    (e) => {
      const value = e.name;
      baseLayer.setData({ value });
    }, [baseLayer]
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
    overlay.setData({ value: true });
  }, [overlay]);
  const onOverlayRemove = useCallback(() => {
    overlay.setData({ value: false });
  }, [overlay]);
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
  }, [map, onOverlayAdd, onOverlayRemove]);

  useEffect(() => {
    if (!baseLayer.isPending && map) {
      map.invalidateSize();
    }
  }, [map, baseLayer]);

  // Zoom sync
  const onZoom = useCallback((ev: Leaflet.LeafletEvent) => {
    if (map) {
      zoom.setData({ value: map.getZoom() });
    }
  }, [map, zoom]);

  useEffect(() => {
    if (map) {
      map.on('zoomend', onZoom)
    }
    return () => {
      if (map) {
        map.off('zoomend', onZoom)
      }
    };
  }, [map, onZoom]);

  useEffect(() => {
    if (!zoom.isPending && map) {
      map.setZoom(zoom.data.value);
    }
  }, [map, zoom.isPending, zoom.data.value]);

  return (
    <MapContainer
      center={location.data.value}
      zoom={zoom.data.value}
      scrollWheelZoom={false}
      doubleClickZoom={true}
      preferCanvas={true}
      style={{ height: `100%`, width: `100%` }}
      whenCreated={setMap}
      attributionControl={false}
      zoomControl={false}

    >
      <LayersControl>
        <LayersControl.BaseLayer checked={baseLayer.data.value === 'OpenStreetMap'} name="OpenStreetMap">
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer checked={baseLayer.data.value === 'World Imagery'} name="World Imagery">
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
      </LayersControl>
    </MapContainer>
  );
};

export default LeafletViewer;
