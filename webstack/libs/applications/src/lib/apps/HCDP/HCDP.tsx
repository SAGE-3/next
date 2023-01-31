/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState } from 'react';
import { HStack, InputGroup, Input, ButtonGroup, Tooltip, Button, useColorModeValue, propNames } from '@chakra-ui/react';

import { useAppStore, useAssetStore, useHexColor, useHotkeys, useUIStore } from '@sage3/frontend';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Leaflet plus React
import * as Leaflet from 'leaflet';
import * as esriLeafletGeocoder from 'esri-leaflet-geocoder';
import { MapContainer, TileLayer, LayersControl, Marker, Popup } from 'react-leaflet';
import LeafletWrapper from './LeafletWrapper';

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

const stationData = [
  { lat: 20.8415, lon: -156.2948, name: '017HI' },
  { lat: 20.7067, lon: -156.3554, name: '016HI' },
  { lat: 20.7579, lon: -156.32, name: '001HI' },
  { lat: 20.7598, lon: -156.2482, name: '002HI' },
  { lat: 20.7382, lon: -156.2458, name: '013HI' },
  { lat: 20.7104, lon: -156.2567, name: '003HI' },
  { lat: 19.6974, lon: -155.0954, name: '005HI' },
  { lat: 19.964, lon: -155.25, name: '006HI' },
  { lat: 19.932, lon: -155.291, name: '007HI' },
  { lat: 19.748, lon: -155.996, name: '008HI' },
  { lat: 19.803, lon: -155.851, name: '009HI' },
  { lat: 19.73, lon: -155.87, name: '010HI' },
  { lat: 21.333, lon: -157.8025, name: '011HI' },
  { lat: 21.3391, lon: -157.8369, name: '012HI' },
  { lat: 22.2026, lon: -159.5188, name: '014HI' },
  { lat: 22.1975, lon: -159.421, name: '015HI' },
];

// Leaflet App
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const createApp = useAppStore((state) => state.create);

  const createAllCharts = (data: { lat: number; lon: number; name: string }) => {
    const stationName = data.name;

    let climateData: any[] = [];
    let appPos = { x: props.data.position.x, y: props.data.position.y, z: 0 };

    fetch(
      `https://api.mesowest.net/v2/stations/timeseries?STID=${stationName}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
    ).then((response) => {
      response.json().then((station) => {
        climateData = station['STATION'][0]['OBSERVATIONS'];
        console.log(climateData);
        const climateProps = Object.keys(climateData);
        let newLineMultiplier = 0;

        for (let i = 0; i < climateProps.length; i++) {
          console.log(climateProps[i]);

          if (i % 4 == 0) {
            newLineMultiplier++;
          }
          appPos = {
            x: props.data.position.x + props.data.size.width * (i % 4),
            y: props.data.position.y + props.data.size.height * newLineMultiplier,
            z: 0,
          };
          createApp({
            title: '',
            roomId: props.data.roomId!,
            boardId: props.data.boardId!,
            position: appPos,
            size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'ChartGenerator',
            state: {
              layout: { width: props.data.size.width, height: props.data.size.height, title: `HCDP data for ${stationName}` },
              axis: { y: [climateProps[i]], x: ['date_time'], type: ['scatter'], mode: [''] },
              url: `https://api.mesowest.net/v2/stations/timeseries?STID=${stationName}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`,
            },
            raised: true,
          });
        }
      });
    });
  };

  const createAppAtPos = (whereToCreateApp: string, traces: any[], stationName: string): void => {
    let appPos = { x: props.data.position.x, y: props.data.position.y, z: 0 };
    console.log(appPos, whereToCreateApp);

    switch (whereToCreateApp) {
      case 'top':
        appPos.y -= props.data.size.height;
        break;
      case 'right':
        appPos.x += props.data.size.width;
        break;
      case 'left':
        appPos.x -= props.data.size.width;
        break;
      case 'bottom':
        appPos.y += props.data.size.height;
        break;
      default:
        appPos = { x: 0, y: 0, z: 0 };
    }
    console.log(appPos);
    createApp({
      title: '',
      roomId: props.data.roomId!,
      boardId: props.data.boardId!,
      position: appPos,
      size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'ChartGenerator',
      state: {
        traces: [],
        layout: { width: props.data.size.width, height: props.data.size.height, title: `HCDP data for ${stationName}` },
        axis: { y: [''], x: [''], type: ['scatter'], mode: [''] },
        url: `https://api.mesowest.net/v2/stations/timeseries?STID=${stationName}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`,
      },
      raised: true,
    });
  };
  const createChartTemplate = (data: { lat: number; lon: number; name: string }) => {
    let climateData: any[] = [];
    const stationName = data.name;

    fetch(
      'https://api.mesowest.net/v2/stations/timeseries?STID=017HI&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local'
    ).then((response) => {
      response.json().then((station) => {
        climateData = station['STATION'][0]['OBSERVATIONS'];
        console.log(climateData);
        const climateProps = Object.keys(climateData);
        let traces = [];
        // for (let i = 0; i < climateProps.length; i++) {
        for (let i = 0; i < climateProps.length; i++) {
          // @ts-ignore
          if (climateProps[i] !== 'date_time' && climateProps[i] !== 'wind_cardinal_direction_set_1d') {
            traces.push([
              {
                // @ts-ignore
                x: climateData['date_time'],
                // @ts-ignore
                y: climateData[climateProps[i]],
                type: 'scatter',
                mode: 'lines+markers',
              },
            ]);
          }
        }
        console.log(traces);
        createAppAtPos('right', traces, stationName);
      });
    });
  };

  return (
    <LeafletWrapper {...props}>
      <LayersControl.BaseLayer checked={s.baseLayer === 'OpenStreetMap'} name="OpenStreetMap">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stationData.map((data, index) => {
          return (
            <Marker key={index} position={[data.lat, data.lon]}>
              <Popup>
                <Button onClick={() => createAllCharts(data)} bg="red">
                  All Data
                </Button>
                <Button onClick={() => createChartTemplate(data)} bg="blue">
                  Chart Template
                </Button>
              </Popup>
            </Marker>
          );
        })}
      </LayersControl.BaseLayer>
    </LeafletWrapper>
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
