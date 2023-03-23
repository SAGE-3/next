/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { ChangeEvent, useState } from 'react';
import { Center, Box, Text, VStack, Select, Input, Button } from '@chakra-ui/react';
import VariableCard from './VariableCard';
import EChartsViewer from './EChartsViewer';
import { variableNames } from './data';

const WidgetCreator = () => {
  const [input, setInput] = useState('');
  const [visualizationType, setVisualizationType] = useState('');
  const [variableType, setVariableType] = useState('');
  const [dateRange, setDateRange] = useState('');
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInput(value);
  };

  const handleVisualizationTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setVisualizationType(value);
  };
  const handleVariableTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setVariableType(value);
  };

  return (
    <>
      <Center>
        <VStack>
          <Box w="400px" h="450px">
            <Text fontWeight={'bold'} fontSize="3xl" transform={'translate(50px,10px)'}>
              Visualization Preview
            </Text>
            {visualizationType !== 'lineChart' ? (
              <Box transform={'translate(55px,50px)'}>
                <VariableCard variableName={variableType} variableValue={'99'} />
              </Box>
            ) : (
              <Box transform={'translate(-400px,0px)'}>
                <EChartsViewer
                  stationNames={['005HI']}
                  visualizationType={visualizationType}
                  dateRange={dateRange}
                  variableType={variableType}
                />
              </Box>
            )}
          </Box>
          <br />
          <Input onChange={handleInputChange} />
          <Select w="10rem" placeholder="Select option" onChange={handleVisualizationTypeChange}>
            <option value="currentValue">Current Value</option>
            <option value="lineChart">Line Chart</option>
            <option value="barChart">Bar Chart</option>
          </Select>
          <Select
            w="10rem"
            placeholder="Select option"
            onChange={(e) => {
              handleVariableTypeChange(e);
            }}
          >
            {variableNames.map((widget: { variableName: string }, index: number) => {
              return <option value={widget.variableName}>{widget.variableName}</option>;
            })}
          </Select>
          {/* <Button onClick={handleAddWidget}>Add Widget</Button> */}
        </VStack>
      </Center>
    </>
  );
};

export default WidgetCreator;
