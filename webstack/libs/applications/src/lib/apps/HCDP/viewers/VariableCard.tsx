/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useState } from 'react';

import { Box, Button, Spinner, Text } from '@chakra-ui/react';
import { useUIStore } from '@sage3/frontend';
import { TbWind } from 'react-icons/tb';
import { App, AppState } from '@sage3/applications/schema';

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
  const [variableValues, setVariableValues] = useState<any>([]);
  const [variableToDisplay, setVariableToDisplay] = useState<number>(0);

  useEffect(() => {
    const values = [];
    console.log(props.stationMetadata);
    for (let i = 0; i < props.stationMetadata.length; i++) {
      values.push(props.stationMetadata[i].OBSERVATIONS[s.widget.yAxisNames[0]][0]);
    }
    // // Code to calculate average, max, min, or display first value
    // if (s.widget.operation === 'average') {
    //   let sum = 0;
    //   for (let i = 0; i < values.length; i++) {
    //     sum += values[i];
    //   }
    //   const average = sum / values.length;
    //   setVariableToDisplay(average);
    //   console.log(average);
    // } else if (s.widget.operation === 'max') {
    //   const max = Math.max(...values);
    //   setVariableToDisplay(max);
    //   console.log(max);
    // } else if (s.widget.operation === 'min') {
    //   const min = Math.min(...values);
    //   console.log(min);

    //   setVariableToDisplay(min);
    // } else {
    //   console.log(values[0]);
    //   setVariableToDisplay(values[0]);
    // }
  }, [props.stationMetadata, s.widget.operation, s.widget.yAxisNames[0]]);
  return (
    <>
      <Box
        p="1rem"
        w={props.size?.width ? props.size.width - 75 : '43.75rem'}
        h={props.size?.height ? props.size.height - 150 : '30vh'}
        border="solid white 1px"
        // bgColor={props.isEnabled ? 'blackAlpha.200' : 'blackAlpha.700'}
        bgColor={s.widget.color}
        display="flex"
        flexDirection="column"
        justifyContent={'center'}
        alignContent="center"
      >
        <Box>
          <Text color="black" textAlign={'center'} fontSize={48} fontWeight="bold">
            {props.stationNames[0]}
          </Text>
          {/* <Text color="black" textAlign={'center'} fontSize={32} fontWeight="bold">
            {props.variableName}
          </Text> */}
        </Box>

        <Box overflow="hidden" display="flex" justifyContent="center" alignItems="center">
          <TbWind fontSize="96px" color="black" />
        </Box>
        <Box mt={2}>
          {props.isLoaded ? (
            <Text
              display="flex"
              justifyContent="center"
              alignItems="center"
              overflow="hidden"
              color="black"
              fontSize={32}
              fontWeight="bold"
            >
              {s.widget.operation.charAt(0).toUpperCase() + s.widget.operation.slice(1)}: {variableToDisplay.toFixed(2)}
            </Text>
          ) : (
            <Spinner w={100} h={100} thickness="20px" speed="0.30s" emptyColor="gray.200" />
          )}
        </Box>
      </Box>
    </>
  );
}
