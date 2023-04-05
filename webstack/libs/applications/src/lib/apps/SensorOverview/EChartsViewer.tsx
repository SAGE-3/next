/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Spinner, useColorMode } from '@chakra-ui/react';
import * as echarts from 'echarts';
import { ChartManager } from '../EChartsViewer/ChartManager';

const EChartsViewer = (props: {
  stationNames: string[];
  visualizationType: string;
  dateRange: string;
  yAxisNames: string[];
  xAxisNames: string[];
  showDeleteButton?: boolean;
  handleDeleteWidget?: (index: number) => void;
  index?: number;
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

    async function callToChartMangaer() {
      const options = await ChartManager(props.stationNames, 'line', props.yAxisNames, props.xAxisNames);
      if (chartInstance) chartInstance.setOption(options);
    }
    console.log(props);
    const options = callToChartMangaer();
    setChartStateInstance(chartInstance);
  }, [chartRef, props.yAxisNames, props.xAxisNames]);

  useEffect(() => {
    if (chartStateInstance) {
      echarts.dispose(chartStateInstance);
    }
  }, [colorMode]);
  return (
    <Box border={'white solid 3px'} rounded="1rem">
      {props.showDeleteButton ? (
        <Button
          onClick={() => {
            if (props.handleDeleteWidget) props.handleDeleteWidget(props.index ? props.index : 0);
          }}
        >
          Delete
        </Button>
      ) : null}
      <div
        ref={chartRef}
        style={{
          height: '400px',
          width: '1000px',
          // transform: 'translate(-400px, 0px)',
          margin: '1rem',
          borderRadius: '1rem',
        }}
      ></div>
    </Box>
  );
};

export default EChartsViewer;
