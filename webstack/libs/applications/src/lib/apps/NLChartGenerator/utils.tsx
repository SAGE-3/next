import { EChartsCoreOption } from 'echarts';
import { generateOption } from './ChartMaker/generateChart';
import { stationData } from './data/stationData';
import station1 from './data/0521_reduced_dataset.json';
import station2 from './data/0502_reduced_dataset.json';
import station3 from './data/0501_reduced_dataset.json';

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

const formatData = (rawData: RawData) => {
  const attributes = Object.keys(rawData);
  const dates = Object.keys(rawData[attributes[0]]);
  attributes.unshift('Date');
  const data = [attributes];

  for (let i = 0; i < dates.length; i++) {
    // Convert the date to a string representation
    const date = new Date(dates[i]);
    const dateString = date.toDateString();

    const dataRow = [dateString];

    for (let j = 1; j < attributes.length; j++) {
      dataRow.push(rawData[attributes[j]][dates[i]]);
    }
    data.push(dataRow);
  }

  console.log('FINISHED FORMATDATA:', data);
  return data;
};

const fetchData = async (stationName: string, attributes: string[]) => {
  const subsetData: any = {};
  if (stationName == '0521') {
    const data: any = station1;
    const allAttributes = Object.keys(data);
    for (let i = 0; i < attributes.length; i++) {
      for (let j = 0; j < allAttributes.length; j++) {
        if (JSON.stringify(attributes[i]) == JSON.stringify(allAttributes[j])) {
          subsetData[attributes[i]] = data[attributes[i]];
        }
      }
    }
  } else if (stationName == '0502') {
    const data: any = station2;
    const allAttributes = Object.keys(data);
    for (let i = 0; i < attributes.length; i++) {
      for (let j = 0; j < allAttributes.length; j++) {
        if (JSON.stringify(attributes[i]) == JSON.stringify(allAttributes[j])) {
          subsetData[attributes[i]] = data[attributes[i]];
        }
      }
    }
  } else if (stationName == '0501') {
    const data: any = station3;
    const allAttributes = Object.keys(data);
    for (let i = 0; i < attributes.length; i++) {
      for (let j = 0; j < allAttributes.length; j++) {
        if (JSON.stringify(attributes[i]) == JSON.stringify(allAttributes[j])) {
          subsetData[attributes[i]] = data[attributes[i]];
        }
      }
    }
  }
  return subsetData;

  //Code to fetch the data from API
  // const url = `https://api.hcdp.ikewai.org/mesonet/getMeasurements?station_id=${stationName}&var_ids=${attributes}&start_date=2024-04-01T00:00:00-10:00`;
  // const headers = { Authorization: 'Bearer 71c5efcd8cfe303f2795e51f01d19c6' };
  // try {
  //   const response = await fetch(url, { headers });
  //   const data = await response.json();
  //   console.log('> Fetching data for NLChartGenerator');
  //   return data;
  // } catch (e) {
  //   console.error('> Error in fetching data:', e);
  //   return {};
  // }
};

const filterDataByDate = (formattedData: string[][], dates: { startDate: string; endDate: string }) => {
  const { startDate, endDate } = dates;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  // Keep the header row
  const filteredData = [formattedData[0]];

  // Iterate through the data rows (starting from index 1 to skip the header)
  for (let i = 1; i < formattedData.length; i++) {
    const rowDate = new Date(formattedData[i][0]).getTime();
    if (rowDate >= start && rowDate <= end) {
      filteredData.push(formattedData[i]);
    }
  }

  return filteredData;
};

export const processStations = async (
  station_information: StationInformationProps,
  colorMode: string,
  appSize: { width: number; height: number; depth: number }
) => {
  const tmpChartOptions: EChartsCoreOption[] = [];

  const stations: string[] = Object.keys(station_information);
  console.log('chart option', stations);

  for (let i = 0; i < stations.length; i++) {
    const stationID = stations[i];
    const dates = station_information[stations[i]].dates;
    const attributes = station_information[stations[i]].attributes.filter((attr: string) => attr !== 'Date');
    if (attributes.length == 0) {
      console.log("Didn't choose any attributes");
    } else {
      const data = await fetchData(stationID, attributes);
      let stationName = '';

      for (let j = 0; j < stationData.length; j++) {
        if (stationData[j].stationID == stationID) {
          stationName = stationData[j].stationName;
        }
      }

      if (Object.keys(data).length > 0) {
        const formattedData = formatData(data);
        const filteredDataByDate = filterDataByDate(formattedData, dates);
        const chartOption: any = generateOption({
          chartName: station_information[stations[i]].chartType[0],
          data: filteredDataByDate as string[][],
          attributes: station_information[stations[i]].attributes,
          transformations: station_information[stations[i]].transformations,
          stationName: stationName,
          colorMode: colorMode,
          appSize: appSize,
        });
        console.log(chartOption);
        if (!chartOption || Object.keys(chartOption).length == 0) {
          console.log('chart was not created correctly');
        } else {
          tmpChartOptions.push(chartOption);
        }
      }
    }
  }
  return tmpChartOptions;
};
