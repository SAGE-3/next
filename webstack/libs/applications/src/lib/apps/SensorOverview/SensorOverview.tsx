/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore } from '@sage3/frontend';
import { Box, Button, Spinner } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { useEffect, useState } from 'react';

/* App component for Sensor Overview */

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

const stationName = '017HI';

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);
  const [sensorData, setSensorData] = useState({} as any);

  useEffect(() => {
    // Fetch from the Mesonet website. Will change to HCDP database when website is ready
    fetch(
      `https://api.mesowest.net/v2/stations/timeseries?STID=${stationName}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
    ).then((response) => {
      response.json().then(async (sensor) => {
        const sensorData = sensor['STATION'][0];
        setSensorData(sensorData);
      });
    });
  }, []);

  return (
    <AppWindow app={props}>
      <>
        {Object.keys(sensorData).length > 0 ? (
          Object.keys(sensorData).map((sensor) => {
            if (typeof sensorData[sensor] !== 'object') {
              return (
                <div>
                  <h2>
                    <strong>{sensor}:</strong> {sensorData[sensor]}
                  </h2>
                </div>
              );
            } else {
              return null;
            }
          })
        ) : (
          <Spinner
            w={Math.min(props.data.size.height, props.data.size.width)}
            h={Math.min(props.data.size.height, props.data.size.width)}
            thickness="100px"
            speed="0.30s"
            emptyColor="gray.200"
            size="xl"
          />
        )}
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app Sensor Overview */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
      <Button colorScheme="green">Action</Button>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
