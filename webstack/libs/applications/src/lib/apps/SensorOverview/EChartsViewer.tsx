/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useColorMode } from '@chakra-ui/react';
import * as echarts from 'echarts';
import { ChartManager } from '../EChartsViewer/ChartManager';

const EChartsViewer = (props: { stationNames: string[]; visualizationType: string; dateRange: string; variableType: string }) => {
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

    async function callToChartMangaer() {
      const options = await ChartManager(props.stationNames, 'line', [props.variableType], ['date_time']);
      if (chartInstance) chartInstance.setOption(options);
    }
    const options = callToChartMangaer();
    setChartStateInstance(chartInstance);
  }, [chartRef, colorMode, props.variableType]);

  return (
    <div
      ref={chartRef}
      style={{
        height: '400px',
        width: '1200px',
        // transform: 'translate(-400px, 0px)',
        margin: '1rem',
        border: '10px grey solid',
        borderRadius: '1rem',
      }}
    ></div>
  );
};

export default EChartsViewer;
