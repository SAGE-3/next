/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useState } from 'react';
import { Box, Spinner, Text, Divider, useColorMode } from '@chakra-ui/react';

import { AppState } from '@sage3/applications/schema';

import variableUnits from '../data/variableUnits';
import { VariableProps } from '../types/types';

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

export default function StatisticCard(
  props: {
    isLoaded: boolean;
    stationNames: string[];
    stationMetadata: any;
    startDate: string;
    timeSinceLastUpdate: string;
    size?: { width: number; height: number; depth: number };
    generateAllVariables?: boolean;
    isCustomizeWidgetMenu: boolean;
    widget: any;
  } & { state: AppState }
) {
  const s = props.state as AppState;
  const [variablesToDisplay, setVariablesToDisplay] = useState<VariableProps[]>([]);
  const [secondaryValuesToDisplay, setSecondaryValuesToDisplay] = useState<any>();
  let previousStationName: string | null = null;

  useEffect(() => {
    const values: VariableProps[] = [];
    let secondaryValues = [];
    if (props.widget.yAxisNames.length === 0 && props.generateAllVariables === false) return;
    for (let i = 0; i < props.stationMetadata.length; i++) {
      props.stationMetadata[i].OBSERVATIONS['elevation'] = [props.stationMetadata[i].ELEVATION];
      props.stationMetadata[i].OBSERVATIONS['latitude'] = [props.stationMetadata[i].LATITUDE];
      props.stationMetadata[i].OBSERVATIONS['longitude'] = [props.stationMetadata[i].LONGITUDE];
      // props.stationMetadata[i].OBSERVATIONS['name'] = [props.stationMetadata[i].NAME];
      props.stationMetadata[i].OBSERVATIONS['current temperature'] = [
        props.stationMetadata[i].OBSERVATIONS['air_temp_set_1'][props.stationMetadata[i].OBSERVATIONS['air_temp_set_1'].length - 1],
      ];
    }

    for (let i = 0; i < props.stationMetadata.length; i++) {
      // Check here if generating all the variable names for a station
      if (props.generateAllVariables) {
        props.widget.yAxisNames = Object.getOwnPropertyNames(props.stationMetadata[i].OBSERVATIONS);
      }
      for (let j = 0; j < props.widget.yAxisNames.length; j++) {
        let sensorValues = props.stationMetadata[i].OBSERVATIONS[props.widget.yAxisNames[j]];
        if (sensorValues) {
          let unit = '';
          let color = '#ffffff';
          for (let i = 0; i < variableUnits.length; i++) {
            if (props.widget.yAxisNames[j].includes(variableUnits[i].variable)) {
              unit = variableUnits[i].unit;
              color = variableUnits[i].color;
            }
          }

          sensorValues = sensorValues.filter((value: number) => Number(value) !== 0);
          if (sensorValues.length !== 0) {
            values.push({
              variableName: props.widget.yAxisNames[j],
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
              color: color,
            });
          } else {
            values.push({
              variableName: props.widget.yAxisNames[j],
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
              color: color,
            });
          }

          // Air Temperature has Celius and Fahrenheit to display as "secondary"
          if (props.widget.yAxisNames[0] === 'air_temp_set_1') {
            secondaryValues = celsiusToFahrenheit(sensorValues);
            setSecondaryValuesToDisplay(secondaryValues[secondaryValues.length - 1]);
          }
        }
      }
    }
    setVariablesToDisplay(values);
  }, [JSON.stringify(props.stationMetadata), JSON.stringify(props.widget)]);
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
                      size={props.size ? props.size : { width: 0, height: 0, depth: 0 }}
                      isLoaded={props.isLoaded}
                      secondaryValuesToDisplay={secondaryValuesToDisplay}
                      stationNames={props.stationNames}
                      variableToDisplayLength={variablesToDisplay.length}
                      s={s}
                      timeSinceLastUpdate={props.timeSinceLastUpdate}
                      key={index}
                      variable={variable}
                      isCustomizeWidgetMenu={props.isCustomizeWidgetMenu}
                      timePeriod={props.widget.timePeriod}
                    />
                  </React.Fragment>
                );
              })
            : variablesToDisplay.map((variable: VariableProps, index: number) => {
                const currentStationName = variable.stationName;
                const isNewStation = currentStationName !== previousStationName;

                previousStationName = currentStationName;
                return (
                  <React.Fragment key={index}>
                    {props.generateAllVariables ? (
                      isNewStation ? (
                        <>
                          <Divider orientation="horizontal" />
                          <Box h="20px" width="100%" bgColor="gray.200" />
                        </>
                      ) : null
                    ) : null}

                    <Content
                      isLoaded={props.isLoaded}
                      secondaryValuesToDisplay={secondaryValuesToDisplay}
                      size={props.size ? props.size : { width: 0, height: 0, depth: 0 }}
                      stationNames={props.stationNames}
                      variableToDisplayLength={variablesToDisplay.length}
                      s={s}
                      timeSinceLastUpdate={props.timeSinceLastUpdate}
                      key={index}
                      variable={variable}
                      isCustomizeWidgetMenu={props.isCustomizeWidgetMenu}
                      timePeriod={props.widget.timePeriod}
                    />
                  </React.Fragment>
                );
              })}
        </Box>
      ) : (
        <Box display="flex" flexDirection={'row'} justifyContent="center" alignContent={'center'} justifyItems={'center'}>
          <Content
            isLoaded={props.isLoaded}
            isCustomizeWidgetMenu={props.isCustomizeWidgetMenu}
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
            timePeriod={props.widget.timePeriod}
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
  size: { width: number; height: number; depth: number };
  variableToDisplayLength: number;
  timeSinceLastUpdate: string;
  secondaryValuesToDisplay?: number;
  variable: VariableProps;
  isCustomizeWidgetMenu: boolean;
  timePeriod: string;
}) => {
  const variableName = props.variable.variableName.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  // delete variableName[variableName.length - 1];
  delete variableName[variableName.length - 2];
  const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
  const [scaleToFontSize, setScaleToFontSize] = useState(100);
  const { colorMode } = useColorMode();

  useEffect(() => {
    if (props.size.width < props.size.height) {
      setScaleToFontSize(props.size.width / Math.ceil(Math.sqrt(props.stationNames.length)) - 15);
    } else {
      setScaleToFontSize(props.size.height / Math.ceil(Math.sqrt(props.stationNames.length)) - 15);
    }
  }, [JSON.stringify(props.size), JSON.stringify(props.stationNames)]);

  return (
    <>
      <Box
        draggable={true}
        onDragStart={(e) => {
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
        position="relative"
        boxShadow={'lg'}
        border={`${scaleToFontSize / 100}px solid grey`}
        pl="1"
        pt="1"
        w={props.size.width / Math.ceil(Math.sqrt(props.stationNames.length)) - 15}
        h={props.size.height / Math.ceil(Math.sqrt(props.stationNames.length)) - 15}
        // bgColor={`${props.variable.color}`}

        style={{ backgroundColor: colorMode === 'light' ? '#fff' : '#222' }}
        // style={{ background: `linear-gradient(180deg, ${lightenColor(props.variable.color)}, ${props.variable.color})` }}
        display="flex"
        flexDirection="column"
        // justifyContent={'center'}
        alignContent="center"
        textAlign={'center'}
      >
        <Box>
          <Text textAlign={'center'} fontSize={scaleToFontSize / 12}>
            {props.variable.stationName}
          </Text>
        </Box>

        <Box>
          <Text textShadow={'black 2px 2px'} fontSize={scaleToFontSize / 12}>
            {variableName.join(' ')}
          </Text>
        </Box>

        <Box display="flex" flexDir="column" justifyContent="center" alignItems="center">
          {props.isLoaded ? (
            <>
              <Text fontSize={scaleToFontSize / 7} fontWeight="bold">
                {isNaN(props.variable.value)
                  ? props.variable.value
                  : props.variable.value % 1
                  ? Number(props.variable.value).toFixed(1)
                  : props.variable.value}
                <span>&nbsp;{props.variable.unit}</span>
              </Text>
              <Box
                fontSize={scaleToFontSize / 20}
                w={scaleToFontSize + 200}
                p={scaleToFontSize / 30}
                px={scaleToFontSize / 15}
                // borderRadius={'lg'}
                borderRadius={'40px'}
                boxShadow={'lg'}
                overflow="visible"
                // color="white"
                // bg="#2A2A2A"
                border={`${scaleToFontSize / 100}px solid grey`}
                style={{ backgroundColor: colorMode === 'light' ? '#f1f1f1' : '#2A2A2A' }}
              >
                <Text>{props.timePeriod}</Text>
                <Box mt={scaleToFontSize / 25} display="flex" flexDir="row" justifyContent="space-between">
                  <Box>
                    <Text>Low</Text>
                    <Text fontWeight={'bold'} fontSize={scaleToFontSize / 16}>
                      {props.variable.low} {props.variable.unit}
                    </Text>
                  </Box>
                  <Box>
                    <Text>Average</Text>
                    <Text fontWeight={'bold'} fontSize={scaleToFontSize / 16}>
                      {props.variable.average.toFixed(1)} {props.variable.unit}
                    </Text>
                  </Box>
                  <Box>
                    <Text>High</Text>
                    <Text fontWeight={'bold'} fontSize={scaleToFontSize / 16}>
                      {props.variable.high} {props.variable.unit}
                    </Text>
                  </Box>
                </Box>
              </Box>
            </>
          ) : (
            <Spinner w={100} h={100} thickness="5px" speed="1s" emptyColor="gray.200" />
          )}
        </Box>

        <Box>
          <Text
            overflow="hidden"
            color="gray.400"
            transform={`translateY(${scaleToFontSize / 20}px)`}
            fontSize={scaleToFontSize / 30}
            fontWeight="semibold"
            // lineHeight={'48px'}
          >
            <>{props.timeSinceLastUpdate}</>
          </Text>
        </Box>
      </Box>
    </>
  );
};

StatisticCard.defaultProps = {
  generateAllVariables: false,
};
