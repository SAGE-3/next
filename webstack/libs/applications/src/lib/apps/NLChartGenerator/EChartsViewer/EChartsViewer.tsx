import React, { useEffect, useRef, useState } from 'react';
import { useColorMode } from '@chakra-ui/react';
import { App } from '../../../schema';
// EChart imports
import * as echarts from 'echarts';
import { processStations } from '../utils';

const EChartsViewer = (props: { option: any; size?: { width: number; height: number } }): JSX.Element => {
  const [chartStateInstance, setChartStateInstance] = useState<echarts.ECharts | null>(null);
  const { colorMode } = useColorMode();

  const chartRef = useRef<any>(null);

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
    if (props.size) {
      chartInstance.resize({
        height: props.size.height,
        width: props.size.width,
      });
    } else {
      chartInstance.resize({
        height: 230,
        width: 800,
      });
    }

    const awaitProcessStations = async () => {
      if (chartInstance) chartInstance.setOption(props.option);
    };
    awaitProcessStations();

    // Set the chart options
    setChartStateInstance(chartInstance);
  }, [chartRef, colorMode]);

  return (
    <>
      <div ref={chartRef} style={{ backgroundColor: 'white' }}></div>
    </>
  );
};

export default EChartsViewer;
