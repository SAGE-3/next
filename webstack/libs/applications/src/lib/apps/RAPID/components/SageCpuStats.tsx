/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import Chart from './echarts_plots/Chart';
import { apiUrls } from '@sage3/frontend';
import { AppState } from '../../../types';
import { Box } from '@chakra-ui/react';
import LoadingSpinner from './LoadingSpinner';

function SageCpuStats({ s }: AppState) {
  const [option, setOption] = useState({});
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(apiUrls.rapid.sageCpuStats);
        const resData = await res.json();
        setData(resData.data);
        console.log('sage cpu stats', resData.data);
      } catch (error) {
        console.log('error', error);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (data) {
      const option: echarts.EChartsCoreOption = {
        title: {
          text: 'Sage CPU % Over Past Hour',
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
        xAxis: {
          data: data.core_1 ? [...data.core_1.map((d: any) => new Date(d.timestamp).toLocaleTimeString())] : [],
          name: 'Time',
        },
        yAxis: {
          name: 'CPU %',
          position: 'left',
        },
        renderer: 'svg',
        // legend: ['Core 1', 'Core 2', 'Core 3', 'Core 4', 'Core 5'],
        series: [
          {
            name: 'Core 1',
            type: 'line',
            data: data.core_1 ? [...data.core_1.map((d: any) => d.value)] : [],
            large: true,
            showSymbol: false,
          },
          {
            name: 'Core 2',
            type: 'line',
            data: data.core_2 ? [...data.core_2.map((d: any) => d.value)] : [],
            large: true,
            showSymbol: false,
          },
          {
            name: 'Core 3',
            type: 'line',
            data: data.core_3 ? [...data.core_3.map((d: any) => d.value)] : [],
            large: true,
            showSymbol: false,
          },
          {
            name: 'Core 4',
            type: 'line',
            data: data.core_4 ? [...data.core_4.map((d: any) => d.value)] : [],
            large: true,
            showSymbol: false,
          },
          {
            name: 'Core 5',
            type: 'line',
            data: data.core_5 ? [...data.core_5.map((d: any) => d.value)] : [],
            large: true,
            showSymbol: false,
          },
        ],
      };
      setOption(option);
    }
  }, [data]);

  return data ? (
    <Box width="100%" height="100%" bg="white" padding="5">
      <Chart option={option} />
    </Box>
  ) : (
    <LoadingSpinner />
  );
}

export default SageCpuStats;
