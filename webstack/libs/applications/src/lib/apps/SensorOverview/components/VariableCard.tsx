/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useState } from 'react';

import { Box, Button, Text } from '@chakra-ui/react';
import { useUIStore } from '@sage3/frontend';
import { TbWind } from 'react-icons/tb';
import { App, AppState } from '@sage3/applications/schema';

export default function VariableCard(
  props: {
    size?: { width: number; height: number; depth: number };
    variableName: string;
    isEnabled?: boolean;
    showDeleteButton?: boolean;
    handleDeleteWidget?: (index: number) => void;
    index?: number;
    stationNames: string[];
    stationMetadata: any;
  } & { state: App }
) {
  const s = props.state.data.state as AppState;
  const scale = useUIStore((state) => state.scale);
  const [variableValues, setVariableValues] = useState<any>([]);

  useEffect(() => {
    // variableValue={
    //   stationObservations[s.widget.yAxisNames[0]] !== undefined
    //     ? stationObservations[s.widget.yAxisNames[0]][stationObservations[s.widget.yAxisNames[0]].length - 1]
    //     : '0'
    // }
    const values = [];
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
        w={props.size?.width ? props.size.width - 75 : '20vw'}
        h={props.size?.height ? props.size.height - 150 : '60vh'}
        border="solid white 1px"
        // bgColor={props.isEnabled ? 'blackAlpha.200' : 'blackAlpha.700'}
        bgColor={s.widget.color}
      >
        {props.showDeleteButton ? (
          <Button
            onClick={() => {
              if (props.handleDeleteWidget) props.handleDeleteWidget(props.index ? props.index : 0);
            }}
          >
            Delete
          </Button>
        ) : null}

        <Text color="black" textAlign={'center'} fontSize={Math.min(40 / scale, 70)}>
          <strong>{props.variableName}</strong>
        </Text>
        {variableValues.map((variableValue: number, index: any) => {
          return (
            <Text
              margin={0}
              overflow="hidden"
              position="absolute"
              top="50%"
              left="30%"
              color="black"
              transform={'translate(-50%, -50%)'}
              fontSize={Math.min(100 / scale, 100)}
            >
              Average: {(variableValues.reduce((a: any, b: any) => a + b, 0) / variableValues.length).toFixed(3)}
            </Text>
          );
        })}

        <Box margin={0} overflow="hidden" position="absolute" transform={'translate(-50%, -50%)'} top="50%" left="70%">
          <TbWind size={Math.min(300 / scale, 200)} color="black" />
        </Box>
      </Box>
    </>
  );
}
