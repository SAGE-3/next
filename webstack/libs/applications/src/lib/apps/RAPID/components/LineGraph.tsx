import { useState, useEffect, useMemo, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';
import Chart from '../echarts_plots/Chart';
import * as API from '../api/apis';
import { BME_680_METRICS } from '../data/constants';
import { App, AppState } from '@sage3/applications/schema';
import { SensorQuery } from '../api/apis';
import { SageNodeQueryParams, MesonetQueryParams } from '../api/apis';
import useEchartsStore from '../store/echartsStore';
import { useAppStore, useAssetStore } from '@sage3/frontend';
import { apiUrls } from '@sage3/frontend';
import { initialValues } from '@sage3/applications/initialValues';
import { Box, Button } from '@chakra-ui/react';

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
  const chartDataURL = useEchartsStore((state) => state.chartDataURL);
  const createApp = useAppStore((state) => state.create);

  // Uploading image to assets
  // const uploadImage = async () => {
  //   if (!chartDataURL) return;

  //   const base64data = chartDataURL.split(',')[1];

  //   // convert to blob
  //   const byteCharacters = atob(base64data);
  //   const byteNumbers = new Array(byteCharacters.length);
  //   for (let i = 0; i < byteCharacters.length; i++) {
  //     byteNumbers[i] = byteCharacters.charCodeAt(i);
  //   }
  //   const byteArray = new Uint8Array(byteNumbers);
  //   const blob = new Blob([byteArray], { type: 'image/png' });
  //   console.log('blob', blob);

  //   // make file
  //   const file = new File([blob], 'chart.png', { type: 'image/png' });
  //   console.log('file', file);

  //   // create form data
  //   const fd = new FormData();
  //   fd.append('files', file);
  //   fd.append('room', props.data.roomId!);

  //   try {
  //     const res = await fetch(apiUrls.assets.upload, {
  //       method: 'POST',
  //       body: fd,
  //     });

  //     if (!res.ok) {
  //       throw new Error(`HTTP error! status: ${res.status}`);
  //     }

  //     const data = await res.json();
  //     console.log('res', data);
  //     return data;
  //   } catch (error) {
  //     console.error('Error uploading image:', error);
  //     throw error;
  //   }
  // };

  const createChartImage = () => {
    // uploadImage();
    if (chartDataURL) {
      const init = { assetid: chartDataURL };
      createApp({
        title: 'RAPID',
        roomId: props.data.roomId!,
        boardId: props.data.boardId!,
        position: {
          x: props.data.position.x + props.data.size.width,
          y: props.data.position.y,
          z: 0,
        },
        size: {
          width: props.data.size.width,
          height: props.data.size.height,
          depth: 0,
        },
        type: 'ImageViewer',
        rotation: { x: 0, y: 0, z: 0 },
        state: {
          ...(initialValues['ImageViewer'] as AppState),
          ...init,
        },
        raised: true,
        dragging: false,
        pinned: false,
      });
    }
  };

  return (
    <Box>
      <Button size="xs" onClick={createChartImage} mx="2">
        Open to Side
      </Button>
    </Box>
  );
}

LineGraph.AppComponent = AppComponent;
LineGraph.ToolbarComponent = ToolbarComponent;

export default LineGraph;
