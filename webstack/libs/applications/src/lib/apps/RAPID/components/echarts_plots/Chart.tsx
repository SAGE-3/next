import React from 'react';
import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';
import { EChartsType } from 'echarts';
import { EChartsCoreOption } from 'echarts';
import { Box } from '@chakra-ui/react';

type ChartProps = {
  option: EChartsCoreOption;
};

function Chart({ option }: ChartProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>();

  const destroyChart = () => {
    chartRef.current?.dispose();
  };

  //Resize chart when window or parent div is resized
  // useEffect(() => {
  //   const resizeObserver = new ResizeObserver(() => {
  //     if (chartRef.current) {
  //       chartRef.current.resize();
  //     }
  //   });

  //   if (divRef.current) {
  //     resizeObserver.observe(divRef.current);
  //   }
  //   console.log("rerendering");
  //   return () => {
  //     resizeObserver.disconnect();
  //   };
  // }, []);

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

  return <Box ref={divRef} height="100%" width="100%" />;
}

export default React.memo(Chart);
