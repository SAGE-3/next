/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
// Chakra Imports
import { Button, HStack } from '@chakra-ui/react';

// SAGE3 imports
import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';
import { state as AppState } from './index';

import './styling.css';

// Import the CSS style sheet from the node_modules folder
import 'leaflet/dist/leaflet.css';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import * as plotty from 'plotty';
import { fromUrl } from 'geotiff';

import { AppWindow } from '@sage3/applications/apps';

// HCDP app
function AppComponent(props: App): JSX.Element {
  // State and Store

  return (
    <AppWindow app={props}>
      <></>
    </AppWindow>
  );
}

const hawaiiLatLngCoordinates = [
  {
    name: 'Kauai',
    lat: 22.05809405806077,
    lng: -159.5064180703451,
    zoom: 11,
  },
  {
    name: 'Honolulu',
    lat: 21.474661068505032,
    lng: -157.9658777888294,
    zoom: 11,
  },
  {
    name: 'Maui',
    lat: 20.804509245368596,
    lng: -156.31157458227207,
    zoom: 11,
  },
  {
    name: 'Big Island',
    lat: 19.617391599674416,
    lng: -155.48167943875694,
    zoom: 10,
  },
];

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const [parameterOptionValue, setParameterOptionValue] = useState('rainfall');

  useEffect(() => {
    //https:/ikeauth.its.hawaii.edu/files/v2/download/public/system/ikewai-annotated-data/HCDP/production/temperature/max/month/statewide/data_map/2011/temperature_max_month_statewide_data_map_2011_03.tif
    //https:/ikeauth.its.hawaii.edu/files/v2/download/public/system/ikewai-annotated-data/HCDP/production/temperature/max/month/statewide/data_map/2011/temperature_max_month_statewide_data_map_2011_03.tif
    //https:/ikeauth.its.hawaii.edu/files/v2/download/public/system/ikewai-annotated-data/HCDP/production/temperature/max/day/statewide/data_map/2011/temperature_max_day_statewide_data_map_2011_03.tif
    //https:/ikeauth.its.hawaii.edu/files/v2/download/public/system/ikewai-annotated-data/HCDP/production/rainfall/new/month/statewide/data_map/2012/rainfall_new_month_statewide_data_map_2012_03.tif
    //https://ikeauth.its.hawaii.edu/files/v2/download/public/system/ikewai-annotated-data/HCDP/production/rainfall/new/day/statewide/data_map/2011/rainfall_new_day_statewide_data_map_2011_03.tif

    let url = 'https:/ikeauth.its.hawaii.edu/files/v2/download/public/system/ikewai-annotated-data/HCDP/production/';
    if (dataType === 'rainfall') {
      url += `rainfall/${HCDPFetchObj.production}/${HCDPFetchObj.periods}/${HCDPFetchObj.extents}/${HCDPFetchObj.availableRainfallFileTypes}/${HCDPFetchObj.year}/rainfall_${HCDPFetchObj.production}_${HCDPFetchObj.periods}_${HCDPFetchObj.extents}_${HCDPFetchObj.availableRainfallFileTypes}_${HCDPFetchObj.year}_${HCDPFetchObj.month}${HCDPFetchObj.extensions}`;
    } else {
      url += `temperature/${HCDPFetchObj.temperatureAggregations}/${HCDPFetchObj.periods}/${HCDPFetchObj.extents}/${HCDPFetchObj.availableTemperatureFileTypes}/${HCDPFetchObj.year}/temperature_${HCDPFetchObj.temperatureAggregations}_${HCDPFetchObj.periods}_${HCDPFetchObj.extents}_${HCDPFetchObj.availableTemperatureFileTypes}_${HCDPFetchObj.year}_${HCDPFetchObj.month}${HCDPFetchObj.extensions}`;
    }

    console.log(url);
  }, [HCDPFetchObj]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const date = event.target.value;
    const year = date.slice(0, 4);
    const month = date.slice(5, 7);
    setHCDPFetchObj({ ...HCDPFetchObj, year, month });
  };

  const handleParameterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setParameterOptionValue(value);
    if (value === 'rainfall') {
      setHCDPFetchObj({ ...HCDPFetchObj, production: 'new' });
      setDataType('rainfall');
    } else if (value === 'legacyRainfall') {
      setHCDPFetchObj({ ...HCDPFetchObj, production: 'legacy', periods: 'month' });
      setDataType('rainfall');
    } else if (value === 'maximumTemperature') {
      setHCDPFetchObj({ ...HCDPFetchObj, temperatureAggregations: 'max', production: 'new' });
      setDataType('temperature');
    } else if (value === 'minimumTemperature') {
      setHCDPFetchObj({ ...HCDPFetchObj, temperatureAggregations: 'min', production: 'new' });
      setDataType('temperature');
    } else if (value === 'meanTemperature') {
      setHCDPFetchObj({ ...HCDPFetchObj, temperatureAggregations: 'mean', production: 'new' });
      setDataType('temperature');
    }
  };

  const handlePeriodsChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const periods = event.target.value as 'month' | 'day';
    setHCDPFetchObj({ ...HCDPFetchObj, periods });
  };

  return (
    <HStack>
      <Select w="10rem" size="xs" mr="1rem" placeholder={'Select Dataset'} value={parameterOptionValue} onChange={handleParameterChange}>
        <option value="rainfall">Rainfall</option>
        <option value="legacyRainfall">Legacy Rainfall</option>
        <option value="maximumTemperature">Maximum Temperature</option>
        <option value="minimumTemperature">Minimum Temperature</option>
        <option value="meanTemperature">Mean Temperature</option>
      </Select>

      <Select
        isDisabled={HCDPFetchObj.production === 'legacy' ? true : false}
        size="xs"
        mr="1rem"
        w="10rem"
        placeholder={'Time Period'}
        value={HCDPFetchObj.periods}
        onChange={handlePeriodsChange}
      >
        <option value="month">Monthly</option>
        <option value="day">Daily</option>
      </Select>

      <Input
        w="10rem"
        mr="1rem"
        size="xs"
        onChange={handleDateChange}
        value={`${HCDPFetchObj.year}-${HCDPFetchObj.month}`}
        placeholder="Select Date and Time"
        type="month"
      />
    </HStack>
  );
}
/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
