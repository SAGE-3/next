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
  } & { state: App }
) {
  const s = props.state.data.state as AppState;
  const [variableValues, setVariableValues] = useState<any>([]);

  useEffect(() => {
    // variableValue={
    //   stationObservations[s.widget.yAxisNames[0]] !== undefined
    //     ? stationObservations[s.widget.yAxisNames[0]][stationObservations[s.widget.yAxisNames[0]].length - 1]
    //     : '0'
    // }

    const values = [];
    console.log(props.stationMetadata);
    for (let i = 0; i < props.stationMetadata.length; i++) {
      values.push(props.stationMetadata[i].OBSERVATIONS[s.widget.yAxisNames[0]][0]);
    }
    setVariableValues(values);
    // setVariableValue(props.stationMetadata[0][s.widget.yAxisNames[0]])
  }, [props.stationMetadata]);

  return (
    <>
      <Box
        p="1rem"
        w={'30vw'}
        h={'30vh'}
        border="solid white 1px"
        // bgColor={props.isEnabled ? 'blackAlpha.200' : 'blackAlpha.700'}
        bgColor={s.widget.color}
      >
        <Text color="black" textAlign={'center'} fontSize={30}>
          <strong>{props.variableName}</strong>
        </Text>
        {props.isLoaded ? (
          <Text margin={0} overflow="hidden" color="black" fontSize={50}>
            Average: {(variableValues.reduce((a: any, b: any) => a + b, 0) / variableValues.length).toFixed(3)}
          </Text>
        ) : (
          <Spinner w={100} h={100} thickness="20px" speed="0.30s" emptyColor="gray.200" />
        )}

        <Box margin={0} overflow="hidden" position="absolute" transform={'translate(-50%, -50%)'} top="50%" left="70%">
          <TbWind size={40} color="black" />
        </Box>
      </Box>
    </>
  );
}
