/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Spinner, useColorMode } from '@chakra-ui/react';
import * as echarts from 'echarts';
import { ChartManager } from '../../EChartsViewer/ChartManager';

const EChartsViewer = (props: {
  stationNames: string[];
  visualizationType: string;
  dateRange: string;
  isLoaded: boolean;
  yAxisNames: string[];
  stationMetadata: any;
  xAxisNames: string[];
}) => {
  const chartRef = useRef<any>(null);
  const [chartStateInstance, setChartStateInstance] = useState<echarts.ECharts | null>(null);
  const { colorMode } = useColorMode();

  useEffect(() => {
    if (chartStateInstance) {
      echarts.dispose(chartStateInstance);
    }
    if (!chartRef.current) return;
    let chartInstance: echarts.ECharts | null = null;
    const renderInstance = echarts.getInstanceByDom(chartRef.current);
    if (renderInstance) {
      chartInstance = renderInstance;
    } else {
      chartInstance = echarts.init(chartRef.current, colorMode);
    }
    chartInstance.resize({
      height: 400,
      width: 800,
    });
    async function callToChartMangaer() {
      const options = await ChartManager(
        props.stationNames,
        props.visualizationType,
        props.yAxisNames,
        props.xAxisNames,
        props.stationMetadata
      );
      if (chartInstance) chartInstance.setOption(options);
    }
    const options = callToChartMangaer();
    setChartStateInstance(chartInstance);
  }, [chartRef, props.yAxisNames, props.xAxisNames, props.visualizationType, colorMode, props.stationMetadata]);

  useEffect(() => {
    if (chartStateInstance) {
      echarts.dispose(chartStateInstance);
    }
  }, [colorMode]);

  useEffect(() => {
    if (chartStateInstance) {
      chartStateInstance.resize({
        width: 800,
        height: 400,
      });
    }
  }, [props]);
  return (
    <Box border={'white solid 10px'} rounded="1rem" w="1000" h="420">
      {props.isLoaded ? <div ref={chartRef}></div> : <Spinner w={100} h={100} thickness="20px" speed="0.30s" emptyColor="gray.200" />}
    </Box>
  );
};

export default EChartsViewer;
