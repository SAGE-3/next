/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore } from '@sage3/frontend';
import { Button, useColorMode } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

// Styling
import './styling.css';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

import { ChartManager } from './ChartManager';

/* App component for EChartsViewer */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const chartRef = useRef<any>(null);

  const updateState = useAppStore((state) => state.updateState);
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
    console.log(chartInstance);
    chartInstance.resize({
      height: props.data.size.height,
      width: props.data.size.width,
    });
    async function callToChartMangaer() {
      // const options = await ChartManager(s.stationName, s.chartType, s.yAxisAttributes, s.xAxisAttributes, s.transform);
      // if (chartInstance) chartInstance.setOption(options);
    }
    const options = callToChartMangaer();
    setChartStateInstance(chartInstance);
  }, [chartRef, colorMode]);

  useEffect(() => {}, [colorMode, chartStateInstance]);

  useEffect(() => {
    if (chartStateInstance) {
      chartStateInstance.resize({
        width: props.data.size.width,
        height: props.data.size.height,
      });
    }
  }, [props.data.size]);

  return (
    <AppWindow app={props}>
      <>
        <div ref={chartRef} style={{ backgroundColor: 'white' }}></div>
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app EChartsViewer */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
  };
  return (
    <>
      <input onChange={handleChange}></input>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
