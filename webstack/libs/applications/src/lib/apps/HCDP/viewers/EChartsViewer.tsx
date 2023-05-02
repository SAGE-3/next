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
import { useAppStore } from '@sage3/frontend';

const EChartsViewer = (props: {
  stationNames: string[];
  dateStart: string;
  dateEnd: string;
  isLoaded: boolean;
  widget: any;
  stationMetadata?: any;
  size?: { width: number; height: number; depth: number };
}) => {
  const chartRef = useRef<any>(null);
  const [chartStateInstance, setChartStateInstance] = useState<echarts.ECharts | null>(null);
  const { colorMode } = useColorMode();
  const s = useAppStore((state) => state);

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
      width: props.size ? props.size.height : 1000,
      height: props.size ? props.size.width : 400,
    });
    async function callToChartMangaer() {
      const options = await ChartManager(
        props.stationNames,
        props.widget.visualizationType,
        props.widget.yAxisNames,
        props.widget.xAxisNames,
        props.stationMetadata
      );
      if (chartInstance) chartInstance.setOption(options);
    }
    callToChartMangaer();
    setChartStateInstance(chartInstance);
  }, [chartRef, props.widget, colorMode, props.isLoaded, props.stationNames, props.stationMetadata]);

  useEffect(() => {
    if (chartStateInstance) {
      echarts.dispose(chartStateInstance);
    }
  }, [colorMode]);

  useEffect(() => {
    if (chartStateInstance) {
      chartStateInstance.resize({
        width: props.size ? props.size.height : 1000,
        height: props.size ? props.size.width : 400,
      });
    }
  }, [props.size]);
  return (
    <Box border={colorMode === 'light' ? 'black solid 7px' : 'white solid 7px'} rounded="1rem" w="1000" h="420">
      {props.isLoaded ? <div ref={chartRef}></div> : <Spinner w={420} h={420} thickness="20px" speed="0.30s" emptyColor="gray.200" />}
    </Box>
  );
};

export default EChartsViewer;
