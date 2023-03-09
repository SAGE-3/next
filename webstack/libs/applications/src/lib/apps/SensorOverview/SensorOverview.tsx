/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore } from '@sage3/frontend';
import { Box, Button, Container, Select, Spinner } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { ChangeEvent, useEffect, useState } from 'react';

/* App component for Sensor Overview */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);
  const [singularSensorData, setSingularSensorData] = useState({} as any);

  useEffect(() => {
    // Fetch from the Mesonet website. Will change to HCDP database when website is ready
    fetch(
      `https://api.mesowest.net/v2/stations/timeseries?STID=${s.stationName}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
    ).then((response) => {
      response.json().then(async (sensor) => {
        const sensorData = sensor['STATION'][0];
        console.log(sensorData);
        setSingularSensorData(sensorData);
      });
    });
  }, [s.stationName]);

  return (
    <AppWindow app={props}>
      <Box p={'1rem'} w="100%" bg="white" color="black" h="100%">
        {Object.keys(singularSensorData).length > 0 ? (
          Object.keys(singularSensorData).map((sensor) => {
            if (typeof singularSensorData[sensor] !== 'object') {
              return (
                <div>
                  <h2>
                    <strong>{sensor}:</strong> {singularSensorData[sensor]}
                  </h2>
                </div>
              );
            } else {
              return null;
            }
          })
        ) : (
          <Spinner
            w={Math.min(props.data.size.height / 2, props.data.size.width / 2)}
            h={Math.min(props.data.size.height / 2, props.data.size.width / 2)}
            thickness="20px"
            speed="0.30s"
            emptyColor="gray.200"
          />
        )}
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app Sensor Overview */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const [stations, setStations] = useState<any[]>([]);

  const handleChangeSensor = (e: ChangeEvent<HTMLSelectElement>) => {
    updateState(props._id, { stationName: e.target.value });
  };

  useEffect(() => {
    for (let i = 0; i < stationData.length; i++) {
      console.log(stationData[i].name, s.stationName);
      fetch(
        `https://api.mesowest.net/v2/stations/timeseries?STID=${stationData[i].name}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
      ).then((response) => {
        response.json().then(async (sensor) => {
          console.log(sensor);
          const sensorData = sensor['STATION'][0];
          setStations((stations) => [...stations, sensorData]);
          console.log(sensorData);
        });
      });
    }
  }, []);

  return (
    <>
      <Select
        borderWidth="1px"
        borderRadius="lg"
        size="xs"
        mx="1rem"
        w="10rem"
        borderColor={'gray.400'}
        backgroundColor={'white'}
        color="black"
        name="yAxis"
        placeholder={'Choose Sensor'}
        onChange={handleChangeSensor}
      >
        {stations.map((station: any, index: number) => {
          return (
            <option key={index} value={station.STID}>
              {station.NAME}
            </option>
          );
        })}
      </Select>
    </>
  );
}

export default { AppComponent, ToolbarComponent };

type SensorTypes = {
  lat: number;
  lon: number;
  name: string;
  temperatureC: number;
  temperatureF: number;

  soilMoisture: number;
  relativeHumidity: number;
  windSpeed: number;
  solarRadiation: number;
  windDirection: number;
};

// For now, this is hard-coded. Will change when HCDP is ready.
const stationData: SensorTypes[] = [
  {
    lat: 20.8415,
    lon: -156.2948,
    name: '017HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
  {
    lat: 20.7067,
    lon: -156.3554,
    name: '016HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
  {
    lat: 20.7579,
    lon: -156.32,
    name: '001HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
  {
    lat: 20.7598,
    lon: -156.2482,
    name: '002HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
  {
    lat: 20.7382,
    lon: -156.2458,
    name: '013HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
  {
    lat: 20.7104,
    lon: -156.2567,
    name: '003HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
  {
    lat: 19.6974,
    lon: -155.0954,
    name: '005HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
  {
    lat: 19.964,
    lon: -155.25,
    name: '006HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
  {
    lat: 19.932,
    lon: -155.291,
    name: '007HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
  {
    lat: 19.748,
    lon: -155.996,
    name: '008HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
  {
    lat: 19.803,
    lon: -155.851,
    name: '009HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
  {
    lat: 19.73,
    lon: -155.87,
    name: '010HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
  {
    lat: 21.333,
    lon: -157.8025,
    name: '011HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
  {
    lat: 21.3391,
    lon: -157.8369,
    name: '012HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
  {
    lat: 22.2026,
    lon: -159.5188,
    name: '014HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
  {
    lat: 22.1975,
    lon: -159.421,
    name: '015HI',
    temperatureC: 0,
    temperatureF: 0,
    soilMoisture: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    solarRadiation: 0,
    windDirection: 0,
  },
];
