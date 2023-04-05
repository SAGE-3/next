/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { ChangeEvent, useState } from 'react';
import { Center, Box, Text, VStack, Select, Input, Button, HStack } from '@chakra-ui/react';
import VariableCard from './VariableCard';
import EChartsViewer from './EChartsViewer';
import { variableNames } from './data';

const WidgetCreator = (props: { handleAddWidget: (visualizationType: string, xAXisNames: string[], yAxisNames: string[]) => void }) => {
  const [input, setInput] = useState('');
  const [visualizationType, setVisualizationType] = useState('');
  const [yAxisName, setYAxisName] = useState('');
  const [xAxisName, setXAxisName] = useState('');
  const [dateRange, setDateRange] = useState('');
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInput(value);
  };

  const handleVisualizationTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setVisualizationType(value);
    console.log(value);
  };
  const handleYAxisChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setYAxisName(value);
  };

  const handleXAxisChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setXAxisName(value);
  };

  return (
    <>
      <Center>
        <VStack>
          <Box w="400px" h="450px">
            <Text fontWeight={'bold'} fontSize="3xl" transform={'translate(50px,10px)'}>
              Visualization Preview
            </Text>
            {visualizationType !== 'line' ? (
              <Box transform={'translate(55px,50px)'}>
                <VariableCard variableName={yAxisName} variableValue={'99'} />
              </Box>
            ) : (
              <Box transform={'translate(-400px,0px)'}>
                <EChartsViewer
                  stationNames={['005HI']}
                  visualizationType={visualizationType}
                  dateRange={dateRange}
                  yAxisNames={[yAxisName]}
                  xAxisNames={[xAxisName]}
                />
              </Box>
            )}
          </Box>
          <br />
          <HStack>
            <Text>Query: </Text>
            <Input onChange={handleInputChange} />
          </HStack>
          <HStack>
            <Text>Visualization: </Text>
            <Select w="10rem" placeholder={visualizationType} onChange={handleVisualizationTypeChange}>
              <option value="variableCard">Current Value</option>
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
            </Select>
          </HStack>
          <HStack>
            <Text>Y Axis: </Text>
            <Select
              w="10rem"
              placeholder={yAxisName}
              onChange={(e) => {
                handleYAxisChange(e);
              }}
            >
              {variableNames.map((widget: { variableName: string }, index: number) => {
                return (
                  <option key={index} value={widget.variableName}>
                    {widget.variableName}
                  </option>
                );
              })}
            </Select>
          </HStack>
          <HStack>
            <Text>X Axis: </Text>
            <Select
              w="10rem"
              placeholder={xAxisName}
              onChange={(e) => {
                handleXAxisChange(e);
              }}
            >
              {variableNames.map((widget: { variableName: string }, index: number) => {
                return (
                  <option key={index} value={widget.variableName}>
                    {widget.variableName}
                  </option>
                );
              })}
            </Select>
          </HStack>
          <Button
            onClick={() => {
              props.handleAddWidget(visualizationType, [yAxisName], ['date_time']);
            }}
          >
            Add Widget
          </Button>
        </VStack>
      </Center>
    </>
  );
};

export default WidgetCreator;
