/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useRef, useState } from 'react';
import './styling.css';

// Chakra Imports
import {
  HStack,
  ButtonGroup,
  Tooltip,
  Button,
  useColorModeValue,
  Text,
  Center,
  VStack,
  Box,
  RadioGroup,
  Radio,
  Stack,
} from '@chakra-ui/react';

// SAGE3 imports
import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';
import { state as AppState } from './index';

import Arrow from './Arrow';

// Leaflet plus React
import * as esriLeafletGeocoder from 'esri-leaflet-geocoder';
import { TileLayer, LayersControl, Popup, CircleMarker, SVGOverlay } from 'react-leaflet';
import LeafletWrapper from './LeafletWrapper';

import { SensorTypes, stationDataTemplate } from './stationData';

// Import the CSS style sheet from the node_modules folder
import 'leaflet/dist/leaflet.css';
import { useStore } from './LeafletWrapper';

// Icon imports
import { MdOutlineZoomIn, MdOutlineZoomOut } from 'react-icons/md';
import { useParams } from 'react-router';

const convertToFahrenheit = (tempInCelcius: number) => {
  const tempInFahrenheit = Math.floor((tempInCelcius * 9) / 5 + 32);
  return tempInFahrenheit;
};

// Max and min zoom for leaflet app
const maxZoom = 18;
const minZoom = 1;

// HCDP app
function AppComponent(props: App): JSX.Element {
  // State and Store
  const s = props.data.state as AppState;

  const createApp = useAppStore((state) => state.create);
  const updateState = useAppStore((state) => state.updateState);

  const arrowRef = useRef<any>(null);

  // The map: any, I kown, should be Leaflet.Map but don't work
  const [map, setMap] = useState<any>();

  useEffect(() => {
    for (let i = 0; i < s.stationData.length; i++) {
      fetch(
        `https://api.mesowest.net/v2/stations/timeseries?STID=${s.stationData[i].name}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
      ).then((response) => {
        response.json().then((station) => {
          const tmpStation: any = s.stationData[i];
          if (station.STATION[0].OBSERVATIONS.soil_moisture_set_1 !== undefined) {
            tmpStation.soilMoisture = Math.floor(
              station.STATION[0].OBSERVATIONS.soil_moisture_set_1[station.STATION[0].OBSERVATIONS.soil_moisture_set_1.length - 1]
            );
          }
          if (station.STATION[0].OBSERVATIONS.wind_speed_set_1 !== undefined) {
            {
              tmpStation.windSpeed = Math.floor(
                station.STATION[0].OBSERVATIONS.wind_speed_set_1[station.STATION[0].OBSERVATIONS.wind_speed_set_1.length - 1]
              );
            }
          }
          if (station.STATION[0].OBSERVATIONS.wind_direction_set_1 !== undefined) {
            {
              tmpStation.windDirection = Math.floor(
                station.STATION[0].OBSERVATIONS.wind_direction_set_1[station.STATION[0].OBSERVATIONS.wind_direction_set_1.length - 1]
              );
            }
          }
          if (station.STATION[0].OBSERVATIONS.relative_humidity_set_1 !== undefined) {
            tmpStation.relativeHumidity = Math.floor(
              station.STATION[0].OBSERVATIONS.relative_humidity_set_1[station.STATION[0].OBSERVATIONS.relative_humidity_set_1.length - 1]
            );
          }
          if (station.STATION[0].OBSERVATIONS.air_temp_set_1 !== undefined) {
            tmpStation.temperatureC = Math.floor(
              station.STATION[0].OBSERVATIONS.air_temp_set_1[station.STATION[0].OBSERVATIONS.air_temp_set_1.length - 1]
            );
            tmpStation.temperatureF = convertToFahrenheit(
              Math.floor(station.STATION[0].OBSERVATIONS.air_temp_set_1[station.STATION[0].OBSERVATIONS.air_temp_set_1.length - 1])
            );
          }

          if (station.STATION[0].OBSERVATIONS.solar_radiation_set_1 !== undefined) {
            tmpStation.solarRadiation = Math.floor(
              station.STATION[0].OBSERVATIONS.solar_radiation_set_1[station.STATION[0].OBSERVATIONS.solar_radiation_set_1.length - 1]
            );
          }

          const tmpStationData = [...s.stationData];
          tmpStationData[tmpStationData.indexOf(station)] = tmpStation;
          updateState(props._id, { stationData: [...tmpStationData] });
        });
      });
    }
  }, []);
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

        datasets: [
          {
            label: climateProp,
            yDataName: climateProp,
            minYValue: 0,
            yAxisID: 'y',
            borderColor: 'rgb(244, 187, 68)',
            backgroundColor: 'rgb(244, 187, 68)',
            chartType: 'line',
          },
        ],
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

  // Creates an overview that shows the metadata of a station
  const createOverview = (stationName: string) => {
    const appPos = { x: props.data.position.x + props.data.size.width, y: props.data.position.y, z: 0 };
    createApp({
      title: '',
      roomId: props.data.roomId!,
      boardId: props.data.boardId!,
      position: appPos,
      size: { width: 1000, height: 1000, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'SensorOverview',
      state: { stationName: stationName },
      raised: true,
    });
  };

  // Change the variable to display on the map
  const handleChangeVariable = (variableName: string) => {
    updateState(props._id, { variableToDisplay: variableName });
  };

  const handleAddSelectedStation = (station: SensorTypes) => {
    const tmpArray = [...s.stationData];
    for (let i = 0; i < tmpArray.length; i++) {
      if (tmpArray[i] == station) {
        tmpArray[i].selected = !tmpArray[i].selected;
      }
    }
    updateState(props._id, { stationData: tmpArray });
  };

  return (
    <LeafletWrapper map={map} setMap={setMap} {...props}>
      <Box
        w="20rem"
        h="24rem"
        bg="gray.300"
        position="absolute"
        zIndex="999"
        color={'black'}
        top="2px"
        left="2px"
        border="10px"
        rounded={10}
        // margin="auto"
        padding="0 20px"
        fontWeight={'bold'}
        fontSize="xl"
      >
        <br />
        <RadioGroup onChange={handleChangeVariable} defaultValue={s.variableToDisplay} value={s.variableToDisplay}>
          <Stack direction="column">
            <Radio colorScheme="orange" value="temperatureC">
              <p style={{ fontSize: 30 }}>Temperature C</p>
            </Radio>
            <Radio size="lg" colorScheme="orange" value="temperatureF">
              <p style={{ fontSize: 30 }}>Temperature F</p>
            </Radio>
            <Radio size="lg" colorScheme="orange" value="soilMoisture">
              <p style={{ fontSize: 30 }}>Soil Moisture</p>
            </Radio>
            <Radio size="lg" colorScheme="orange" value="windSpeed">
              <p style={{ fontSize: 30 }}>Wind Speed</p>
            </Radio>
            <Radio size="lg" colorScheme="orange" value="relativeHumidity">
              <p style={{ fontSize: 30 }}>Relative Humidity</p>
            </Radio>
            <Radio size="lg" colorScheme="orange" value="solarRadiation">
              <p style={{ fontSize: 30 }}>Solar Radiation</p>
            </Radio>
          </Stack>
        </RadioGroup>
      </Box>
      <LayersControl.BaseLayer checked={s.baseLayer === 'OpenStreetMap'} name="OpenStreetMap">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {s.stationData.map((data: SensorTypes, index: number) => {
          return (
            <div key={index}>
              <CircleMarker
                key={index}
                center={{ lat: data.lat - 0.01, lng: data.lon }}
                fillColor={'rgb(244, 187, 68)'}
                stroke={false}
                fillOpacity={0}
                radius={(5 / s.zoom) * 50 + 15}
                eventHandlers={{
                  // mouseover: (e) => {
                  //   e.target.openPopup();
                  // },
                  click: (e) => {
                    handleAddSelectedStation(data);
                  },
                }}
              >
                {/* <Popup className="leaflet-content">
                  <Box textAlign={'center'} transform={'translate(0,-5rem)'} mb="3rem" pb="5rem" height="350px" width="300px">
                    <Center>
                      <VStack>
                        <Text fontSize={'30px'} fontWeight="bold">
                          Station: {data.name}
                        </Text>
                        <Button
                          onClick={() => createOverview(data.name)}
                          color="gray.700"
                          colorScheme="blue"
                          w={'50'}
                          h={'20'}
                          fontSize={'4xl'}
                        >
                          Overview
                        </Button>
                        <Button
                          onClick={() => createAllCharts(data)}
                          color="gray.700"
                          colorScheme="blue"
                          w={'70'}
                          h={'20'}
                          fontSize={'4xl'}
                        >
                          All Data
                        </Button>
                        <Button
                          w={'50'}
                          h={'20'}
                          fontSize={'4xl'}
                          onClick={() => createChartTemplate(data)}
                          color="gray.700"
                          colorScheme="blue"
                        >
                          Template
                        </Button>
                      </VStack>
                    </Center>
                  </Box>
                </Popup> */}
              </CircleMarker>

              <SVGOverlay
                bounds={[
                  [data.lat - 0.17, data.lon - 0.05],
                  [data.lat + 0.15, data.lon + 0.05],
                  // [data.lat - 0.17, data.lon - 0.05],
                  // [data.lat + 0.17, data.lon + 0.05],
                ]}
              >
                {s.variableToDisplay === 'windSpeed' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
                    {data['windDirection'] == 0 ? null : (
                      <g
                        ref={arrowRef}
                        fill="white"
                        transform={`translate(100, 100) scale(2) translate(-100, -100) rotate(${data['windDirection'] + 180},100,100)`}
                      >
                        <Arrow degree={data['windDirection']} />

                        {/* <polygon points="80,130 100,60 120,130 100,125" fill="black" /> */}
                      </g>
                    )}
                    <g transform={`translate(100, 100) scale(2) translate(-100, -100)`}>
                      <circle cx="100" cy="100" r="20" fill={'#E1BB78'} stroke={data.selected ? '#FC03DE' : 'black'} strokeWidth="3" />

                      <text x="100" y="100" alignmentBaseline="middle" textAnchor="middle" fill="black">
                        {data[s.variableToDisplay]}
                      </text>
                    </g>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
                    <g transform={`translate(100, 100) scale(2) translate(-100, -100)`}>
                      <circle cx="100" cy="100" r="20" fill={'#E1BB78'} stroke={data.selected ? '#FC03DE' : 'black'} strokeWidth="3" />
                      <text x="100" y="100" alignmentBaseline="middle" textAnchor="middle" fill="black">
                        {data[s.variableToDisplay]}
                      </text>
                    </g>
                  </svg>
                )}
              </SVGOverlay>
            </div>
          );
        })}
      </LayersControl.BaseLayer>
    </LeafletWrapper>
  );
}

const hawaiiLatLngCoordinates = [
  {
    name: 'Kauai',
    lat: 22.05809405806077,
    lng: -159.5064180703451,
    zoom: 11,
  },
  {
    name: 'Honolulu',
    lat: 21.474661068505032,
    lng: -157.9658777888294,
    zoom: 11,
  },
  {
    name: 'Maui',
    lat: 20.804509245368596,
    lng: -156.31157458227207,
    zoom: 11,
  },
  {
    name: 'Big Island',
    lat: 19.617391599674416,
    lng: -155.48167943875694,
    zoom: 10,
  },
];

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const [addrValue, setAddrValue] = useState('');
  const map = useStore((state: any) => state.map[props._id]);
  const update = useAppStore((state) => state.update);
  // BoardInfo
  const { boardId, roomId } = useParams();
  const createApp = useAppStore((state) => state.create);

  const background = useColorModeValue('gray.50', 'gray.700');

  const apiKey = 'AAPK74760e71edd04d12ac33fd375e85ba0d4CL8Ho3haHz1cOyUgnYG4UUEW6NG0xj2j1qsmVBAZNupoD44ZiSJ4DP36ksP-t3B';
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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

  const handleChangePosition = (location: any) => {
    updateState(props._id, { location: [location.lat, location.lng] });
  };

  const handleCreateDashboard = () => {
    const listOfSelectedStations = [];
    for (let i = 0; i < s.stationData.length; i++) {
      if (s.stationData[i].selected) {
        listOfSelectedStations.push(s.stationData[i].name);
      }
    }
    console.log(listOfSelectedStations);
    createApp({
      title: 'SensorOverview',
      roomId: roomId!,
      boardId: boardId!,
      position: { x: props.data.position.x + props.data.size.width * 1 + 20, y: props.data.position.y, z: 0 },
      size: { width: 1000, height: 1000, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'SensorOverview',
      state: {
        listOfStationNames: listOfSelectedStations,
        widgetsEnabled: [
          { visualizationType: 'variableCard', yAxisNames: ['wind_speed_set_1'], xAxisNames: [''], layout: { x: 0, y: 0, w: 11, h: 130 } },
          {
            visualizationType: 'variableCard',
            yAxisNames: ['relative_humidity_set_1'],
            xAxisNames: [''],
            layout: { x: 0, y: 0, w: 11, h: 130 },
          },
          { visualizationType: 'variableCard', yAxisNames: ['air_temp_set_1'], xAxisNames: [''], layout: { x: 0, y: 0, w: 11, h: 130 } },
          {
            visualizationType: 'line',
            yAxisNames: ['soil_moisture_set_1'],
            xAxisNames: ['date_time'],
            layout: { x: 0, y: 0, w: 11, h: 130 },
          },
        ],
      },
      raised: true,
    });
  };

  return (
    <HStack>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        {hawaiiLatLngCoordinates.map((location, index) => {
          return (
            <Tooltip key={index} placement="top-start" hasArrow={true} label={location.name} openDelay={400}>
              <Button onClick={() => handleChangePosition(location)} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
                {location.name}
              </Button>
            </Tooltip>
          );
        })}
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Zoom In'} openDelay={400}>
          <Button isDisabled={s.zoom >= 18} onClick={incZoom} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdOutlineZoomIn fontSize="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Zoom Out'} openDelay={400}>
          <Button isDisabled={s.zoom <= 9} onClick={decZoom} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdOutlineZoomOut fontSize="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <Button onClick={handleCreateDashboard} size="xs" colorScheme={'green'}>
        Create Dashboard
      </Button>
    </HStack>
  );
}

export default { AppComponent, ToolbarComponent };
