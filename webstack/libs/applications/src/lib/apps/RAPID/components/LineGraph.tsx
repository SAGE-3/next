import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import Chart from './echarts_plots/Chart';
import { AppState } from '../../../types';
import { Box } from '@chakra-ui/react';

function LineGraph({ s }: AppState) {
  const [option, setOption] = useState({});
  console.log('s.metricData', s.metricData);

  useEffect(() => {
    if (s.metricData) {
      const option: echarts.EChartsCoreOption = {
        title: {
          text: 'Sage Node vs. Mesonet',
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
            dataZoom: {
              yAxisIndex: false,
            },
          },
        },
        legend: {
          data: ['Sage Node', 'Mesonet'],
        },
        xAxis: {
          data: s.metricData
            ? [...s.metricData.data.map((d: { x: string; 'Sage Node': number; Mesonet: number }) => d.x.replace(', ', '\n'))]
            : [],
          name: 'Time',
        },
        yAxis: {
          name: s.metric.NAME,
          position: 'left',
        },
        grid: {
          bottom: '25%',
        },
        renderer: 'svg',
        series: [
          {
            name: 'Sage Node',
            type: 'line',
            data: s.metricData
              ? [...s.metricData.data.map((d: { x: string; 'Sage Node': number; Mesonet: number }) => d['Sage Node'])]
              : [],
            large: true,
          },
          {
            name: 'Mesonet',
            type: 'line',
            data: s.metricData.data
              ? [...s.metricData.data.map((d: { x: string; 'Sage Node': number; Mesonet: number }) => d['Mesonet'])]
              : [],
            large: true,
          },
        ],
        dataZoom: [
          {
            type: 'inside',
          },
          {
            type: 'slider',
          },
        ],
      };
      setOption(option);
    }
  }, [s.metricData]);

  return (
    <Box height="100%" width="100%">
      {s.metricData ? (
        <Box height="100%" width="100%" display="flex" flexDirection="column" bg="white" padding="5">
          <Chart option={option} />
          <Box color="#323232" fontWeight="bold" textAlign="center">Last Updated: {new Date(s.lastUpdated).toLocaleString()}</Box>
        </Box>
      ) : (
        <LoadingSpinner />
      )}
    </Box>
  );
}

export default LineGraph;
