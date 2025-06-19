/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useRef, useState } from 'react';
import { Box, Spinner, useColorMode, Text } from '@chakra-ui/react';
import * as echarts from 'echarts';

import { ChartManager } from '../../EChartsViewer/ChartManager';
import {variable_dict} from '../data/variableConversion'

import '../styling.css';

interface EChartsViewerProps {
  stationNames: string[];
  stationFriendlyNames: string[];
  startDate: string;
  isLoaded: boolean;
  widget: any;
  timeSinceLastUpdate?: string;
  stationMetadata?: { [key: string]: Array<{
    timestamp: string;
    station_id: string;
    variable: string;
    value: string;
    flag: number;
  }> };
  size: { width: number; height: number; depth: number };
  stationIdToName: { [key: string]: string };
}

const EChartsViewer = (props: EChartsViewerProps) => {
  // HTML element reference
  const chartRef = useRef<any>(null);
  const outboxRef = useRef<any>(null);

  const [stationNames, setStationNames] = useState<string>('');

  // Echart options
  const [chartOptions, setChartOptions] = useState<echarts.EChartsCoreOption | null>(null);

  // Users SAGE 3 color mode
  const { colorMode } = useColorMode();

  useEffect(() => {
    let namesOfStations = '';
    if (props.stationMetadata) {
      const stationIds = Object.keys(props.stationMetadata);
      namesOfStations = stationIds.join(', ');
    }
    setStationNames(namesOfStations);
  }, [props.stationMetadata]);

  // If the chartRef changes, update the chart instance
  useEffect(() => {
    if (!chartRef.current || !chartOptions || !outboxRef.current) return;
    const chart = echarts.getInstanceByDom(chartRef.current);
    if (chart) {
      chart.dispose();
    }

    const chartInstance = echarts.init(chartRef.current, colorMode);
    const width = outboxRef.current.getBoundingClientRect().width;
    const height = outboxRef.current.getBoundingClientRect().height;
    chartInstance.resize({
      width: props.size ? props.size.width - 20 : width,
      height: props.size ? props.size.height - 250 : height - 250,
    });

    chartInstance.setOption(chartOptions);
  }, [chartRef.current, outboxRef.current, colorMode, chartOptions, JSON.stringify(props.size)]);

  // If any properties for visualization changes, update the chart options
  useEffect(() => {
    const tmpWidget = { ...props.widget };
    function callToChartManager() {
      const options = ChartManager(
        tmpWidget.stationNames,
        tmpWidget.visualizationType,
        tmpWidget.yAxisNames,
        tmpWidget.xAxisNames,
        colorMode,
        props.startDate,
        props.stationMetadata || {},
        props.widget.timePeriod,
        props.size,
        variable_dict
      );
      setChartOptions(options);
    }
    if (props.isLoaded) {
      callToChartManager();
    }
    
  }, [JSON.stringify(props.stationNames), JSON.stringify(props.stationMetadata), props.isLoaded, colorMode, JSON.stringify(props.size), JSON.stringify(props.widget)]);

  return (
    <>
      <Box
        bg={colorMode === 'light' ? '#fff' : '#222'}
        w={props.size ? props.size.width : '100%'}
        h={props.size ? props.size.height : '100%'}
        display="flex"
        flexDir="column"
        alignItems="center"
        justifyContent={'center'}
        ref={outboxRef}
        position="relative"
      >
        {props.isLoaded ? (
          <>
            <Box pb="2rem">
              <Text textAlign={'center'} fontSize={'80px'}>
                {props.stationMetadata ? 
                  Object.keys(props.stationMetadata)
                    .map(id => props.stationIdToName[id] || id)
                    .join(', ') 
                  : 'No Station Selected'}
              </Text>
            </Box>
            <div ref={chartRef} />
            {props.timeSinceLastUpdate ? (
              <Box
                bg={colorMode === 'light' ? '#fff' : '#222'}
                w="100%"
                display="flex"
                flexDir="column"
                alignItems="center"
                justifyContent={'center'}
                fontSize={'25px'}
                pb={'0rem'}
              >
                {props.timeSinceLastUpdate}
              </Box>
            ) : null}
          </>
        ) : (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform={`scale(${4 * Math.min(props.size ? props.size.width / 300 : 0, props.size ? props.size.height / 300 : 0)})`}
          >
            <Spinner thickness="5px" speed="1s" emptyColor="gray.200" size="xl" />
          </Box>
        )}
      </Box>
    </>
  );
};
export default EChartsViewer;
