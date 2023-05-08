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
import '../styling.css';

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
      width: props.size ? props.size.height : 1090,
      height: props.size ? props.size.width : 410,
    });
    async function callToChartMangaer() {
      console.log('I got Called');
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
        width: props.size ? props.size.height : 1090,
        height: props.size ? props.size.width : 410,
      });
    }
  }, [props.size]);
  return (
    <Box border={colorMode === 'light' ? 'black solid 2px' : 'white solid 2px'} rounded="4" w="1090" h="415" position="relative">
      {props.isLoaded ? <div ref={chartRef} /> : <div className="loader" />}
    </Box>
  );
};

export default EChartsViewer;
