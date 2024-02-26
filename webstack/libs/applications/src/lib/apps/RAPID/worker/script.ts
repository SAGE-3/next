/**
 * Uses web worker to send API call to prevent main thread from lagging.
 */
export type SageNodeQuery = {
  start: string;
  end?: string;
  filter: {
    name: string;
    sensor: string;
    vsn: string;
  };
};

export type MesonetQuery = {
  start?: string;
  end?: string;
  time: string;
  metric: string;
};

export type RAPIDQueries = {
  sageNode: SageNodeQuery;
  mesonet: MesonetQuery;
};

export default () => {
  async function getSageNodeData(query: SageNodeQuery) {
    console.log('sage node query', query);
    console.log('sage node query stringified', JSON.stringify(query));
    const res = await fetch('https://data.sagecontinuum.org/api/v1/query', {
      method: 'POST',
      body: JSON.stringify(query),
    });

    const data = await res.text();
    // console.log("text data", data);
    const parsedData = data.split('\n').map((line) => {
      // console.log("line", line);
      if (line !== '') {
        return JSON.parse(line);
      }
    });
    // console.log("parsed data", parsedData);
    // const filteredParsedData = parsedData.filter((data) => data !== undefined);

    // Filter data to keep only the first point in each 5-minute interval
    let lastTimestamp = new Date(parsedData[0].timestamp).getTime() - 5 * 60 * 1000; // Initialize to 5 minutes before the first data point
    const filteredParsedData = parsedData.filter((dataPoint) => {
      if (dataPoint === undefined) return false;
      const currentTimestamp = new Date(dataPoint.timestamp).getTime();
      if (currentTimestamp - lastTimestamp >= 5 * 60 * 1000) {
        // 5 minutes in milliseconds
        const date = new Date(dataPoint.timestamp);
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        if (minutes % 5 === 0 && Math.abs(seconds - 0) < 60) {
          // Closest to the 5-minute mark
          lastTimestamp = currentTimestamp;
          return true;
        }
      }
      return false;
    });
    //console.log("filtered parsed data", filteredParsedData);

    const formattedData = filteredParsedData.map((data) => {
      //console.log("sage node date", data.timestamp);
      return {
        x: new Date(data.timestamp).toLocaleTimeString([], {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit',
          minute: '2-digit',
          hour: '2-digit',
        }),
        y: query.filter.name === 'env.pressure' ? data.value / 100 : data.value, // Convert pressure from Pa to millibars
      };
    });
    return formattedData;
  }

  async function getMesonetData(query: MesonetQuery) {
    const res = await fetch(
      `https://api.synopticdata.com/v2/stations/timeseries?&stid=004HI&units=metric,speed|kph,pres|mb&recent=${query.time}&24hsummary=1&qc_remove_data=off&qc_flags=on&qc_checks=all&hfmetars=1&showemptystations=1&precip=1&token=07dfee7f747641d7bfd355951f329aba`
    );

    const data = await res.json();
    // console.log("mesonet data", data);
    // console.log("date_time", data?.STATION[0].OBSERVATIONS["date_time"])

    const date_time = data?.STATION[0].OBSERVATIONS?.date_time?.map((date: string) => {
      return new Date(date).toLocaleTimeString([], {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
        minute: '2-digit',
        hour: '2-digit',
      });
    });

    const metric = data?.STATION[0].OBSERVATIONS?.[`${query.metric}`]?.map((temp: number) => {
      return temp;
    });

    // Mesonet data has date_time and other fields in separate arrays
    if (date_time?.length !== metric?.length) {
      console.log(`date_time and ${metric} are not the same length`);
      return;
    }

    const formattedData = date_time?.map((date: string, index: number) => {
      return {
        x: date,
        y: metric[index],
      };
    });

    return formattedData;
  }

  async function mergeData(data: RAPIDQueries) {
    const sageData = await getSageNodeData(data.sageNode);
    const mesonetData = await getMesonetData(data.mesonet);

    const sageMap = new Map(sageData.map((obj) => [obj.x, obj.y]));
    // console.log("sagemap", sageMap);
    const mesonetMap = new Map(mesonetData.map((obj: { x: string; y: number }) => [obj.x, obj.y]));
    // console.log("mesonetmap", mesonetMap);

    const allXValues = new Set([...mesonetMap.keys(), ...sageMap.keys()]);

    const mergedArray = Array.from(allXValues as Set<string>, (x: string) => ({
      x,
      'Sage Node': sageMap.get(x) || null,
      Mesonet: mesonetMap.get(x) || null,
    }));

    return mergedArray;
  }

  self.addEventListener('message', async (e: MessageEvent) => {
    try {
      // const { num } = e.data;
      // TODO: Use event to pass query to API
      console.log('e', e);
      // console.log(e.data)

      console.time('Worker run');

      const result = {
        data: await mergeData(e.data),
      };
      // console.log(e);
      console.timeEnd('Worker run');
      return postMessage({ result });
    } catch (error) {
      return postMessage({ error });
    }
  });
};
