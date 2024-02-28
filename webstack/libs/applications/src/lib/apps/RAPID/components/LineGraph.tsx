import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { RAPIDState } from './ComponentSelector';
import Chart from '../echarts_plots/Chart';

function LineGraph({ s }: RAPIDState) {
  const [option, setOption] = useState({});

  useEffect(() => {
    if (s.metricData) {
      const option = {
        title: {
          text: 'Sage Node vs. Mesonet',
        },
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
          data: ['Sage Node', 'Mesonet'],
        },
        xAxis: {
          data: s.metricData ? [...s.metricData.data.map((d: { x: number; 'Sage Node': number; Mesonet: number }) => d.x)] : [],
        },
        yAxis: {},
        series: [
          {
            name: 'Sage Node',
            type: 'line',
            data: s.metricData
              ? [...s.metricData.data.map((d: { x: number; 'Sage Node': number; Mesonet: number }) => d['Sage Node'])]
              : [],
          },
          {
            name: 'Mesonet',
            type: 'line',
            data: s.metricData.data
              ? [...s.metricData.data.map((d: { x: number; 'Sage Node': number; Mesonet: number }) => d['Mesonet'])]
              : [],
          },
        ],
      };
      setOption(option);
    }
  }, [s.metricData]);

  return <>{s.metricData ? <Chart option={option} /> : <LoadingSpinner />}</>;
}

export default LineGraph;
