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
import { HStack } from '@chakra-ui/react';

// SAGE3 imports
import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';
import { state as AppState } from './index';

import MapLibreWrapper from './MapLibreWrapper';

// Import the CSS style sheet from the node_modules folder
import 'leaflet/dist/leaflet.css';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import * as plotty from 'plotty';
import { fromUrl } from 'geotiff';

import { AppWindow } from '@sage3/applications/apps';

const convertToFahrenheit = (tempInCelcius: number) => {
  const tempInFahrenheit = Math.floor((tempInCelcius * 9) / 5 + 32);
  return tempInFahrenheit;
};

// HCDP app
function AppComponent(props: App): JSX.Element {
  // State and Store
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);

  const [, setStationMetadata] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const url = '/assets/HCDPTestData.tif';

      const tiff = await fromUrl(url);
      const image = await tiff.getImage();
      const data = await image.readRasters();
      const resolution = image.getResolution();
      const bbox = image.getBoundingBox();
      const { width, height } = data;
      const tiepoint = image.getTiePoints()[0];
      const [, yScale] = image.getFileDirectory().ModelPixelScale;

      const HCDPData = {
        nCols: width,
        nRows: height,
        xllCorner: tiepoint.x,
        yllCorner: tiepoint.y - height * yScale,
        cellXSize: resolution[0],
        cellYSize: resolution[1],
      };
    };
    fetchData();
  }, []);

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
      <MapLibreWrapper {...props} />
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

  return <HStack></HStack>;
}
/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
