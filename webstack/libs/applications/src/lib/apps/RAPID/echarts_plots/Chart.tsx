import React from 'react';
import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';
import { EChartsType } from 'echarts';
import { EChartsCoreOption } from 'echarts';
import { Box, Button } from '@chakra-ui/react';
import useEchartsStore from '../store/echartsStore';

type ChartProps = {
  option: EChartsCoreOption;
};

function Chart({ option }: ChartProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>();
  const updateChartDataURL = useEchartsStore((state) => state.updateChartDataURL);

  const chartDataURL = useEchartsStore((state) => state.chartDataURL);

  const destroyChart = () => {
    chartRef.current?.dispose();
  };

  useEffect(() => {
    const render = () => {
      chartRef.current = echarts.init(divRef.current, null, { renderer: 'svg' });
      chartRef.current.setOption(option);
    };
    render();
    console.log('rerendering');

    return () => {
      console.log('destroying chart');
      destroyChart();
    };
  }, [option]);

  useEffect(() => {
    if (chartRef.current && divRef.current) {
      const base64 = chartRef.current.getDataURL({
        pixelRatio: 2,
        type: 'svg',
        backgroundColor: '#fff', // Ensure white background
        excludeComponents: ['toolbox', 'dataZoom'],
      });

      const svgRect = divRef.current.getBoundingClientRect();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = svgRect.width || 0;
      canvas.height = svgRect.height || 0;

      const img = new Image();
      img.src = base64;

      img.onload = () => {
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngBase64 = canvas.toDataURL('image/png');
        updateChartDataURL(pngBase64);
      };

      canvas.remove();

      img.onerror = (error) => {
        console.error('Image loading error:', error);
      };
    } else {
      console.error('chartRef or divRef is not available');
    }
  }, [divRef.current, chartRef.current]);

  return (
    <Box height="100%" width="100%" position="relative">
      <Box ref={divRef} height="100%" width="100%" background="white" />
    </Box>
  );
}

export default React.memo(Chart);
