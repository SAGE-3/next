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
  const outboxRef = useRef<any>(null);
  // Echart options
  const [chartOptions, setChartOptions] = useState<echarts.EChartsCoreOption | null>(null);
  // Users SAGE 3 color mode
  const { colorMode } = useColorMode();
  const [variableNames, setVariableNames] = useState<any>([]);

  // useEffect(() => {
  //   setVariableNames(Object.keys(props.stationMetadata[0].OBSERVATIONS));
  // }, []);
  // console.log(variableNames);

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
    chartInstance.resize({ width, height });

    chartInstance.setOption(chartOptions);
  }, [chartRef.current, outboxRef.current, colorMode, chartOptions]);

  // Props update
  useEffect(() => {
    async function callToChartMangaer() {
      const options = await ChartManager(
        props.stationNames,
        props.widget.visualizationType,
        props.widget.yAxisNames,
        props.widget.xAxisNames,
        colorMode,
        props.widget.startDate,

        props.stationMetadata
      );
      setChartOptions(options);
    }
    if (props.isLoaded) {
      callToChartMangaer();
    }
  }, [JSON.stringify(props.widget), JSON.stringify(props.stationNames), JSON.stringify(props.stationMetadata), props.isLoaded, colorMode]);

  // useEffect(() => {
  //   if (!outboxRef.current || !chartRef.current) return;
  //   const chart = echarts.getInstanceByDom(chartRef.current);
  //   if (chart) {

  //   }
  // }, [outboxRef.current, chartRef.current]);

  return (
    <Box w="100%" h="100%" display="flex" flexDir="column" alignItems="center" justifyContent={'center'} ref={outboxRef}>
      {props.isLoaded ? (
        <>
          <div ref={chartRef} />
        </>
      ) : (
        <Box transform={`scale(8) translateY(3px)`}>
          <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color={'teal'} size="xl" />
        </Box>
      )}
      {/* // <div className="loader" /> */}
    </Box>
  );
};
export default EChartsViewer;
