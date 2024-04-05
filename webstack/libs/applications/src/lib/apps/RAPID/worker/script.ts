import { SageNodeQueryParams, MesonetQueryParams, RAPIDQueries } from '../utils/apis';

export default () => {
  const SAGE_NODE_URL = 'https://data.sagecontinuum.org/api/v1/query';
  /**
   * Get Sage Node data
   * @param query
   * @returns JSON output of Sage Node data
   */
  async function getSageNodeData(query: SageNodeQueryParams) {
    try {
      const res = await fetch(SAGE_NODE_URL, {
        method: 'POST',
        body: JSON.stringify(query),
      });

      const text = await res.text();

      if (!text) return [];

      const metrics = text
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));

      return metrics;
    } catch (error) {
      console.log('Error fetching Sage Node data: ', error);
      return [];
    }
  }

  /**
   * Get formatted Sage Node data
   * @param query
   * @returns
   */
  async function getFormattedSageNodeData(query: SageNodeQueryParams) {
    try {
      const FIVE_MINUTES = 5 * 60 * 1000;

      const metrics = await getSageNodeData(query);
      if (!metrics) return [];

      // Filter data in 5-minute intervals
      let prevTimeStamp = new Date(metrics[0].timestamp).getTime() - FIVE_MINUTES;
      const filteredMetrics = metrics.filter((dataPoint) => {
        if (dataPoint === undefined) return false;

        const currentTimestamp = new Date(dataPoint.timestamp).getTime();
        if (currentTimestamp - prevTimeStamp >= FIVE_MINUTES) {
          const date = new Date(dataPoint.timestamp);
          const minutes = date.getMinutes();
          const seconds = date.getSeconds();

          if (minutes % 5 === 0 && Math.abs(seconds - 0) < 60) {
            prevTimeStamp = currentTimestamp;
            return true;
          }
        }
        return false;
      });

      return filteredMetrics.map((data) => {
        return {
          time: data.timestamp,
          value: data.value,
        };
      });
    } catch (error) {
      console.log('error', error);
      return [];
    }
  }

  // TODO: Change API to one that contains start and end
  /**
   * Get Mesonet data
   * @param query
   * @returns
   */
  async function getMesonetData(query: MesonetQueryParams) {
    try {
      const res = await fetch(
        `https://api.synopticdata.com/v2/stations/timeseries?&stid=004HI&units=metric,speed|kph,pres|mb&recent=${query.time}&24hsummary=1&qc_remove_data=off&qc_flags=on&qc_checks=all&hfmetars=1&showemptystations=1&precip=1&token=07dfee7f747641d7bfd355951f329aba`
      );

      if (!res.ok) throw new Error(`Failed to fetch Mesonet data`);

      const data = await res.json();

      return data;
    } catch (error) {
      console.log('Error fetching Mesonet data: ', error);
      return [];
    }
  }

  /**
   * Get formatted Mesonet data
   * @param query
   * @returns
   */
  async function getFormattedMesonetData(query: MesonetQueryParams) {
    try {
      const data = await getMesonetData(query);

      if (!data) return [];

      const date_time = data?.STATION[0].OBSERVATIONS?.date_time;
      const metric = data?.STATION[0].OBSERVATIONS?.[`${query.metric}`];

      if (!date_time || !metric || date_time?.length !== metric?.length) return [];

      const formattedData = date_time.map((date: string, index: number) => {
        return {
          time: date,
          value: metric[index],
        };
      });

      return formattedData;
    } catch (error) {
      console.log('Error fetching Mesonet data: ', error);
      return [];
    }
  }

  function beautifyDate(date: string) {
    return new Date(date).toLocaleTimeString([], {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      minute: '2-digit',
      hour: '2-digit',
    });
  }
  /**
   * Get combined Sage Node and Mesonet data
   * @param queries
   * @returns
   */
  async function getCombinedSageMesonetData(queries: RAPIDQueries) {
    try {
      // Fetch data from Sage Node and Mesonet
      const sageData = await getFormattedSageNodeData(queries.sageNode);
      const mesonetData = await getFormattedMesonetData(queries.mesonet);

      // Create a hashmap of the data with time as the key if present
      const sageMap = new Map(
        sageData.map((obj: { time: string; value: number }) => [obj.time ? beautifyDate(obj.time) : null, obj.value])
      );
      const mesonetMap = new Map(
        mesonetData.map((obj: { time: string; value: number }) => [obj.time ? beautifyDate(obj.time) : null, obj.value])
      );
      // Combine the times from both datasets into a set
      const combinedTimes = new Set([...mesonetMap.keys(), ...sageMap.keys()]);
      // Sort the times
      const sortedTimes = Array.from(combinedTimes as Set<string>).sort((a: string, b: string) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA.getTime() - dateB.getTime();
      });
      // Use time as the key to combine the data
      const combinedData = sortedTimes.map((time: string) => ({
        time,
        'Sage Node': sageMap.get(time) || null,
        Mesonet: mesonetMap.get(time) || null,
      }));

      return combinedData;
    } catch (error) {
      console.log('Error fetching combined Sage Node and Mesonet data: ', error);
      return [];
    }
  }
  // Run worker and post message
  self.addEventListener('message', async (messageEvent: MessageEvent) => {
    try {
      console.time('Worker run');
      const result = {
        data: await getCombinedSageMesonetData(messageEvent.data),
      };
      console.log('result', result);
      // console.log(e);
      console.timeEnd('Worker run');
      return postMessage({ result });
    } catch (error) {
      console.log('error', error);
      return postMessage({ error });
    }
  });
};
