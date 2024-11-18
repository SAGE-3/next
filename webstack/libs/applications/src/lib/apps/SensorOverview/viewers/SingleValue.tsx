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
import { getSingleMeasurement } from '../router';

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

export default function SingleValue(
  props: {
    stationNames: string[];
    size?: { width: number; height: number; depth: number };
  } & { state: AppState }
) {
  const s = props.state as AppState;
  const [variablesToDisplay, setVariablesToDisplay] = useState<VariableProps[]>([]);
  const [secondaryValuesToDisplay, setSecondaryValuesToDisplay] = useState<any>();
  let previousStationName: string | null = null;
  useEffect(() => {
    const values: VariableProps[] = [];
    let secondaryValues = [];
    if (s.widget.yAxisNames.length === 0) return;

    const fetchData = async () => {
      const sensorValues = await getSingleMeasurement(props.stationNames, s.widget.yAxisNames[0]);
      console.log(sensorValues);
    };
    fetchData();
  }, [JSON.stringify(props.state.widget)]);
  return <>Hello World</>;
}
