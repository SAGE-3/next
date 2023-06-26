import React, { useState, useEffect } from 'react';
import { AppState } from '../../../types';
import VariableUnits from '../data/VariableUnits';
import { Box, Spinner, Text, Image, Divider, AbsoluteCenter } from '@chakra-ui/react';

type VariableProps = {
  variableName: string;
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
  color: string;
};

type CurrentConditionsProps = {
  isLoaded: boolean;
  stationNames: string[];
  stationMetadata: any;
  startDate: string;
  timeSinceLastUpdate: string;
  size?: { width: number; height: number; depth: number };
} & { state: AppState };

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

const CurrentConditions = (props: CurrentConditionsProps) => {
  const s = props.state as AppState;
  const [variablesToDisplay, setVariablesToDisplay] = useState<{ metadata: any; variables: VariableProps[] }[]>([]);
  const [secondaryValuesToDisplay, setSecondaryValuesToDisplay] = useState<any>();
  const previousStationName: string | null = null;
  useEffect(() => {
    const secondaryValues = [];
    const tmpVariablesToDisplay = [];

    for (let i = 0; i < props.stationMetadata.length; i++) {
      s.widget.yAxisNames = Object.getOwnPropertyNames(props.stationMetadata[i].OBSERVATIONS);
      const index = s.widget.yAxisNames.indexOf('date_time');
      if (index !== -1) {
        s.widget.yAxisNames.splice(index, 1);
      }
      console.log(s.widget.yAxisNames);
      const tmpValuesForSingleStation = [];

      for (let j = 0; j < s.widget.yAxisNames.length; j++) {
        const sensorValues = props.stationMetadata[i].OBSERVATIONS[s.widget.yAxisNames[j]];
        if (sensorValues) {
          let unit = '';
          let images: string[] = [];
          let color = '#ffffff';
          for (let i = 0; i < VariableUnits.length; i++) {
            if (s.widget.yAxisNames[j].includes(VariableUnits[i].variable)) {
              unit = VariableUnits[i].unit;
              images = VariableUnits[i].images;
              color = VariableUnits[i].color;
            }
          }
          if (sensorValues.length !== 0) {
            tmpValuesForSingleStation.push({
              variableName: s.widget.yAxisNames[j],
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
              color: color,
            });
          } else {
            tmpValuesForSingleStation.push({
              variableName: s.widget.yAxisNames[j],
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
              color: color,
            });
          }

          // Air Temperature has Celius and Fahrenheit to display as "secondary"
          // if (s.widget.yAxisNames[0] === 'air_temp_set_1') {
          //   secondaryValues = celsiusToFahrenheit(sensorValues);
          //   setSecondaryValuesToDisplay(secondaryValues[secondaryValues.length - 1]);
          // }
        }
      }
      tmpVariablesToDisplay.push({ metadata: props.stationMetadata[i], variables: tmpValuesForSingleStation });
    }
    setVariablesToDisplay(tmpVariablesToDisplay);
  }, [JSON.stringify(props.stationMetadata), JSON.stringify(props.state.widget)]);
  return (
    <>
      <Box>
        {variablesToDisplay.map((station, index) => {
          return (
            <React.Fragment key={index}>
              <Box m="2rem" border="3px solid white" borderRadius={'12px'}>
                <Text fontSize={48} pl="1rem" pt="1rem" bgColor="gray.700" borderTopRadius="12px">
                  Station: {station.metadata.NAME}
                </Text>
                <Text fontSize={24} p="2rem">
                  TODO: line up colon and numbers Lat: {station.metadata.LATITUDE}
                  <br />
                  Lon: {station.metadata.LONGITUDE}
                  <br />
                  Elevation: {station.metadata.ELEVATION}
                  <br />
                  Status: {station.metadata.STATUS}
                </Text>
                <Box
                  display="flex"
                  flexWrap="wrap"
                  // alignItems="center"
                  flexDirection={'row'}
                  justifyContent="center"

                  // alignContent={'center'}
                  // justifyItems={'center'}
                >
                  {station.variables.map((variable, index) => {
                    const variableName = variable.variableName.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1));
                    // delete variableName[variableName.length - 1];
                    delete variableName[variableName.length - 2];
                    return (
                      <React.Fragment key={index}>
                        <Box
                          // boxShadow={'lg'}
                          // p="1rem"
                          w={500}
                          h={350}
                          // bgColor={`${props.variable.color}`}
                          color="white"
                          borderRadius={'12px'}
                          bgColor="#363636"
                          // style={{ backgroundColor: 'whiteAlpha.600' }}
                          // style={{ background: `linear-gradient(180deg, ${lightenColor(props.variable.color)}, ${props.variable.color})` }}
                          display="flex"
                          margin="1rem"
                          flexDirection="column"
                          // justifyContent={'center'}
                          // alignContent="center"
                        >
                          <Box>
                            <Text
                              color="black"
                              borderRadius={'12px'}
                              textAlign={'center'}
                              fontSize={40}
                              w="100%"
                              py="12px"
                              mb="3rem"
                              bgColor={variable.color}
                              border={`solid ${variable.color} 2px`}
                            >
                              {variableName.join(' ')}
                            </Text>
                          </Box>
                          <Box>
                            <Text
                              display="flex"
                              justifyContent="center"
                              alignItems="center"
                              overflow="hidden"
                              fontSize={48}
                              fontWeight="bold"
                            >
                              {' '}
                              {isNaN(variable.value)
                                ? variable.value
                                : variable.value % 1
                                ? Number(variable.value).toFixed(2)
                                : variable.value}
                              <span style={{ marginLeft: '3px', fontSize: 30 }}>{variable.unit}</span>
                            </Text>
                          </Box>
                        </Box>
                      </React.Fragment>
                    );
                  })}
                </Box>
                <Box h="128px">
                  <Text
                    // display="block"
                    // justifyContent="center"
                    // alignItems="right"
                    // marginLeft={'auto'}
                    mt="1rem"
                    float="right"
                    // marginRight={0}
                    overflow="hidden"
                    fontSize={48}
                    fontWeight="semibold"
                    lineHeight={'48px'}
                  >
                    <>{props.timeSinceLastUpdate}</>
                  </Text>
                </Box>
                <Box width="100%" bgColor="white"></Box>
              </Box>
            </React.Fragment>
          );
        })}
      </Box>
    </>
  );
};

export default CurrentConditions;
