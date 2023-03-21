/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore } from '@sage3/frontend';
import { Box, Button, Container, HStack, Text, Spinner, useColorModeValue, GridItem, Grid, Wrap, WrapItem } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { ChangeEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import VariableCard from './VariableCard';

/* App component for Sensor Overview */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);
  const [singularSensorData, setSingularSensorData] = useState({} as any);
  const [stationMetadata, setStationMetadata] = useState([]);
  const createApp = useAppStore((state) => state.create);
  // BoardInfo
  const { boardId, roomId } = useParams();

  const bgColor = useColorModeValue('gray.100', 'gray.900');
  const sc = useColorModeValue('gray.400', 'gray.200');
  const textColor = useColorModeValue('gray.700', 'gray.100');

  useEffect(() => {
    const fetchStationData = async () => {
      const tmpStationMetadata: any = [];

      for (let i = 0; i < s.listOfStationNames.length; i++) {
        // Fetch from the Mesonet website. Will change to HCDP database when website is ready
        await fetch(
          `https://api.mesowest.net/v2/stations/timeseries?STID=${s.listOfStationNames[i]}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
        ).then((response) => {
          response.json().then(async (sensor) => {
            const sensorData = sensor['STATION'][0];
            tmpStationMetadata.push(sensorData);
          });
        });
      }
      return tmpStationMetadata;
    };
    fetchStationData().then((data) => {
      setStationMetadata(data);
    });
    console.log('I am CAlled');
  }, []);

  return (
    <AppWindow app={props}>
      <Box overflowY="scroll" p={'1rem'} bg={bgColor} h="100%">
        {stationMetadata.length > 0 ? (
          stationMetadata.map((station, index) => {
            return (
              <Box bgColor={bgColor} color={textColor} fontSize="lg" key={index} p="1rem" border="solid black 1px">
                <Text textAlign="center" fontSize={'4rem'}>
                  {station['NAME']}
                </Text>
                <HStack>
                  <Box>
                    <Box h="25rem" w={props.data.size.width / 2} border="black solid 1px">
                      <Text textAlign="center">This is where the leaflet map is going</Text>
                    </Box>
                    <Box p="1rem" h="10rem" w={props.data.size.width / 4} border="solid black 1px">
                      <HStack>
                        <Box>
                          <Text>
                            <strong>Island: </strong>
                          </Text>
                          <Text>
                            <strong>Status: </strong>
                          </Text>
                          <Text>
                            <strong>Elevation: </strong>
                          </Text>
                          <Text>
                            <strong>Latitude: </strong>
                          </Text>
                          <Text>
                            <strong>Longitude: </strong>
                          </Text>
                        </Box>
                        <Box>
                          <Text> &nbsp; {station['COUNTY']}</Text>
                          <Text> &nbsp; {station['STATUS']}</Text>
                          <Text> &nbsp; {station['ELEVATION']}</Text>
                          <Text> &nbsp; {station['LATITUDE']}</Text>
                          <Text>{station['LONGITUDE']}</Text>
                        </Box>
                      </HStack>
                    </Box>
                  </Box>

                  <Box>
                    <Wrap>
                      {Object.keys(station['OBSERVATIONS']).map((variableName, index) => {
                        const observations: any = station['OBSERVATIONS'];
                        return (
                          <WrapItem>
                            <VariableCard
                              variableName={variableName}
                              variableValue={station['OBSERVATIONS'][variableName][observations[variableName].length - 1]}
                              stationName={station['STID']}
                              appPos={{
                                x: props.data.position.x + props.data.size.width * 1 + 20,
                                y: props.data.position.y,
                                z: 0,
                              }}
                            />
                            {/* // <h2>
                            //   <strong>{variableName}: </strong>{' '}
                            //   {station['OBSERVATIONS'][variableName][observations[variableName].length - 1]}
                            // </h2>
                            //{' '} */}
                          </WrapItem>
                        );
                      })}
                    </Wrap>
                  </Box>
                </HStack>
              </Box>
            );
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
        {/* {Object.keys(singularSensorData).length > 0 ? (
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
        )} */}
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app Sensor Overview */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return <></>;
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
