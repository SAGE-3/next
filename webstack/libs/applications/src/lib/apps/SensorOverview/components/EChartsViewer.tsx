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
  dateStart: string;
  dateEnd: string;
  yAxisNames: string[];
  xAxisNames: string[];
  showDeleteButton?: boolean;
  handleDeleteWidget?: (index: number) => void;
  index?: number;
  size: { width: number; height: number; depth: number };
}) => {
  const chartRef = useRef<any>(null);
  const [chartStateInstance, setChartStateInstance] = useState<echarts.ECharts | null>(null);
  const { colorMode } = useColorMode();

  useEffect(() => {
    if (!chartRef.current) return;
    let chartInstance: echarts.ECharts | null = null;
    const renderInstance = echarts.getInstanceByDom(chartRef.current);
    if (renderInstance) {
      chartInstance = renderInstance;
    } else {
      chartInstance = echarts.init(chartRef.current, colorMode);
    }
    chartInstance.resize({
      height: props.size.height - 175,
      width: props.size.width - 25,
    });
    async function callToChartMangaer() {
      const options = await ChartManager(props.stationNames, props.visualizationType, props.yAxisNames, props.xAxisNames);
      if (chartInstance) chartInstance.setOption(options);
    }
    const options = callToChartMangaer();
    setChartStateInstance(chartInstance);
  }, [chartRef, props.yAxisNames, props.xAxisNames, props.visualizationType]);

  // TODO Duplicate code. I tried adding this to the useEffect above but it would
  // Rerender every time I moved the chart
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
      height: props.size.height - 200,
      width: props.size.width - 75,
    });
    async function callToChartMangaer() {
      const options = await ChartManager(props.stationNames, props.visualizationType, props.yAxisNames, props.xAxisNames);
      if (chartInstance) chartInstance.setOption(options);
    }
    const options = callToChartMangaer();
    setChartStateInstance(chartInstance);
  }, [colorMode]);

  useEffect(() => {
    if (chartStateInstance) {
      chartStateInstance.resize({
        height: props.size.height - 200,
        width: props.size.width - 75,
      });
    }
  }, [props.size]);

  return (
    <Box border={colorMode === 'light' ? 'black solid 5px' : 'white solid 5px'} rounded="1rem">
      {props.showDeleteButton ? (
        <Button
          onClick={() => {
            if (props.handleDeleteWidget) props.handleDeleteWidget(props.index ? props.index : 0);
          }}
        >
          Delete
        </Button>
      ) : null}
      <div ref={chartRef}></div>
    </Box>
  );
};

export default EChartsViewer;
