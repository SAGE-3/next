import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { SensorQuery, SageNodeQueryParams, MesonetQueryParams } from '../api/apis';
import { BME_680_METRICS } from '../data/constants';
import LoadingSpinner from './LoadingSpinner';
import { Stat, StatLabel, StatNumber } from '@chakra-ui/stat';
import { Box, Text } from '@chakra-ui/react';
import { App } from '@sage3/applications/schema';
import * as API from '../api/apis';
import { useColorModeValue } from '@chakra-ui/react';
import { useHexColor } from '@sage3/frontend';

type OverviewProps = {
  children: React.ReactNode;
};

function Overview({ children }: OverviewProps) {
  return <>{children}</>;
}

function AppComponent(props: App) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const s = props.data.state;

  const boxColorValue = useColorModeValue('gray.300', '#666666');
  const boxColor = useHexColor(boxColorValue);

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
      // console.log('queries', queries);
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
  }, [JSON.stringify(s)]);

  console.log('data', data);

  const calculateStats = (sensorKey: any, dataArray: any) => {
    const values = dataArray
      .map((timepoint: any) => timepoint[sensorKey])
      .filter((value: any) => value !== null)
      .map((value: any) => Number(value));

    if (values.length === 0) return { avg: null, min: null, max: null };

    return {
      avg: (values.reduce((sum: any, value: any) => sum + value, 0) / values.length).toFixed(2),
      min: Math.min(...values).toFixed(2),
      max: Math.max(...values).toFixed(2),
    };
  };

  const getDateRange = (dataArray: any) => {
    const dates = dataArray.map((d: any) => new Date(d.time));
    const startDate = new Date(Math.min(...dates));
    const endDate = new Date(Math.max(...dates));

    return {
      start: startDate.toLocaleDateString(),
      end: endDate.toLocaleDateString(),
    };
  };

  const getSensorKeys = (dataPoint: any) => {
    return Object.keys(dataPoint).filter((key) => key !== 'time');
  };

  return (
    <>
      {data && !isLoading ? (
        <Box padding="5" display="flex" flexDir="column" height="100%">
          <Box mb="10">
            {data.length > 0 && (
              <Text align="center" fontWeight="bold">
                Measurements from {getDateRange(data).start} to {getDateRange(data).end}
              </Text>
            )}
          </Box>

          <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap="6" className="w-full">
            {getSensorKeys(data[0]).map((sensorKey) => {
              const stats = calculateStats(sensorKey, data);

              return (
                <Box key={sensorKey} p="4" borderWidth="1px" borderRadius="lg" bg={boxColorValue} shadow="md" className="h-full">
                  <Box textAlign="center" mb="4">
                    <h2 className="text-lg font-semibold">{sensorKey}</h2>
                  </Box>
                  <Box display="flex" flexDir="column" gap="4">
                    <Stat>
                      <StatLabel>Average {s.metric.name}</StatLabel>
                      <StatNumber>{stats.avg ?? 'N/A'}</StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel>Min {s.metric.name}</StatLabel>
                      <StatNumber>{stats.min ?? 'N/A'}</StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel>Max {s.metric.name}</StatLabel>
                      <StatNumber>{stats.max ?? 'N/A'}</StatNumber>
                    </Stat>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      ) : (
        <LoadingSpinner />
      )}
    </>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  return <div></div>;
}

Overview.AppComponent = AppComponent;
Overview.ToolbarComponent = ToolbarComponent;

export default Overview;
