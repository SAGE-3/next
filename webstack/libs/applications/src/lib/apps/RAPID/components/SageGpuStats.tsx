import React from 'react';
import { useEffect, useState } from 'react';
import Chart from './echarts_plots/Chart';
import { apiUrls } from '@sage3/frontend';
import { AppState } from '../../../types';
import { Box } from '@chakra-ui/react';

function SageGpuStats({ s }: AppState) {
  const [option, setOption] = useState({});
  const [data, setData] = useState([]);
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(apiUrls.rapid.sageGpuStats);
        const resData = await res.json();
        setData(resData.data);
      } catch (error) {
        console.log('error', error);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    const option: echarts.EChartsCoreOption = {
      title: {
        text: 'Sage Gpu % Over Past Hour',
      },
      animation: false,
      tooltip: {
        trigger: 'axis',
      },
      toolbox: {
        show: true,
        feature: {
          saveAsImage: {
            show: true,
            title: 'Save as Image',
          },
        },
      },
      legend: {
        data: ['GPU %'],
      },
      xAxis: {
        data: data ? [...data.map((d: { x: string; y: number }) => new Date(d.x).toLocaleTimeString())] : [],
        name: 'Time',
      },
      yAxis: {
        name: 'GPU %',
        position: 'left',
      },
      renderer: 'svg',
      series: [
        {
          name: 'GPU %',
          type: 'line',
          data: data ? [...data.map((d: { x: string; y: number }) => d.y)] : [],
          large: true,
          showSymbol: false,
        },
      ],
    };
    setOption(option);
  }, [data]);

  return data ? (
    <Box width="100%" height="100%" bg="white" padding="5">
      <Chart option={option} />
    </Box>
  ) : (
    <div>Loading...</div>
  );
}

export default SageGpuStats;
