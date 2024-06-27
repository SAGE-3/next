import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import Chart from '../echarts_plots/Chart';
import * as API from '../api/apis';
import { BME_680_METRICS } from '../data/constants';
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

  function createQueries(): { waggleNodes: SensorQuery<SageNodeQueryParams>[]; mesonetStations: SensorQuery<MesonetQueryParams>[] } {
    const queries: { waggleNodes: SensorQuery<SageNodeQueryParams>[]; mesonetStations: SensorQuery<MesonetQueryParams>[] } = {
      waggleNodes: [],
      mesonetStations: [],
    };

    if (BME_680_METRICS.includes(s.metric.waggle)) {
      s.sensors.waggle.forEach((id: string) => {
        queries.waggleNodes.push({
          id,
          query: {
            start: new Date(s.startTime),
            end: new Date(s.endTime),
            filter: {
              name: s.metric.waggle,
              sensor: 'bme680',
              vsn: id,
            },
          },
        });
      });
    } else {
      s.sensors.waggle.forEach((id: string) => {
        queries.waggleNodes.push({
          id,
          query: {
            start: new Date(s.startTime),
            end: new Date(s.endTime),
            filter: {
              name: s.metric.waggle,
              vsn: id,
            },
          },
        });
      });
    }

    if (s.metric.mesonet !== null) {
      s.sensors.mesonet.forEach((id: string) => {
        queries.mesonetStations.push({
          id,
          query: {
            stationId: id,
            start: new Date(s.startTime),
            end: new Date(s.endTime),
            metric: s.metric.mesonet,
          },
        });
      });
    }

    return queries;
  }

  // const queries = {
  //   waggleNodes: [
  //     {
  //       id: 'W097',
  //       query: {
  //         start: new Date(1719268246465),
  //         end: new Date(),
  //         filter: {
  //           name: QUERY_FIELDS.TEMPERATURE.SAGE_NODE,
  //           sensor: 'bme680',
  //           vsn: 'W097',
  //         },
  //       },
  //     },
  //   ],
  //   mesonetStations: [
  //     {
  //       id: '004HI',
  //       query: {
  //         stationId: '004HI',
  //         start: new Date(1719268246465),
  //         end: new Date(),
  //         metric: QUERY_FIELDS.TEMPERATURE.MESONET,
  //       },
  //     },
  //     {
  //       id: '018HI',
  //       query: {
  //         stationId: '018HI',
  //         start: new Date(1719268246465),
  //         end: new Date(),
  //         metric: QUERY_FIELDS.TEMPERATURE.MESONET,
  //       },
  //     },
  //   ],
  // } as { waggleNodes: SensorQuery<SageNodeQueryParams>[]; mesonetStations: SensorQuery<MesonetQueryParams>[] };

  async function fetchData() {
    const queries = createQueries();
    console.log('queries', queries);
    const res = await API.getCombinedSageMesonetData(queries);
    setData(res);
  }

  // When state changes, fetch the data
  useEffect(() => {
    fetchData();
  }, [s]);

  useEffect(() => {
    if (data && data.length > 0) {
      const option: echarts.EChartsCoreOption = {
        title: {
          text: 'Waggle Node vs. Mesonet',
          left: 'center',
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
        dataset: {
          dimensions: Object.keys(data[0]),
          source: data
            ? data.map((d: any) => ({
                ...d,
                time: d.time.replace(',', '\n'),
              }))
            : [],
        },
        legend: {
          orient: 'vertical',
          right: 10,
          top: 50,
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
        },
        yAxis: {},
        grid: {
          bottom: '25%',
          right: '25%',
        },
        renderer: 'svg',
        series: data
          ? Object.keys(data[0])
              .map((key) => ({
                type: 'line',
                symbol: 'none',
              }))
              .slice(1)
          : [],
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
