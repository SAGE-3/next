/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useState } from 'react';

import { Box, Button, Spinner, Text, Wrap, WrapItem } from '@chakra-ui/react';
import { useUIStore } from '@sage3/frontend';
import { TbWind } from 'react-icons/tb';
import { App, AppState } from '@sage3/applications/schema';

// Calculate the average of all the numbers
const calculateMean = (values: number[]) => {
  const mean = values.reduce((sum: number, current: number) => sum + current) / values.length;
  return mean;
};

// Calculate variance
const calculateVariance = (values: number[]) => {
  const average = calculateMean(values);
  const squareDiffs = values.map((value: number) => {
    const diff = value - average;
    return diff * diff;
  });
  const variance = calculateMean(squareDiffs);
  return variance;
};

export default function VariableCard(
  props: {
    variableName: string;
    isLoaded: boolean;
    stationNames: string[];
    stationMetadata: any;
    size?: { width: number; height: number; depth: number };
  } & { state: App }
) {
  const s = props.state.data.state as AppState;
  const [variablesToDisplay, setVariablesToDisplay] = useState<
    {
      stationName: string;
      value: number;
      average: number;
      variance: number;
      high: number;
      low: number;
      startDate: string;
      endDate: string;
    }[]
  >([]);

  useEffect(() => {
    const values: {
      stationName: string;
      value: number;
      average: number;
      variance: number;
      high: number;
      low: number;
      startDate: string;
      endDate: string;
    }[] = [];
    if (s.widget.yAxisNames.length === 0) return;

    for (let i = 0; i < props.stationMetadata.length; i++) {
      props.stationMetadata[i].OBSERVATIONS['elevation'] = [props.stationMetadata[i].ELEVATION];
      props.stationMetadata[i].OBSERVATIONS['latitude'] = [props.stationMetadata[i].LATITUDE];
      props.stationMetadata[i].OBSERVATIONS['longitude'] = [props.stationMetadata[i].LONGITUDE];
      props.stationMetadata[i].OBSERVATIONS['name'] = [props.stationMetadata[i].NAME];
      props.stationMetadata[i].OBSERVATIONS['current temperature'] = [
        props.stationMetadata[i].OBSERVATIONS['air_temp_set_1'][props.stationMetadata[i].OBSERVATIONS['air_temp_set_1'].length - 1],
      ];
    }

    for (let i = 0; i < props.stationMetadata.length; i++) {
      const sensorValues = props.stationMetadata[i].OBSERVATIONS[s.widget.yAxisNames[0]];
      if (sensorValues.length !== 0) {
        values.push({
          stationName: props.stationMetadata[i].NAME,
          value: sensorValues[sensorValues.length - 1],
          average: calculateMean(sensorValues),
          variance: calculateVariance(sensorValues),
          high: Math.max(...sensorValues),
          low: Math.min(...sensorValues),
          startDate: props.stationMetadata[i].OBSERVATIONS['date_time'][0],
          endDate: props.stationMetadata[i].OBSERVATIONS['date_time'][props.stationMetadata[i].OBSERVATIONS['date_time'].length - 1],
        });
      } else {
        values.push({
          stationName: props.stationMetadata[i].NAME,
          value: 0,
          average: 0,
          variance: 0,
          high: 0,
          low: 0,
          startDate: '2023-05-09T21:45:00Z',
          endDate: '2022-04-25T19:55:00Z',
        });
      }
    }
    setVariablesToDisplay(values);
  }, [props.stationMetadata, s.widget.operation, s.widget.yAxisNames]);
  return (
    <>
      {props.size ? (
        <Wrap>
          {variablesToDisplay.map(
            (
              variable: {
                stationName: string;
                value: number;
                average: number;
                variance: number;
                high: number;
                low: number;
                startDate: string;
                endDate: string;
              },
              index: number
            ) => {
              return (
                <WrapItem key={index}>
                  <Content
                    size={props.size}
                    isLoaded={props.isLoaded}
                    variableName={s.widget.yAxisNames[0]}
                    stationNames={props.stationNames}
                    variableToDisplayLength={variablesToDisplay.length}
                    s={s}
                    variable={variable}
                  />
                </WrapItem>
              );
            }
          )}
        </Wrap>
      ) : (
        <Box display="flex" flexDirection={'row'} justifyContent="center" alignContent={'center'} justifyItems={'center'}>
          <Content
            isLoaded={props.isLoaded}
            stationNames={props.stationNames}
            variableToDisplayLength={0}
            variableName={s.widget.yAxisNames.length ? s.widget.yAxisNames[0] : 'variable_Name_set_1'}
            s={s}
            variable={{
              stationName: 'Station Name',
              value: 42,
              average: 38.42,
              variance: 12,
              high: 82,
              low: 12,
              startDate: '2023-05-09T21:45:00Z',
              endDate: '2022-04-25T19:55:00Z',
            }}
          />
        </Box>
      )}
    </>
  );
}

const Content = (props: {
  isLoaded: boolean;
  s: AppState;
  stationNames: string[];
  variableName: string;
  size?: { width: number; height: number; depth: number };
  variableToDisplayLength: number;
  variable: {
    stationName: string;
    value: number;
    average: number;
    variance: number;
    high: number;
    low: number;
    startDate: string;
    endDate: string;
  };
}) => {
  const variableName = props.variableName.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  delete variableName[variableName.length - 1];
  delete variableName[variableName.length - 2];
  const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };

  return (
    <Box
      p="1rem"
      w={500}
      h={500}
      border="solid white 1px"
      // bgColor={props.isEnabled ? 'blackAlpha.200' : 'blackAlpha.700'}
      bgColor={props.s.widget.color}
      display="flex"
      flexDirection="column"
      justifyContent={'center'}
      alignContent="center"
    >
      {props.size ? null : (
        <Box>
          <Text color="gray.700" justifyContent={'center'} alignContent="center" textAlign={'center'} fontSize={20} fontWeight="bold">
            Note: These values are not real. They are just placeholders for the real values.
          </Text>
        </Box>
      )}
      <Box>
        <Text color="black" textAlign={'center'} fontSize={35} fontWeight="bold">
          {variableName.join(' ')}
        </Text>
      </Box>

      <Box>
        <Text color="black" textAlign={'center'} fontSize={30}>
          {props.variable.stationName}
        </Text>
      </Box>

      <Box overflow="hidden" display="flex" justifyContent="center" alignItems="center">
        <TbWind fontSize="120px" color="black" />
      </Box>
      <Box mt={2}>
        {props.isLoaded ? (
          <>
            {' '}
            <Text
              display="flex"
              justifyContent="center"
              alignItems="center"
              overflow="hidden"
              color="black"
              fontSize={35}
              fontWeight="bold"
            >
              {/* {s.widget.operation.charAt(0).toUpperCase() + s.widget.operation.slice(1)}:  */}
              Current: {isNaN(props.variable.value) ? props.variable.value : props.variable.value.toFixed(2)}
            </Text>
            <Text
              display="flex"
              justifyContent="center"
              alignItems="center"
              overflow="hidden"
              color="gray.700"
              fontSize={20}
              fontWeight="semibold"
            >
              <>Last updated: 5 minutes ago</>
            </Text>
            <br />
            {isNaN(props.variable.value) ? null : (
              <>
                <Text
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  overflow="hidden"
                  color="black"
                  fontSize={25}
                  fontWeight="bold"
                >
                  Average: {props.variable.average.toFixed(2)} - Variance: {props.variable.variance.toFixed(2)}
                </Text>
                <Text
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  overflow="hidden"
                  color="black"
                  fontSize={25}
                  fontWeight="bold"
                >
                  High: {props.variable.high.toFixed(2)} - Low: {props.variable.low.toFixed(2)}
                </Text>
              </>
            )}
            <Text
              display="flex"
              justifyContent="center"
              alignItems="center"
              overflow="hidden"
              color="gray.700"
              fontSize={20}
              fontWeight="semibold"
            >
              <>Since: {new Date(props.variable.startDate).toLocaleString()}</>
            </Text>
          </>
        ) : (
          <Spinner w={100} h={100} thickness="20px" speed="0.30s" emptyColor="gray.200" />
        )}
      </Box>
    </Box>
  );
};
