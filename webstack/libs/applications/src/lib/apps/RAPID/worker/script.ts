/**
 * Uses web worker to send API call to prevent main thread from lagging.
 */
export default () => {
  async function getSageNodeData() {
    const res = await fetch('https://data.sagecontinuum.org/api/v1/query', {
      method: 'POST',
      body: JSON.stringify({
        start: '-24h',
        filter: {
          name: 'env.temperature',
          vsn: 'W097',
        },
      }),
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
        y: data.value,
      };
    });
    return formattedData;
  }

  async function getMesonetData() {
    const res = await fetch(
      'https://api.synopticdata.com/v2/stations/timeseries?&stid=004HI&units=metric,speed|kph,pres|mb&recent=1440&24hsummary=1&qc_remove_data=off&qc_flags=on&qc_checks=all&hfmetars=1&showemptystations=1&precip=1&token=07dfee7f747641d7bfd355951f329aba'
    );
    // console.log("mesonet token", import.meta.env.VITE_MESONET_PUBLIC_TOKEN);
    const data = await res.json();
    //console.log("mesonet data", data);

    const date_time = data?.STATION[0].OBSERVATIONS?.date_time?.map((date: string) => {
      return new Date(date).toLocaleTimeString([], {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
        minute: '2-digit',
        hour: '2-digit',
      });
    });

    const air_temp = data?.STATION[0].OBSERVATIONS?.air_temp_set_1?.map((temp: number) => {
      return temp;
    });

    // Mesonet data has date_time and other fields in separate arrays
    if (date_time?.length !== air_temp?.length) {
      console.log('date_time and air_temp are not the same length');
      return;
    }

    const formattedData = date_time?.map((date: string, index: number) => {
      return {
        x: date,
        y: air_temp[index],
      };
    });

    return formattedData;
  }

  async function mergeData() {
    const sageData = await getSageNodeData();
    const mesonetData = await getMesonetData();

    const sageMap = new Map(sageData.map(obj => [obj.x, obj.y]));
    console.log("sagemap", sageMap);
    const mesonetMap = new Map(mesonetData.map((obj: { x: string; y: number; }) => [obj.x, obj.y]));
    console.log("mesonetmap", mesonetMap);

    const allXValues = new Set([...mesonetMap.keys(), ...sageMap.keys()]);

    const mergedArray = Array.from((allXValues as Set<string>), (x: string) => ({
      x,
      "Sage Node": sageMap.get(x) || null,
      "Mesonet": mesonetMap.get(x) || null,
    }));

    return mergedArray;
  }

  self.addEventListener('message', async (e: MessageEvent) => {
    try {
      // const { num } = e.data;
      // TODO: Use event to pass query to API
      console.log("e", e);

      console.time('Worker run');

      const result = {
        data: await mergeData(),
      };
      // console.log(e);
      console.timeEnd('Worker run');
      return postMessage({ result });
    } catch (error) {
      return postMessage({ error });
    }
  });
};
