import { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const s = props.data.state;

  const createQueries = useMemo(() => {
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
  }, [s.metric, s.sensors, s.startTime, s.endTime]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const queries = createQueries;
      console.log('queries', queries);
      const res = await API.getCombinedSageMesonetData(queries);
      setData(res);
    } catch (e) {
      console.log('Error fetching data', e);
    } finally {
      setIsLoading(false);
    }
  }, [createQueries]);

  // When state changes, fetch the data
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  console.log('data', data);

  useEffect(() => {
    if (data && data.length > 0) {
      const option: echarts.EChartsCoreOption = {
        title: {
          text: `${s.metric.name} vs Time`,
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
          name: 'Time',
          nameLocation: 'middle',
          nameGap: 40,
        },
        yAxis: {
          name: s.metric.name,
          nameLocation: 'middle',
          nameGap: 40,
          axisLabel: {
            formatter: (value: number) => {
              if (Math.abs(value) >= 10000) {
                return value.toExponential(2);
              }
              return value;
            },
          },
        },
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

  return data && !isLoading ? <Chart option={option} /> : <LoadingSpinner />;
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
