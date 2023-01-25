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

const stationPositions = [
  { lat: 20.8415, lon: -156.2948, id: '017HI' },
  { lat: 20.7067, lon: -156.3554, id: '016HI' },
  { lat: 20.7579, lon: -156.32, id: '001HI' },
  { lat: 20.7598, lon: -156.2482, id: '002HI' },
  { lat: 20.7382, lon: -156.2458, id: '013HI' },
  { lat: 20.7104, lon: -156.2567, id: '003HI' },
  { lat: 19.6974, lon: -155.0954, id: '005HI' },
  { lat: 19.964, lon: -155.25, id: '006HI' },
  { lat: 19.932, lon: -155.291, id: '007HI' },
  { lat: 19.748, lon: -155.996, id: '008HI' },
  { lat: 19.803, lon: -155.851, id: '009HI' },
  { lat: 19.73, lon: -155.87, id: '010HI' },
  { lat: 21.333, lon: -157.8025, id: '011HI' },
  { lat: 21.3391, lon: -157.8369, id: '012HI' },
  { lat: 22.2026, lon: -159.5188, id: '014HI' },
  { lat: 22.1975, lon: -159.421, id: '015HI' },
];

// Leaflet App
function AppComponent(props: App): JSX.Element {
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

  const createApp = useAppStore((state) => state.create);

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

  // useEffect(() => {
  //   fetch('https://www2.hawaii.edu/~thomas/Browser_Home/NWS_HI_Mes_Pages.html', {
  //     headers: {
  //       'Content-Type': 'application/json',
  //       Accept: 'application/json',
  //     },
  //     mode: 'no-cors',
  //   })
  //     .then((response) => console.log(response))
  //     .then((data) => console.log(data));
  // }, []);

  const createCharts = () => {
    const createAppAtPos = (whereToCreateApp: string): void => {
      let appPos = { x: 0, y: 0, z: 0 };
      switch (whereToCreateApp) {
        case 'top':
          appPos = { x: props.data.position.x, y: props.data.position.y - props.data.size.height, z: 0 };
          break;
        case 'right':
          appPos = { x: props.data.position.x + props.data.size.height, y: props.data.position.y, z: 0 };
          break;
        case 'left':
          appPos = { x: props.data.position.x - props.data.size.height, y: props.data.position.y, z: 0 };
          break;
        case 'bottom':
          appPos = { x: props.data.position.x, y: props.data.position.y + props.data.size.height, z: 0 };
          break;
        default:
          appPos = { x: 0, y: 0, z: 0 };
      }
      createApp({
        title: '',
        roomId: props.data.roomId!,
        boardId: props.data.boardId!,
        position: appPos,
        size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'VegaLiteViewer',
        state: {
          spec: '{"$schema": "https://vega.github.io/schema/vega-lite/v5.json", "description": "A simple bar chart with embedded data.","data": {"values": [{"a": "A", "b": 28}, {"a": "B", "b": 55}, {"a": "C", "b": 43},{"a": "D", "b": 91}, {"a": "E", "b": 81}, {"a": "F", "b": 53}, {"a": "G", "b": 19}, {"a": "H", "b": 87}, {"a": "I", "b": 52}]},"mark": "bar","encoding": {"x": {"field": "a", "type": "nominal", "axis": {"labelAngle": 0}},"y": {"field": "b", "type": "quantitative"}}}',
        },
        raised: true,
      });
    };

    createAppAtPos('top');
    createAppAtPos('left');
    createAppAtPos('right');
    createAppAtPos('bottom');
  };

  return (
    <AppWindow app={props}>
      <MapContainer
        center={[s.location[0], s.location[1]]}
        zoom={s.zoom}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        keyboard={false}
        preferCanvas={true}
        style={{ height: `100%`, width: `100%` }}
        ref={setMap}
        attributionControl={false}
        zoomControl={false}
      >
        <LayersControl>
          <LayersControl.BaseLayer checked={s.baseLayer === 'OpenStreetMap'} name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {stationPositions.map((pos, index) => {
              return (
                <Marker
                  eventHandlers={{
                    click: (e) => {
                      createCharts();
                    },
                  }}
                  key={index}
                  position={[pos.lat, pos.lon]}
                >
                  <Popup>
                    A pretty CSS3 popup. <br /> Easily customizable.
                  </Popup>
                </Marker>
              );
            })}
          </LayersControl.BaseLayer>
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

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const [addrValue, setAddrValue] = useState('');
  const map = useStore((state: any) => state.map[props._id]);
  const update = useAppStore((state) => state.update);

  const background = useColorModeValue('gray.50', 'gray.700');
  const panelBackground = useHexColor(background);

  const apiKey = 'AAPK74760e71edd04d12ac33fd375e85ba0d4CL8Ho3haHz1cOyUgnYG4UUEW6NG0xj2j1qsmVBAZNupoD44ZiSJ4DP36ksP-t3B';
  // @ts-expect-error
  const geocoder = new esriLeafletGeocoder.geocode({
    apikey: apiKey,
  });

  // from the UI to the react state
  const handleAddrChange = (event: any) => setAddrValue(event.target.value);
  const changeAddr = (evt: any) => {
    evt.preventDefault();

    geocoder.text(addrValue).run(function (err: any, results: any, response: any) {
      if (err) {
        console.log(err);
        return;
      }
      const res = results.results[0];
      if (res && res.latlng) {
        const value: [number, number] = [res.latlng.lat, res.latlng.lng];

        map.fitBounds([res.bounds._southWest, res.bounds._northEast]);
        // Sync zoom after fitting bounds
        const newZoom = map.getZoom();
        updateState(props._id, { location: value, zoom: newZoom });

        // Update the app title
        update(props._id, { title: res.text });
      }
    });
  };

  // Zoom in on the map
  const incZoom = () => {
    const zoom = s.zoom + 1;
    const limitZoom = Math.min(zoom, maxZoom);
    updateState(props._id, { zoom: limitZoom });
  };

  // Zoom out on the map
  const decZoom = () => {
    const zoom = s.zoom - 1;
    const limitZoom = Math.max(zoom, minZoom);
    updateState(props._id, { zoom: limitZoom });
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
              placeholder="Type a place or address"
              _placeholder={{ opacity: 1, color: 'gray.400' }}
            />
          </InputGroup>
        </form>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Zoom In'} openDelay={400}>
          <Button isDisabled={s.zoom >= 18} onClick={incZoom} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdAdd fontSize="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Zoom Out'} openDelay={400}>
          <Button isDisabled={s.zoom <= 1} onClick={decZoom} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdRemove fontSize="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Street Map'} openDelay={400}>
          <Button
            border={s.baseLayer !== 'OpenStreetMap' ? `solid ${panelBackground} 2px` : 'teal'}
            onClick={() => updateState(props._id, { baseLayer: 'OpenStreetMap' })}
            _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
          >
            <MdMap fontSize="20px" />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Satellite Map'} openDelay={400}>
          <Button
            border={s.baseLayer !== 'World Imagery' ? `solid ${panelBackground} 2px` : ''}
            onClick={() => updateState(props._id, { baseLayer: 'World Imagery' })}
            _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
          >
            <MdTerrain fontSize="20px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </HStack>
  );
}

export default { AppComponent, ToolbarComponent };
