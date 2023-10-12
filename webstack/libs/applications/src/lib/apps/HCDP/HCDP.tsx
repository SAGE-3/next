/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import './styling.css';

// Chakra Imports
import { HStack, ButtonGroup, Tooltip, Button, useColorModeValue, useDisclosure } from '@chakra-ui/react';

// SAGE3 imports
import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';
import { state as AppState } from './index';
import { MdAdd, MdMinimize } from 'react-icons/md';

// Leaflet plus React
import * as esriLeafletGeocoder from 'esri-leaflet-geocoder';
// Import the CSS style sheet from the node_modules folder
import 'leaflet/dist/leaflet.css';

// Icon imports
import { MdOutlineZoomIn, MdOutlineZoomOut } from 'react-icons/md';
import { useParams } from 'react-router';
import { AppWindow } from '@sage3/applications/apps';

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

  const updateState = useAppStore((state) => state.updateState);

  // The map: any, I kown, should be Leaflet.Map but don't work
  const [map, setMap] = useState<any>();
  const [, setStationMetadata] = useState([]);

  useEffect(() => {
    const fetchStationData = async () => {
      const tmpStationData = [...s.stationData];
      for (let i = 0; i < s.stationData.length; i++) {
        const repsonse = await fetch(
          `https://api.mesowest.net/v2/stations/timeseries?STID=${s.stationData[i].name}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
        );
        const station = await repsonse.json();
        const tmpStation: any = s.stationData[i];
        if (station.STATION[0].OBSERVATIONS.soil_moisture_set_1 !== undefined) {
          const soilMoisture = station.STATION[0].OBSERVATIONS.soil_moisture_set_1;
          tmpStation.soilMoisture = Math.floor(soilMoisture[soilMoisture.length - 1]);
        }
        if (station.STATION[0].OBSERVATIONS.wind_speed_set_1 !== undefined) {
          const windSpeed = station.STATION[0].OBSERVATIONS.wind_speed_set_1;
          tmpStation.windSpeed = Math.floor(windSpeed[windSpeed.length - 1]);
        }
        if (station.STATION[0].OBSERVATIONS.wind_direction_set_1 !== undefined) {
          const windDirection = station.STATION[0].OBSERVATIONS.wind_direction_set_1;
          tmpStation.windDirection = Math.floor(windDirection[windDirection.length - 1]);
        }
        if (station.STATION[0].OBSERVATIONS.air_temp_set_1 !== undefined) {
          const airTemp = station.STATION[0].OBSERVATIONS.air_temp_set_1;
          const tempInFahrenheit = convertToFahrenheit(Math.floor(airTemp[airTemp.length - 1]));
          const tempInCelcius = Math.floor(airTemp[airTemp.length - 1]);
          tmpStation.temperatureF = tempInFahrenheit;
          tmpStation.temperatureC = tempInCelcius;
        }
        if (station.STATION[0].OBSERVATIONS.relative_humidity_set_1 !== undefined) {
          const relativeHumidity = station.STATION[0].OBSERVATIONS.relative_humidity_set_1;
          tmpStation.relativeHumidity = Math.floor(relativeHumidity[relativeHumidity.length - 1]);
        }
        if (station.STATION[0].OBSERVATIONS.solar_radiation_set_1 !== undefined) {
          const solarRadiation = station.STATION[0].OBSERVATIONS.solar_radiation_set_1;
          tmpStation.solarRadiation = Math.floor(solarRadiation[solarRadiation.length - 1]);
        }
        tmpStationData[tmpStationData.indexOf(station)] = tmpStation;
        setStationMetadata(station);
      }
      updateState(props._id, { stationData: [...tmpStationData] });
    };
    fetchStationData();
  }, []);

  // Change the variable to display on the map
  const handleChangeVariable = (variableName: string) => {
    updateState(props._id, { variableToDisplay: variableName });
  };

  return (
    <AppWindow app={props}>
      <></>
    </AppWindow>
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
  // BoardInfo
  const { boardId, roomId } = useParams();
  const createApp = useAppStore((state) => state.create);

  const { isOpen, onOpen, onClose } = useDisclosure();

  const background = useColorModeValue('gray.50', 'gray.700');

  const apiKey = 'AAPK74760e71edd04d12ac33fd375e85ba0d4CL8Ho3haHz1cOyUgnYG4UUEW6NG0xj2j1qsmVBAZNupoD44ZiSJ4DP36ksP-t3B';
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const geocoder = new esriLeafletGeocoder.geocode({
    apikey: apiKey,
  });

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
    createApp({
      title: 'Hawaii Mesonet',
      roomId: roomId!,
      boardId: boardId!,
      position: { x: props.data.position.x + props.data.size.width * 1 + 20, y: props.data.position.y, z: 0 },
      size: { width: 1000, height: 1000, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'Hawaii Mesonet',
      state: {
        listOfStationNames: listOfSelectedStations,
        widget: {
          visualizationType: 'variableCard',
          yAxisNames: ['wind_speed_set_1'],
          xAxisNames: [''],
          layout: { x: 0, y: 0, w: 11, h: 130 },
        },
      },
      raised: true,
      dragging: false,
    });
  };

  const handleChangeToMesonetData = () => {
    updateState(props._id, { getDataFrom: 'mesonet' });
  };

  const handleChangeToHcdpData = () => {
    updateState(props._id, { getDataFrom: 'hcdp' });
  };

  const incremenetStationScale = () => {
    updateState(props._id, { stationScale: s.stationScale + 1 });
  };

  const decrementStationScale = () => {
    updateState(props._id, { stationScale: s.stationScale - 1 });
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

      {/**TODO uncomment this when showing the HCDP datasets */}
      {/* <Button size="xs" onClick={handleChangeToMesonetData} colorScheme={'yellow'}>
        Mesonet
      </Button> */}
      {/* <Button size="xs" onClick={handleChangeToHcdpData} colorScheme={'yellow'}>
        hcdp
      </Button> */}
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

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Increase Station Size'} openDelay={400}>
          <Button isDisabled={s.stationScale > 4} onClick={incremenetStationScale} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdAdd fontSize="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Decrease Station Size'} openDelay={400}>
          <Button isDisabled={s.stationScale <= 1} onClick={decrementStationScale} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdMinimize fontSize="16px" style={{ transform: 'translate(0px, -5px)' }} />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <Button colorScheme={'green'} size="xs" onClick={onOpen}>
        Create Visualization
      </Button>
    </HStack>
  );
}
/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
