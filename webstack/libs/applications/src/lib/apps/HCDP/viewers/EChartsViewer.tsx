/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, Spinner, useColorMode } from '@chakra-ui/react';
import * as echarts from 'echarts';
import { ChartManager } from '../../EChartsViewer/ChartManager';
import '../styling.css';

const EChartsViewer = (props: {
  stationNames: string[];
  startDate: string;
  isLoaded: boolean;
  widget: any;

  timeSinceLastUpdate?: string;
  stationMetadata?: any;
  size?: { width: number; height: number; depth: number };
}) => {
  // HTML element reference
  const chartRef = useRef<any>(null);
  const outboxRef = useRef<any>(null);

  // Echart options
  const [chartOptions, setChartOptions] = useState<echarts.EChartsCoreOption | null>(null);

  // Users SAGE 3 color mode
  const { colorMode } = useColorMode();

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
    chartInstance.resize({ width: props.size ? props.size.width - 20 : width, height: props.size ? props.size.height - 40 : height });

    chartInstance.setOption(chartOptions);
  }, [chartRef.current, outboxRef.current, colorMode, chartOptions, JSON.stringify(props.size)]);

  // If any properties for visualization changes, update the chart options
  useEffect(() => {
    async function callToChartMangaer() {
      const options = await ChartManager(
        props.stationNames,
        props.widget.visualizationType,
        props.widget.yAxisNames,
        props.widget.xAxisNames,
        colorMode,
        props.startDate,

        props.stationMetadata
      );

      setChartOptions(options);
    }
    if (props.isLoaded) {
      callToChartMangaer();
    }
  }, [JSON.stringify(props.widget), JSON.stringify(props.stationNames), JSON.stringify(props.stationMetadata), props.isLoaded, colorMode]);

  return (
    <>
      {/* if (colorMode === 'dark') {
    options.backgroundColor = '#222';
    options.textStyle = { color: '#ffffff' };
    options.axisLine = { lineStyle: { color: '#eee' } };
    options.tooltip = { backgroundColor: '#333', textStyle: { color: '#eee' } };
  } else if (colorMode === 'light') {
    options.backgroundColor = '#fff';
    options.textStyle = { color: '#333' };
    options.axisLine = { lineStyle: { color: '#999' } };
    options.tooltip = { backgroundColor: '#fff', textStyle: { color: '#333' } };
  } else {
    throw new Error('Invalid color mode');
  } */}
      <Box w="100%" h="100%" display="flex" flexDir="column" alignItems="center" justifyContent={'center'} ref={outboxRef}>
        {props.timeSinceLastUpdate ? (
          <Box
            bg={colorMode === 'light' ? '#fff' : '#222'}
            p="5px"
            w="100%"
            display="flex"
            flexDir="column"
            alignItems="center"
            justifyContent={'center'}
            fontSize={'25px'}
          >
            {props.timeSinceLastUpdate}
          </Box>
        ) : null}
        {props.isLoaded ? (
          <>
            <div ref={chartRef} />
          </>
        ) : (
          <Box transform={`scale(${4 * Math.min(props.size ? props.size.width / 300 : 0, props.size ? props.size.height / 300 : 0)})`}>
            <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" size="xl" />
          </Box>
        )}
      </Box>
    </>
  );
};
export default EChartsViewer;
