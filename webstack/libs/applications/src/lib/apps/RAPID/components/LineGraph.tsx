import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { RAPIDState } from './ComponentSelector';
import Chart from '../echarts_plots/Chart';

function LineGraph({ s }: RAPIDState) {
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

  return <>{s.metricData ? <Chart option={option} /> : <LoadingSpinner />}</>;
}

export default LineGraph;
