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
  // HTML element reference
  const chartRef = useRef<any>(null);
  // Echart instance
  const [chart, setChart] = useState<echarts.ECharts | null>(null);
  // Echart options
  const [chartOptions, setChartOptions] = useState<echarts.EChartsCoreOption>({});
  // Users SAGE 3 color mode
  const { colorMode } = useColorMode();

  // If the chartRef changes, update the chart instance
  useEffect(() => {
    if (!chartRef.current) return;
    const chartInstance = echarts.init(chartRef.current, colorMode);
    chartInstance.resize({
      width: props.size ? props.size.height : 1090,
      height: props.size ? props.size.width : 410,
    });
    setChart(chartInstance);
  }, [chartRef.current]);

  // Props update
  useEffect(() => {
    async function callToChartMangaer() {
      console.log(props.stationMetadata);
      const options = await ChartManager(
        props.stationNames,
        props.widget.visualizationType,
        props.widget.yAxisNames,
        props.widget.xAxisNames,
        colorMode,

        props.stationMetadata
      );
      // Compare Options, update only if they are different
      if (JSON.stringify(options) !== JSON.stringify(chartOptions)) {
        console.log('set the optoins');
        setChartOptions(options);
      }
    }
    if (props.isLoaded) {
      callToChartMangaer();
    }
  }, [JSON.stringify(props.widget), JSON.stringify(props.stationNames), JSON.stringify(props.stationMetadata), props.isLoaded]);

  // If the users changes color mode update echarts color pallete
  useEffect(() => {
    if (!chart) return;
    chart.setOption(chartOptions);
  }, [JSON.stringify(chartOptions), chart]);

  // If the users changes color mode update echarts color pallete
  useEffect(() => {
    if (!chart) return;
    chart.dispose();
    const chartInstance = echarts.init(chartRef.current, colorMode);
    chartInstance.resize({
      width: props.size ? props.size.height : 1100,
      height: props.size ? props.size.width : 410,
    });
    setChart(chartInstance);
  }, [colorMode]);
  // Size
  useEffect(() => {
    if (chart) {
      chart.resize({
        width: props.size ? props.size.height : 1100,
        height: props.size ? props.size.width : 410,
      });
    }
  }, [props.size]);
  return (
    <Box border={colorMode === 'light' ? 'black solid 2px' : 'white solid 2px'} rounded="4" w="1100" h="415" position="relative">
      {props.isLoaded ? <div ref={chartRef} /> : <div className="loader" />}
    </Box>
  );
};
export default EChartsViewer;
