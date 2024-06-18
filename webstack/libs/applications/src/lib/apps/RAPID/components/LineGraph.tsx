import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import Chart from '../echarts_plots/Chart';
import * as API from '../utils/apis';
import { QUERY_FIELDS } from '../data/constants';
import { App } from '@sage3/applications/schema';

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

  async function fetchData() {
    const res = await API.getCombinedSageMesonetData({
      sageNode: {
        start: QUERY_FIELDS.TIME['24HR'].SAGE_NODE,
        filter: {
          name: QUERY_FIELDS.TEMPERATURE.SAGE_NODE,
          sensor: 'bme680',
          vsn: 'W097',
        },
      },
      mesonet: {
        metric: QUERY_FIELDS.TEMPERATURE.MESONET,
        time: QUERY_FIELDS.TIME['24HR'].MESONET,
      },
    });
    setData(res);
  }

  useEffect(() => {
    fetchData();
  }, []);

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

  return <>{data ? <Chart option={option} /> : <LoadingSpinner />}</>;
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
