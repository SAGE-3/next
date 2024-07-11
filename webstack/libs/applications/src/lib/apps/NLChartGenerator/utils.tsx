import { EChartsCoreOption } from 'echarts';
import { generateOption } from './ChartMaker/generateChart';
import { stationData } from './data/stationData';
import station1 from './data/0603.json';
import station2 from './data/0602.json';
import station3 from './data/0601.json';
import station4 from './data/0521.json';
import station5 from './data/0502.json';
import station6 from './data/0501.json';
import station7 from './data/0412.json';
import station8 from './data/0287.json';
import station9 from './data/0286.json';
import station10 from './data/0283.json';
import station11 from './data/0282.json';
import station12 from './data/0281.json';
import station13 from './data/0252.json';
import station14 from './data/0251.json';
import station15 from './data/0243.json';
import station16 from './data/0242.json';
import station17 from './data/0241.json';
import station18 from './data/0231.json';
import station19 from './data/0213.json';
import station20 from './data/0212.json';
import station21 from './data/0211.json';
import station22 from './data/0202.json';
import station23 from './data/0201.json';
import station24 from './data/0154.json';
import station25 from './data/0153.json';
import station26 from './data/0151.json';
import station27 from './data/0144.json';
import station28 from './data/0131.json';
import station29 from './data/0121.json';
import station30 from './data/0119.json';
import station31 from './data/0118.json';
import station32 from './data/0116.json';
import station33 from './data/0115.json';

type VariableInfo = {
  available_variable_names: string[];
  available_variable_ids: string[];
};

type DataAttributes = {
  attributes: string[];
  transformations: string[];
  chartType: string[];
  available_attribute_info: VariableInfo;
  dates: { startDate: string; endDate: string };
};

type StationInformationProps = {
  [key: string]: DataAttributes;
};

type RawData = {
  [attribute: string]: {
    [date: string]: any;
  };
};

const stationJsonMap: { [key: string]: any } = {
  '0603': station1,
  '0602': station2,
  '0601': station3,
  '0521': station4,
  '0502': station5,
  '0501': station6,
  '0412': station7,
  '0287': station8,
  '0286': station9,
  '0283': station10,
  '0282': station11,
  '0281': station12,
  '0252': station13,
  '0251': station14,
  '0243': station15,
  '0242': station16,
  '0241': station17,
  '0231': station18,
  '0213': station19,
  '0212': station20,
  '0211': station21,
  '0202': station22,
  '0201': station23,
  '0154': station24,
  '0153': station25,
  '0151': station26,
  '0144': station27,
  '0131': station28,
  '0121': station29,
  '0119': station30,
  '0118': station31,
  '0116': station32,
  '0115': station33,
};

const formatData = (rawData: RawData) => {
  const attributes = Object.keys(rawData);
  const dates = Object.keys(rawData[attributes[0]]);
  const data = [['Date', ...attributes]];

  dates.forEach((date) => {
    const dateString = new Date(date).toDateString();
    const dataRow = [dateString, ...attributes.map((attr) => rawData[attr][date])];
    data.push(dataRow);
  });

  return data;
};

const fetchData = async (stationName: string, attributes: string[]) => {
  const data = stationJsonMap[stationName];
  if (!data) return {};

  const subsetData: any = {};
  attributes.forEach((attribute) => {
    if (data.hasOwnProperty(attribute)) {
      subsetData[attribute] = data[attribute];
    }
  });

  return subsetData;
};

const filterDataByDate = (formattedData: string[][], dates: { startDate: string; endDate: string }) => {
  const { startDate, endDate } = dates;
  if (startDate && endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return formattedData.filter((row, index) => index === 0 || (new Date(row[0]).getTime() >= start && new Date(row[0]).getTime() <= end));
  } else {
    return formattedData;
  }
};

export const processStations = async (
  station_information: StationInformationProps,
  colorMode: string,
  appSize: { width: number; height: number; depth: number }
) => {
  const tmpChartOptions: EChartsCoreOption[] = [];
  const stations = Object.keys(station_information);
  const { dates, attributes: rawAttributes, chartType, transformations } = station_information[stations[0]];
  const attributes = rawAttributes.filter((attr) => attr !== 'Date');
  if (attributes.length === 0) {
    console.log('Not enough attributes found other than date');
    return [];
  }
  const tmpData = [];
  for (const stationID of stations) {
    const data = await fetchData(stationID, attributes);
    if (Object.keys(data).length !== 0) {
      const stationName = stationData.find((station) => station.stationID === stationID)?.stationName || '';
      const formattedData = formatData(data);
      const filteredDataByDate = filterDataByDate(formattedData, dates);
      tmpData.push({ data: filteredDataByDate, stationName });
    }
  }

  if (tmpData.length == 0) return [];
  const chartOptions = generateOption({
    chartName: chartType[0],
    data: tmpData,
    attributes,
    transformations,
    colorMode,
    appSize,
  });

  return chartOptions;
};
