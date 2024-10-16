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
  const resizeObserver = useRef<ResizeObserver | null>(null);

  const destroyChart = () => {
    chartRef.current?.dispose();
  };

  const generateChartImage = () => {
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
    }
  };

  useEffect(() => {
    const render = () => {
      chartRef.current = echarts.init(divRef.current, null, { renderer: 'svg' });
      chartRef.current.setOption(option);
    };
    render();

    return () => {
      destroyChart();
    };
  }, [option]);

  //  Resize chart when window or parent div is resized
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    });

    if (divRef.current) {
      resizeObserver.observe(divRef.current);
    }
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (chartRef.current && divRef.current) {
      resizeObserver.current = new ResizeObserver(() => {
        generateChartImage();
      });
      resizeObserver.current.observe(divRef.current);
    }

    return () => {
      // Clean up ResizeObserver
      if (resizeObserver.current && divRef.current) {
        resizeObserver.current.unobserve(divRef.current);
        resizeObserver.current.disconnect();
      }
    };
  }, [divRef.current, chartRef.current]);

  return (
    <Box
      height="100%"
      width="100%"
      position="relative"
      onMouseEnter={() => {
        generateChartImage();
      }}
    >
      <Box ref={divRef} height="100%" width="100%" background="white" />
    </Box>
  );
}

export default React.memo(Chart);
