import { EChartsCoreOption } from 'echarts';
import { generateOption } from './ChartMaker/generateChart';

type VariableInfo = {
  available_variable_names: string[];
  available_variable_ids: string[];
};

type DataAttributes = {
  attributes: string[];
  transformations: string[];
  chartType: string[];
  available_attribute_info: VariableInfo;
};

type StationInformationProps = {
  [key: string]: DataAttributes;
};

type RawData = {
  [attribute: string]: {
    [date: string]: any;
  };
};

const formatData = (rawData: RawData) => {
  const attributes = Object.keys(rawData);
  const dates = Object.keys(rawData[attributes[0]]);
  attributes.unshift('Date');
  const data = [attributes];
  for (let i = 0; i < dates.length; i++) {
    const dataRow = [dates[i]];

    for (let j = 1; j < attributes.length; j++) {
      dataRow.push(rawData[attributes[j]][dates[i]]);
    }
    data.push(dataRow);
  }
  console.log('FINISHED FORMATDATA:', data);
  return data;
};

const fetchData = async (stationName: string, attributes: string) => {
  const url = `https://api.hcdp.ikewai.org/mesonet/getMeasurements?station_id=${stationName}&var_ids=${attributes}&start_date=2024-04-01T00:00:00-10:00`;
  const headers = { Authorization: 'Bearer 71c5efcd8cfe303f2795e51f01d19c6' };
  try {
    const response = await fetch(url, { headers });
    const data = await response.json();
    console.log('> Fetching data for NLChartGenerator');
    return data;
  } catch (e) {
    console.error('> Error in fetching data:', e);
    return {};
  }
};

export const processStations = async (station_information: StationInformationProps) => {
  const tmpChartOptions: EChartsCoreOption[] = [];

  const stations: string[] = Object.keys(station_information);
  console.log('chart option', stations);

  for (let i = 0; i < stations.length; i++) {
    const stationName = stations[i];
    const attributes = station_information[stations[i]].attributes.filter((attr: string) => attr !== 'Date').join();
    const data = await fetchData(stationName, attributes);
    if (Object.keys(data).length > 0) {
      const formattedData = formatData(data);
      const chartOption: any = generateOption({
        chartName: station_information[stations[i]].chartType[0],
        data: formattedData as string[][],
        attributes: station_information[stations[i]].attributes,
        transformations: station_information[stations[i]].transformations,
      });
      tmpChartOptions.push(chartOption);
    }
  }
  return tmpChartOptions;
};
