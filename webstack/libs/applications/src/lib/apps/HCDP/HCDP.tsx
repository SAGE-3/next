/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState } from 'react';

// Chakra Imports
import { HStack, InputGroup, Input, ButtonGroup, Tooltip, Button, useColorModeValue, Text, Center, VStack, Box } from '@chakra-ui/react';

// SAGE3 imports
import { useAppStore, useHexColor } from '@sage3/frontend';
import { App, AppSchema } from '../../schema';
import { state as AppState } from './index';

// Leaflet plus React
import * as Leaflet from 'leaflet';
import * as esriLeafletGeocoder from 'esri-leaflet-geocoder';
import { TileLayer, LayersControl, Popup, CircleMarker } from 'react-leaflet';
import LeafletWrapper from './LeafletWrapper';

// Import the CSS style sheet from the node_modules folder
import 'leaflet/dist/leaflet.css';

// Store imports
import create from 'zustand';

// Icon imports
import { MdAdd, MdMap, MdOutlineZoomIn, MdOutlineZoomOut, MdRemove, MdTerrain } from 'react-icons/md';

// Zustand store to communicate with toolbar
export const useStore = create((set: any) => ({
  map: {} as { [key: string]: Leaflet.Map },
  saveMap: (id: string, map: Leaflet.Map) => set((state: any) => ({ map: { ...state.map, ...{ [id]: map } } })),
}));

// Get a URL for an asset
export function getStaticAssetUrl(filename: string): string {
  return `api/assets/static/${filename}`;
}

// Max and min zoom for leaflet app
const maxZoom = 18;
const minZoom = 1;

// For now, this is hard-coded. Will change when HCDP is ready.
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

// HCDP app
function AppComponent(props: App): JSX.Element {
  // State and Store
  const s = props.data.state as AppState;

  const createApp = useAppStore((state) => state.create);
  const updateState = useAppStore((state) => state.updateState);

  // Function to generate charts either for createAllCharts, or createChartTemplate
  const createChart = (appPos: { x: number; y: number; z: number }, stationName: string, axisTitle: string, climateProp: string) => {
    const app = createApp({
      title: '',
      roomId: props.data.roomId!,
      boardId: props.data.boardId!,
      position: appPos,
      size: { width: 4000, height: 600, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'ChartGenerator',
      state: {
        labelName: 'date_time',
        fontSizeMultiplier: 15,
        datasets: [{ yDataName: climateProp, chartType: 'line' }],
        url: `https://api.mesowest.net/v2/stations/timeseries?STID=${stationName}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`,
      },
      raised: true,
    });
    return app;
  };
  // This function will fetch the HCDP data and create a chart for each property available
  const createAllCharts = (data: { lat: number; lon: number; name: string }) => {
    const stationName = data.name;
    let climateData: any[] = []; // TODO, change to climate schema when HCDP is ready
    let appPos = { x: props.data.position.x, y: props.data.position.y, z: 0 };

    // Fetch from the Mesonet website. Will change to HCDP database when website is ready
    fetch(
      `https://api.mesowest.net/v2/stations/timeseries?STID=${stationName}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
    ).then((response) => {
      response.json().then(async (station) => {
        climateData = station['STATION'][0]['OBSERVATIONS'];
        const climateProps = Object.keys(climateData); // Create an array will all properties

        // Remove indices that are NOT quantiative, date_time, wind_cardinal_direction_set_1, and wind_cardinal_direction_set_1d
        const indexOfDate_Time = climateProps.indexOf('date_time');
        if (indexOfDate_Time !== -1) {
          climateProps.splice(indexOfDate_Time, 1);
        }
        const indexOfWind_Direction_set_1 = climateProps.indexOf('wind_cardinal_direction_set_1');
        if (indexOfWind_Direction_set_1 !== -1) {
          climateProps.splice(indexOfWind_Direction_set_1, 1);
        }
        const indexOfWind_Direction_set_1d = climateProps.indexOf('wind_cardinal_direction_set_1d');
        if (indexOfWind_Direction_set_1d !== -1) {
          climateProps.splice(indexOfWind_Direction_set_1d, 1);
        }
        const appIds = [];

        // Loop through climate properties and create a chart for each property
        for (let i = 0; i < climateProps.length; i++) {
          let axisTitle = climateProps[i];

          // Used for creating title of axis
          const words = axisTitle.split('_');
          const removeTheseWords = (wordsToRemove: string[], words: string[]) => {
            for (let i = 0; i < wordsToRemove.length; i++) {
              const indexOfWord = words.indexOf(wordsToRemove[i]);
              if (indexOfWord > -1) {
                words.splice(indexOfWord, 1);
              }
            }
          };
          removeTheseWords(['set', '1', '2', '3'], words);
          axisTitle = words.join(' '); // Axis title created

          // Layout the apps in a Stacked Position
          appPos = {
            x: props.data.position.x,
            y: props.data.size.height + props.data.position.y + 600 * i,
            z: 0,
          };

          const appId = await createChart(appPos, stationName, axisTitle, climateProps[i]);
          appIds.push(appId.data._id);
        }
        updateState(props._id, { appIdsICreated: appIds });
      });
    });
  };

  // TODO: Can delete? Fow now, only used to create app to the right of HCDP app
  const createAppAtPos = (whereToCreateApp: string, stationName: string): void => {
    let appPos = { x: props.data.position.x, y: props.data.position.y, z: 0 };

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
    createChart(appPos, stationName, '', '');
  };

  // Create a blank customizable chart
  const createChartTemplate = (data: { lat: number; lon: number; name: string }) => {
    let climateData: any[] = [];
    const stationName = data.name;

    fetch(
      `https://api.mesowest.net/v2/stations/timeseries?STID=${stationName}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
    ).then((response) => {
      response.json().then((station) => {
        climateData = station['STATION'][0]['OBSERVATIONS'];

        createAppAtPos('right', stationName);
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
          const height = 1;
          const width = height * 0.73;
          return (
            <CircleMarker
              key={index}
              center={{ lat: data.lat, lng: data.lon }}
              fillColor="rgb(244, 187, 68)"
              // weight={100}
              // fill={true}
              fillOpacity={0.5}
              radius={(3 / s.zoom) * 50}
              eventHandlers={{
                mouseover: (e) => {
                  e.target.openPopup();
                },
              }}
            >
              <Popup className="leaflet-content">
                <Box textAlign={'center'} mb="1rem" height="250px">
                  <Center>
                    <VStack>
                      <Text fontSize={'30px'} fontWeight="bold">
                        Station: {data.name}
                      </Text>
                      <Button
                        onClick={() => createAllCharts(data)}
                        color="gray.700"
                        colorScheme="blue"
                        w={'40'}
                        h={'10'}
                        fontSize={'3xl'}
                        mx="1"
                      >
                        All Data
                      </Button>
                      <Button
                        w={'40'}
                        h={'10'}
                        fontSize={'3xl'}
                        onClick={() => createChartTemplate(data)}
                        color="gray.700"
                        colorScheme="blue"
                      >
                        Template
                      </Button>
                    </VStack>
                  </Center>
                </Box>
              </Popup>
            </CircleMarker>
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

  const incrementFontSizeOfCreatedApps = () => {
    updateState(props._id, { fontSizeMultiplier: s.fontSizeMultiplier + 1 });
    s.appIdsICreated.forEach((appId) => {
      updateState(appId, { fontSizeMultiplier: s.fontSizeMultiplier + 1 });
    });
  };

  const decrementFontSizeOfCreatedApps = () => {
    updateState(props._id, { fontSizeMultiplier: s.fontSizeMultiplier - 1 });

    s.appIdsICreated.forEach((appId) => {
      updateState(appId, { fontSizeMultiplier: s.fontSizeMultiplier - 1 });
    });
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
            <MdOutlineZoomIn fontSize="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Zoom Out'} openDelay={400}>
          <Button isDisabled={s.zoom <= 1} onClick={decZoom} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdOutlineZoomOut fontSize="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size of Created Charts'} openDelay={400}>
          <Button onClick={incrementFontSizeOfCreatedApps} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdAdd fontSize="16px" />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size of Created Charts'} openDelay={400}>
          <Button onClick={decrementFontSizeOfCreatedApps} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdRemove fontSize="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </HStack>
  );
}

export default { AppComponent, ToolbarComponent };
