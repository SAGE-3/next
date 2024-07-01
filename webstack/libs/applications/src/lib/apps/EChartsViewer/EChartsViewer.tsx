/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Sage Imports
import { useAppStore } from '@sage3/frontend';
import { useColorMode } from '@chakra-ui/react';
import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

// EChart imports
import * as echarts from 'echarts';

// Styling
import './styling.css';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

/* App component for EChartsViewer */
function AppComponent(props: App): JSX.Element {
  const chartRef = useRef<any>(null);
  const [chartStateInstance, setChartStateInstance] = useState<echarts.ECharts | null>(null);
  const { colorMode } = useColorMode();
  const s = props.data.state as AppState;

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
      height: props.data.size.height,
      width: props.data.size.width,
    });
    if (chartInstance) chartInstance.setOption(s.options);

    setChartStateInstance(chartInstance);
  }, [chartRef, colorMode]);

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
  return <></>;
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
