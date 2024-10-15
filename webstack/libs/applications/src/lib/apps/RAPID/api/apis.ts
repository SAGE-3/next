import { METRICS } from '../data/constants';

const SAGE_NODE_URL = 'https://data.sagecontinuum.org/api/v1/query';
// const SAGE_NODE_STREAM_URL = ''; // to be added later
const MESONET_TOKEN = '07dfee7f747641d7bfd355951f329aba';

// Types
export interface SageNodeQueryParams {
  start: Date;
  end: Date;
  filter?: {
    name?: string;
    sensor?: string;
    vsn?: string;
  };
}

export interface MesonetQueryParams {
  stationId: string;
  start: Date;
  end: Date;
  time?: string;
  metric?: string;
}

export interface RAPIDQueries {
  waggleNodes: SageNodeQueryParams[];
  mesonetStations: MesonetQueryParams[];
}

interface DataPoint {
  time: string;
  value: number;
}

export interface SensorQuery<T> {
  id: string;
  query: T;
}

export type ResultDataPoint = {
  time: string;
  'Waggle Node': number;
  Mesonet: number;
};

const conversionMetersPerSecondToKmPerHr = 3.6;

// Utility functions
const handleFetchError = (context: string) => (error: Error) => {
  console.error(`Error ${context}:`, error);
  return [];
};

const beautifyDate = (date: string): string => {
  return new Date(date).toLocaleTimeString([], {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    minute: '2-digit',
    hour: '2-digit',
  });
};

// Waggle Node functions
export const getSageNodeData = async (query: SageNodeQueryParams): Promise<any[]> => {
  try {
    const { start, end, filter } = query;

    const res = await fetch(SAGE_NODE_URL, {
      method: 'POST',
      body: JSON.stringify({
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        filter,
      }),
    });
    const text = await res.text();

    const parsedData = text
      .trim()
      .split('\n')
      .map((line) => {
        return JSON.parse(line);
      })
      .filter((data) => data !== null);
    return text ? parsedData : [];
  } catch (error) {
    return handleFetchError('fetching Waggle Node data')(error as Error);
  }
};

export const getFormattedSageNodeData = async (query: SageNodeQueryParams): Promise<DataPoint[]> => {
  try {
    // Define constant for 5 minutes in milliseconds
    const FIVE_MINUTES = 5 * 60 * 1000;
    // Fetch raw Waggle Node data
    const metrics = await getSageNodeData(query);
    // Return empty array if no metrics are found
    if (!metrics.length) return [];
    // Initialize the previous timestamp to 5 minutes before the first data point
    let prevTimeStamp = new Date(metrics[0].timestamp).getTime() - FIVE_MINUTES;
    // Filter metrics to get data points at 5-minute intervals
    const filteredMetrics = metrics.filter((dataPoint: any) => {
      // Skip undefined data points
      if (!dataPoint) return false;
      // Get the timestamp of the current data point
      const currentTimestamp = new Date(dataPoint.timestamp).getTime();
      // Check if at least 5 minutes have passed since the last accepted data point
      if (currentTimestamp - prevTimeStamp >= FIVE_MINUTES) {
        const date = new Date(dataPoint.timestamp);
        // Check if the current time is on a 5-minute mark (0, 5, 10, etc.)
        // and within 60 seconds of the exact minute mark for flexibility
        if (date.getMinutes() % 5 === 0 && Math.abs(date.getSeconds()) < 60) {
          // Update the previous timestamp and include this data point
          prevTimeStamp = currentTimestamp;
          return true;
        }
      }
      // Exclude this data point if it doesn't meet the criteria
      return false;
    });
    // Format the filtered metrics into the required structure

    if (query.filter?.name === 'env.pressure') {
      return filteredMetrics.map((data: any) => ({
        time: data.timestamp,
        value: data.value / 100,
      }));
    }

    if (query.filter?.name === 'wxt.wind.speed') {
      return filteredMetrics.map((data: any) => ({
        time: data.timestamp,
        value: Number((data.value * conversionMetersPerSecondToKmPerHr).toFixed(2)),
      }));
    }

    return filteredMetrics.map((data: any) => ({ time: data.timestamp, value: data.value }));
  } catch (error) {
    // Handle any errors that occur during the process
    return handleFetchError('formatting Waggle Node data')(error as Error);
  }
};

// Mesonet functions
export const getMesonetStations = async (): Promise<any> => {
  try {
    const res = await fetch(
      `https://api.synopticdata.com/v2/stations/metadata?&network=275&sensorvars=1&complete=1&token=${MESONET_TOKEN}`
    );
    return res.json();
  } catch (error) {
    return handleFetchError('fetching Mesonet stations')(error as Error);
  }
};

export const getMesonetData = async (query: MesonetQueryParams): Promise<any> => {
  try {
    // converts date to UTC and formats it to Mesonet's required format
    const convertToMesonetDateFormat = (inputDate: Date) => {
      // Get year, month, day, hours, and minutes from the inputDate
      const year = inputDate.getUTCFullYear().toString();
      const month = (inputDate.getUTCMonth() + 1).toString().padStart(2, '0'); // Months are zero based
      const day = inputDate.getUTCDate().toString().padStart(2, '0');
      const hours = inputDate.getUTCHours().toString().padStart(2, '0');
      const minutes = inputDate.getUTCMinutes().toString().padStart(2, '0');

      // Form the YYYYmmddHHMM format string
      const formattedTime = year + month + day + hours + minutes;

      return formattedTime;
    };

    const res = await fetch(
      `https://api.synopticdata.com/v2/stations/timeseries?&start=${convertToMesonetDateFormat(
        query.start
      )}&end=${convertToMesonetDateFormat(query.end)}&stid=${
        query.stationId
      }&units=metric,speed|kph,pres|mb&r&qc_remove_data=off&qc_flags=on&qc_checks=all&hfmetars=1&showemptystations=1&precip=1&token=${MESONET_TOKEN}`
    );
    if (!res.ok) throw new Error('Failed to fetch Mesonet data');
    const mesonetData = await res.json();

    return mesonetData;
  } catch (error) {
    return handleFetchError('fetching Mesonet data')(error as Error);
  }
};

export const getFormattedMesonetData = async (query: MesonetQueryParams): Promise<DataPoint[]> => {
  try {
    const data = await getMesonetData(query);
    if (!data) return [];

    const date_time = data?.STATION[0].OBSERVATIONS?.date_time;
    const metric = data?.STATION[0].OBSERVATIONS?.[`${query.metric}`];

    if (!date_time || !metric || date_time.length !== metric.length) return [];

    return date_time.map((date: string, index: number) => ({
      time: date,
      value: metric[index],
    }));
  } catch (error) {
    return handleFetchError('formatting Mesonet data')(error as Error);
  }
};

// Combined data function
export const getCombinedSageMesonetData = async (queries: {
  waggleNodes: SensorQuery<SageNodeQueryParams>[];
  mesonetStations: SensorQuery<MesonetQueryParams>[];
}): Promise<Record<string, number | string | null>[]> => {
  try {
    const sagePromises = queries.waggleNodes.map(({ id, query }) =>
      getFormattedSageNodeData(query).then((data) => ({ id, type: 'Waggle Node', data }))
    );
    const mesonetPromises = queries.mesonetStations.map(({ id, query }) =>
      getFormattedMesonetData(query).then((data) => ({ id, type: 'Mesonet', data }))
    );

    const results = await Promise.allSettled([...sagePromises, ...mesonetPromises]);

    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<{ id: string; type: string; data: DataPoint[] }> => result.status === 'fulfilled')
      .map((result) => result.value);

    if (successfulResults.length === 0) {
      console.warn('All data fetching failed.');
      return [];
    }

    const sensorMaps = new Map<string, Map<string, number | string | null>>();

    successfulResults.forEach(({ id, type, data }) => {
      const sensorKey = `${type} - ${id}`;
      const dataMap = new Map(data.map((obj) => [beautifyDate(obj.time), obj.value]));
      sensorMaps.set(sensorKey, dataMap);
    });

    const combinedTimes = new Set(Array.from(sensorMaps.values()).flatMap((map) => Array.from(map.keys())));
    const sortedTimes = Array.from(combinedTimes).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return sortedTimes.map((time) => {
      const dataPoint: Record<string, number | string | null> = { time };
      sensorMaps.forEach((dataMap, sensorKey) => {
        dataPoint[sensorKey] = dataMap.get(time) ?? null;
      });
      return dataPoint;
    });
  } catch (error) {
    console.error('Error in getCombinedSageMesonetData:', error);
    return [];
  }
};
