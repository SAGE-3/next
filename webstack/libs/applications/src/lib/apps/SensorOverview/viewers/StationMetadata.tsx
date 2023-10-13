/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Box, Text, Icon, useColorMode } from '@chakra-ui/react';

<<<<<<<< HEAD:webstack/libs/applications/src/lib/apps/HCDP/viewers/StationMetadata.tsx
import { Box, Text, Icon, useColorMode } from '@chakra-ui/react';

========
>>>>>>>> dev:webstack/libs/applications/src/lib/apps/SensorOverview/viewers/StationMetadata.tsx
import { AppState } from '@sage3/applications/schema';
import { MdCircle } from 'react-icons/md';

type VariableProps = {
  stationName: string;
  stationSTIDName: string;
  color: string;
};

export default function StationMetadata(
  props: {
    isLoaded: boolean;
    stationNames: string[];
    stationMetadata: any;
    size?: { width: number; height: number; depth: number };
  } & { state: AppState }
) {
  const [, setVariablesToDisplay] = useState<VariableProps[]>([]);

  useEffect(() => {
    const values: VariableProps[] = [];
    setVariablesToDisplay(values);
  }, [JSON.stringify(props.stationMetadata), JSON.stringify(props.state.widget)]);

  return (
    <>
      {props.size ? (
        <Box
          display="flex"
          flexWrap="wrap"
          alignItems="center"
          flexDirection={'row'}
          justifyContent="center"
          alignContent={'center'}
          justifyItems={'center'}
        >
          <Content
            isLoaded={props.isLoaded}
            stationMetadata={props.stationMetadata[0]}
            size={props.size ? props.size : { width: 0, height: 0, depth: 0 }}
          />
        </Box>
      ) : (
        <Box display="flex" flexDirection={'row'} justifyContent="center" alignContent={'center'} justifyItems={'center'}>
          <Content
            isLoaded={props.isLoaded}
            stationMetadata={props.stationMetadata[0]}
            size={props.size ? props.size : { width: 820, height: 250, depth: 0 }}
          />
<<<<<<<< HEAD:webstack/libs/applications/src/lib/apps/HCDP/viewers/StationMetadata.tsx
========
          {/* <Content
            isLoaded={props.isLoaded}
            stationNames={props.stationNames}
            variableToDisplayLength={0}
            s={s}
            size={{ width: 800, height: 590, depth: 0 }}
            timeSinceLastUpdate={props.timeSinceLastUpdate}
            variable={
              variablesToDisplay[0]
                ? variablesToDisplay[0]
                : {
                    variableName: 'air_temperature_set_1',
                    stationName: 'Station Name',
                    value: 42.01,
                    average: 38.42,
                    stdDev: 12,
                    high: 82,
                    low: 12,
                    unit: 'unit',
                    color: '#fff321',
                    startDate: props.startDate,
                    stationSTIDName: 'HI012',
                    endDate: '2022-04-25T19:55:00Z',
                  }
            }
          /> */}
>>>>>>>> dev:webstack/libs/applications/src/lib/apps/SensorOverview/viewers/StationMetadata.tsx
        </Box>
      )}
    </>
  );
}

const Content = (props: { isLoaded: boolean; stationMetadata: any; size: { width: number; height: number; depth: number } }) => {
  const [date, setDate] = useState(new Date());
  const [scaleToFontSize, setScaleToFontSize] = useState(100);
  const { colorMode } = useColorMode();

  function refreshClock() {
    setDate(new Date());
  }
  useEffect(() => {
    const timerId = setInterval(refreshClock, 1000);
    return function cleanup() {
      clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    if (props.size.width < props.size.height) {
      setScaleToFontSize(props.size.width);
    } else {
      setScaleToFontSize(props.size.height);
    }
  }, [JSON.stringify(props.size)]);

  return (
    <Box
      position="relative"
      boxShadow="lg"
      p="1rem"
      w={props.size.width}
      h={props.size.height}
      borderRadius="24"
      backgroundColor={colorMode === 'light' ? '#fff' : '#222'}
      display="flex"
      flexDir={'row'}
      justifyContent={'space-evenly'}
      alignContent={'center'}
    >
      <Icon
        fontSize={scaleToFontSize / 8}
        color={props.stationMetadata ? (props.stationMetadata.STATUS === 'ACTIVE' ? '#3BC472' : '#C43B8D') : 'white'}
        as={MdCircle}
        position="absolute"
        top="1rem"
        left="1rem"
      />
      <Box display={'flex'}>
        <Box px="2rem" display="flex" flexDir="column" justifyContent={'center'}>
          <Box>
            <Text fontSize={scaleToFontSize / 5}>{props.stationMetadata ? props.stationMetadata.NAME : null}</Text>
            <Box display={'flex'}>
              <Box display={'flex'} flexDir={'column'} fontSize={scaleToFontSize / 15}>
                <Text>
                  <span style={{ fontWeight: 'bold' }}> Island:</span>&nbsp;
                </Text>
                <Text>
                  <span style={{ fontWeight: 'bold' }}> Elevation:</span>&nbsp;
                </Text>
                <Text>
                  <span style={{ fontWeight: 'bold' }}> Longitude:</span> &nbsp;
                </Text>
                <Text>
                  <span style={{ fontWeight: 'bold' }}> Latitude:</span>&nbsp;
                </Text>
              </Box>
              <Box display={'flex'} flexDir={'column'} textAlign={'right'} fontFamily={'monospace'} fontSize={scaleToFontSize / 15}>
                <Text fontFamily={'body'}>{props.stationMetadata ? props.stationMetadata.COUNTY : null}</Text>
                <Text>{props.stationMetadata ? Number(props.stationMetadata.ELEVATION).toFixed(2) : null}</Text>
                <Text>{props.stationMetadata ? Number(props.stationMetadata.LONGITUDE).toFixed(2) : null}</Text>
                <Text>{props.stationMetadata ? Number(props.stationMetadata.LATITUDE).toFixed(2) : null}</Text>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      <Box display="flex" flexWrap={'nowrap'} flexDir="column" justifyContent={'center'}>
        <Box flexWrap={'nowrap'}>
          <Text fontSize={scaleToFontSize / 5}>{formatAMPM(date)}</Text>
        </Box>
      </Box>
    </Box>
  );
};

function formatAMPM(date: Date) {
  let hours = date.getHours();
  let minutes: string | number = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0' + minutes : minutes;
  const strTime = hours + ':' + minutes + ' ' + ampm;
  return strTime;
}
