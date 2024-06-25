import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import Chart from '../echarts_plots/Chart';
import * as API from '../api/apis';
import { QUERY_FIELDS } from '../data/constants';
import { App } from '@sage3/applications/schema';
import { SensorQuery } from '../api/apis';
import { SageNodeQueryParams, MesonetQueryParams } from '../api/apis';

type LineGraphProps = {
  children: React.ReactNode;
};

function LineGraph({ children }: LineGraphProps) {
  return <>{children}</>;
}

function AppComponent(props: App) {
  const [data, setData] = useState<any>(null);
  const [option, setOption] = useState<any>({});
  const s = props.data.state;

  const queries = {
    sageNodes: [
      {
        id: 'W097',
        query: {
          start: new Date(1719268246465),
          end: new Date(),
          filter: {
            name: QUERY_FIELDS.TEMPERATURE.SAGE_NODE,
            sensor: 'bme680',
            vsn: 'W097',
          },
        },
      },
    ],
    mesonetStations: [
      {
        id: '004HI',
        query: {
          stationId: '004HI',
          start: new Date(1719268246465),
          end: new Date(),
          metric: QUERY_FIELDS.TEMPERATURE.MESONET,
        },
      },
      {
        id: '018HI',
        query: {
          stationId: '018HI',
          start: new Date(1719268246465),
          end: new Date(),
          metric: QUERY_FIELDS.TEMPERATURE.MESONET,
        },
      },
    ],
  } as { sageNodes: SensorQuery<SageNodeQueryParams>[]; mesonetStations: SensorQuery<MesonetQueryParams>[] };

  async function fetchData() {
    const res = await API.getCombinedSageMesonetData(queries);
    setData(res);
  }

  useEffect(() => {
    fetchData();
  }, []);

  console.log('res', data);
  useEffect(() => {
    if (data) {
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
          data: data ? [...data.map((d: { time: string; 'Sage Node': number; Mesonet: number }) => d.time.replace(', ', '\n'))] : [],
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
            data: data ? [...data.map((d: { time: string; 'Sage Node': number; Mesonet: number }) => d['Sage Node'])] : [],
            large: true,
          },
          {
            name: 'Mesonet',
            type: 'line',
            data: data ? [...data.map((d: { time: string; 'Sage Node': number; Mesonet: number }) => d['Mesonet'])] : [],
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
  }, [data]);

  return data ? <Chart option={option} /> : <LoadingSpinner />;
}

function ToolbarComponent(props: App) {
  return (
    <div>
      <button onClick={() => console.log('clicked')}>Click me</button>
    </div>
  );
}

LineGraph.AppComponent = AppComponent;
LineGraph.ToolbarComponent = ToolbarComponent;

export default LineGraph;
