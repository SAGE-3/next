/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useRef, useState } from 'react';

import { Box, Button, Spinner, Text, Wrap, WrapItem, Image } from '@chakra-ui/react';
import { useCursorBoardPosition, useUIStore } from '@sage3/frontend';
import { TbWind } from 'react-icons/tb';
import VariableUnits from '../data/VariableUnits';

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

const calculateStdDev = (values: number[]) => {
  const variance = calculateVariance(values);
  const stdDev = Math.sqrt(variance);
  return stdDev;
};

function celsiusToFahrenheit(celsiusArray: number[]) {
  return celsiusArray.map(function (celsius) {
    return (celsius * 9) / 5 + 32;
  });
}

function compareWithStandardDeviation(average: number, standardDeviation: number, currentValue: number) {
  const deviation = Math.abs(currentValue - average);

  if (deviation <= standardDeviation) {
    return 1;
  } else if (currentValue < average) {
    return 0;
  } else {
    return 1;
  }
}

function lightenColor(hexColor: string) {
  // Parse the hexadecimal color string to RGB values
  let r = parseInt(hexColor.substr(1, 2), 16);
  let g = parseInt(hexColor.substr(3, 2), 16);
  let b = parseInt(hexColor.substr(5, 2), 16);

  // Increase each RGB component by 20 (or adjust as desired)
  r = Math.min(r + 25, 255);
  g = Math.min(g + 25, 255);
  b = Math.min(b + 25, 255);

  // Convert the updated RGB values back to hexadecimal
  const newHexColor = '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);

  return newHexColor;
}

type VariableProps = {
  stationName: string;
  value: number;
  average: number;
  stdDev: number;
  high: number;
  low: number;
  unit: string;
  startDate: string;
  endDate: string;
  stationSTIDName: string;
  images: string[];
};

export default function VariableCard(
  props: {
    variableName: string;
    isLoaded: boolean;
    stationNames: string[];
    stationMetadata: any;
    startDate: string;
    timeSinceLastUpdate: string;
    size?: { width: number; height: number; depth: number };
  } & { state: AppState }
) {
  const s = props.state as AppState;
  const [variablesToDisplay, setVariablesToDisplay] = useState<VariableProps[]>([]);
  const [secondaryValuesToDisplay, setSecondaryValuesToDisplay] = useState<any>();
  const [variableUnit, setVariableUnit] = useState<string>('');

  useEffect(() => {
    const values: VariableProps[] = [];
    let secondaryValues = [];
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
      if (!sensorValues) return;
      let unit = '';
      let images: string[] = [];
      for (let i = 0; i < VariableUnits.length; i++) {
        if (s.widget.yAxisNames[0].includes(VariableUnits[i].variable)) {
          unit = VariableUnits[i].unit;
          images = VariableUnits[i].images;
        }
      }
      if (sensorValues.length !== 0) {
        values.push({
          stationName: props.stationMetadata[i].NAME,
          value: sensorValues[sensorValues.length - 1],
          average: calculateMean(sensorValues),
          stdDev: calculateStdDev(sensorValues),
          high: Math.max(...sensorValues),
          low: Math.min(...sensorValues),
          unit: unit,
          stationSTIDName: props.stationMetadata[i].STID,
          startDate: props.stationMetadata[i].OBSERVATIONS['date_time'][0],
          endDate: props.stationMetadata[i].OBSERVATIONS['date_time'][props.stationMetadata[i].OBSERVATIONS['date_time'].length - 1],
          images: images,
        });
      } else {
        values.push({
          stationName: props.stationMetadata[i].NAME,
          value: 0,
          average: 0,
          stdDev: 0,
          high: 0,
          low: 0,
          unit: unit,
          stationSTIDName: props.stationMetadata[i].STID,
          startDate: props.startDate,
          endDate: '2022-04-25T19:55:00Z',
          images: images,
        });
      }

      // Air Temperature has Celius and Fahrenheit to display as "secondary"
      if (s.widget.yAxisNames[0] === 'air_temp_set_1') {
        secondaryValues = celsiusToFahrenheit(sensorValues);
        setSecondaryValuesToDisplay(secondaryValues[secondaryValues.length - 1]);
      }
    }
    setVariablesToDisplay(values);
  }, [props.stationMetadata, JSON.stringify(props.state.widget)]);
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
          {variablesToDisplay.length === 1
            ? variablesToDisplay.map((variable: VariableProps, index: number) => {
                return (
                  <React.Fragment key={index}>
                    <Content
                      size={props.size}
                      isLoaded={props.isLoaded}
                      secondaryValuesToDisplay={secondaryValuesToDisplay}
                      variableName={s.widget.yAxisNames[0]}
                      stationNames={props.stationNames}
                      variableToDisplayLength={variablesToDisplay.length}
                      s={s}
                      timeSinceLastUpdate={props.timeSinceLastUpdate}
                      key={index}
                      variable={variable}
                    />
                  </React.Fragment>
                );
              })
            : variablesToDisplay.map((variable: VariableProps, index: number) => {
                return (
                  <React.Fragment key={index}>
                    <Content
                      isLoaded={props.isLoaded}
                      secondaryValuesToDisplay={secondaryValuesToDisplay}
                      variableName={s.widget.yAxisNames[0]}
                      stationNames={props.stationNames}
                      variableToDisplayLength={variablesToDisplay.length}
                      s={s}
                      timeSinceLastUpdate={props.timeSinceLastUpdate}
                      key={index}
                      variable={variable}
                    />
                  </React.Fragment>
                );
              })}
        </Box>
      ) : (
        <Box display="flex" flexDirection={'row'} justifyContent="center" alignContent={'center'} justifyItems={'center'}>
          <Content
            isLoaded={props.isLoaded}
            stationNames={props.stationNames}
            variableToDisplayLength={0}
            variableName={s.widget.yAxisNames.length ? s.widget.yAxisNames[0] : 'variable_Name_set_1'}
            s={s}
            timeSinceLastUpdate={props.timeSinceLastUpdate}
            variable={
              variablesToDisplay[0]
                ? variablesToDisplay[0]
                : {
                    stationName: 'Station Name',
                    value: 42.01,
                    average: 38.42,
                    stdDev: 12,
                    high: 82,
                    low: 12,
                    unit: 'unit',
                    startDate: props.startDate,
                    stationSTIDName: 'HI012',
                    endDate: '2022-04-25T19:55:00Z',
                    images: [],
                  }
            }
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
  timeSinceLastUpdate: string;
  secondaryValuesToDisplay?: number;
  variable: VariableProps;
}) => {
  const variableName = props.variableName.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  delete variableName[variableName.length - 1];
  delete variableName[variableName.length - 2];
  const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
  return (
    <Box
      draggable={true}
      onDragStart={(e) => {
        console.log(props.s);
        e.dataTransfer.clearData();
        e.dataTransfer.setData(
          'text/plain',
          JSON.stringify({
            sensorData: {},
            stationNames: [props.variable.stationSTIDName],
            listOfStationNames: props.variable.stationSTIDName,
            location: props.s.location,
            zoom: props.s.zoom,
            baseLayer: props.s.baseLayer,
            overlay: props.s.overlay,
            widget: props.s.widget,
          })
        );
      }}
      p="1rem"
      w={500}
      h={500}
      border="solid white 6px"
      borderRadius={'24px'}
      style={{ background: `linear-gradient(180deg, ${lightenColor(props.s.widget.color)}, ${props.s.widget.color})` }}
      display="flex"
      margin="1rem"
      flexDirection="column"
      justifyContent={'center'}
      alignContent="center"
    >
      {/* {props.size ? null : (
        <Box>
          <Text color="gray.700" justifyContent={'center'} alignContent="center" textAlign={'center'} fontSize={20} fontWeight="bold">
            Note: These values are not real. They are just placeholders for the real values.
          </Text>
        </Box>
      )} */}

      <Box>
        <Text color="black" textAlign={'center'} fontSize={30}>
          {props.variable.stationName}
        </Text>
      </Box>
      <Box>
        <Text color="black" textAlign={'center'} fontSize={35} fontWeight="bold">
          {variableName.join(' ')}
        </Text>
      </Box>

      <Box overflow="hidden" display="flex" justifyContent="center" alignItems="center">
        {props.variable.images ? (
          <Image
            boxSize={'120px'}
            src={props.variable.images[compareWithStandardDeviation(props.variable.average, props.variable.stdDev, props.variable.value)]}
            alt="image"
          />
        ) : (
          'No Image Available'
        )}
        {/* <TbWind fontSize="120px" color="black" /> */}
      </Box>
      <Box mt={2}>
        {props.isLoaded ? (
          <>
            <Text
              display="flex"
              justifyContent="center"
              alignItems="center"
              overflow="hidden"
              color="black"
              fontSize={35}
              fontWeight="bold"
            >
              Current:{' '}
              {isNaN(props.variable.value)
                ? props.variable.value
                : props.variable.value % 1
                ? Number(props.variable.value).toFixed(2)
                : props.variable.value}
              <Text
                color="grey.500"
                sx={{
                  verticalAlign: 'text-bottom',
                  marginTop: '12px', // Adjust this value as needed
                  marginLeft: '3px', // Adjust this value as needed
                }}
                fontSize={20}
              >
                {props.variable.unit}
              </Text>
              {/* <Text color="black" textAlign={'center'} fontSize={15}>
                {props.secondaryValuesToDisplay ? props.secondaryValuesToDisplay.toFixed(2) : null}
              </Text> */}
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
              <>{props.timeSinceLastUpdate}</>
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
                  Average: {props.variable.average.toFixed(2)} - Std Dev: {props.variable.stdDev.toFixed(2)}
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
              fontWeight="bold"
            >
              <>24 hour observation</>
            </Text>
          </>
        ) : (
          <Spinner w={100} h={100} thickness="20px" speed="0.30s" emptyColor="gray.200" />
        )}
      </Box>
    </Box>
  );
};
