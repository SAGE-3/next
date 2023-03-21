/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React from 'react';

import { Box, Button, Text } from '@chakra-ui/react';
import { useAppStore } from '@sage3/frontend';
import { useParams } from 'react-router';

export default function VariableCard(props: {
  variableName: string;
  variableValue: string;
  stationName: string;
  appPos: { x: number; y: number; z: number };
}) {
  const createApp = useAppStore((state) => state.create);
  // BoardInfo
  const { boardId, roomId } = useParams();
  return (
    <>
      <Box p="1rem" w="21rem" h="12rem" border="solid white 1px">
        <Text textAlign={'center'}>
          <strong>{props.variableName}</strong>
        </Text>
        <Text lineHeight={'7rem'} textAlign="center" fontSize={'xl'} verticalAlign={'middle'}>
          <strong>{props.variableValue}</strong>
        </Text>
        <Button
          colorScheme="cyan"
          size="xs"
          onClick={() => {
            createApp({
              title: 'SensorOverview',
              roomId: roomId!,
              boardId: boardId!,
              position: { x: props.appPos.x, y: props.appPos.y, z: props.appPos.z },
              size: { width: 1000, height: 1000, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'EChartsViewer',
              state: {
                stationName: [props.stationName],
                chartType: 'line',
                yAxisAttributes: [props.variableName],
                xAxisAttributes: ['date_time'],
                transform: [],
                options: {},
              },
              raised: true,
            });
          }}
        >
          create chart
        </Button>
      </Box>
    </>
  );
}
