/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useState } from 'react';
// Chakra Imports
<<<<<<< Updated upstream
import { Button, HStack } from '@chakra-ui/react';
=======
import { HStack, ButtonGroup, Tooltip, Button, useColorModeValue, useDisclosure, Select } from '@chakra-ui/react';
// Icon imports
import { MdOutlineZoomIn, MdOutlineZoomOut } from 'react-icons/md';
import { useParams } from 'react-router';
import { AppWindow } from '@sage3/applications/apps';
>>>>>>> Stashed changes

// SAGE3 imports
import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';
import { state as AppState } from './index';

import MapLibreWrapper from './MapLibreWrapper';

// Import the CSS style sheet from the node_modules folder
import 'leaflet/dist/leaflet.css';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import * as plotty from 'plotty';
import { fromUrl } from 'geotiff';

<<<<<<< Updated upstream
import { AppWindow } from '@sage3/applications/apps';
=======
type HCDPProps = {
  production: 'new' | 'legacy';
  temperatureAggregations: 'min' | 'max' | 'mean';
  periods: 'month' | 'day';
  extents: 'statewide' | 'bi' | 'ka' | 'mn' | 'oa';
  fill?: 'raw' | 'partial';
  availableRainfallFileTypes: 'data_map' | 'se' | 'anom' | 'anom_se' | 'metadata' | 'station_data';
  availableTemperatureFileTypes: 'data_map' | 'se' | 'metadata' | 'station_data';
  year: string;
  month: string;
  extensions: '.tif' | '.csv' | '.txt';
};

const convertToFahrenheit = (tempInCelcius: number) => {
  const tempInFahrenheit = Math.floor((tempInCelcius * 9) / 5 + 32);
  return tempInFahrenheit;
};

// Max and min zoom for leaflet app
const maxZoom = 18;
const minZoom = 1;
>>>>>>> Stashed changes

// HCDP app
function AppComponent(props: App): JSX.Element {
  // State and Store
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);

  useEffect(() => {
    const fetchData = async () => {
      const url = '/assets/HCDPTestData.tif';

      const tiff = await fromUrl(url);
      const image = await tiff.getImage();
      const data = await image.readRasters();
      const resolution = image.getResolution();
      const bbox = image.getBoundingBox();
      const { width, height } = data;
      const tiepoint = image.getTiePoints()[0];
      const [, yScale] = image.getFileDirectory().ModelPixelScale;

      const HCDPData = {
        nCols: width,
        nRows: height,
        xllCorner: tiepoint.x,
        yllCorner: tiepoint.y - height * yScale,
        cellXSize: resolution[0],
        cellYSize: resolution[1],
      };
    };
    fetchData();
  }, []);
  return (
    <AppWindow app={props}>
      <MapLibreWrapper {...props} />
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
<<<<<<< Updated upstream
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return <HStack>{/* <Button onClick={() => fetchRequest(props._id)}>Test Fetch</Button> */}</HStack>;
=======
  const [HCDPFetchObj, setHCDPFetchObj] = useState<HCDPProps>({
    production: 'new',
    temperatureAggregations: 'mean',
    periods: 'month',
    extents: 'statewide',
    fill: 'raw',
    availableRainfallFileTypes: 'data_map',
    availableTemperatureFileTypes: 'data_map',
    year: '2011',
    month: '03',
    extensions: '.tif',
  });
  const [dataType, setDataType] = useState('rainfall');

  useEffect(() => {
    //https:/ikeauth.its.hawaii.edu/files/v2/download/public/system/ikewai-annotated-data/HCDP/production/temperature/max/month/statewide/data_map/2011/temperature_max_month_statewide_data_map_2011_03.tif
    //https:/ikeauth.its.hawaii.edu/files/v2/download/public/system/ikewai-annotated-data/HCDP/production/temperature/max/month/statewide/data_map/2011/temperature_new_max_month_statewide_data_map_2011_03.tif
    let url = 'https:/ikeauth.its.hawaii.edu/files/v2/download/public/system/ikewai-annotated-data/HCDP/production/';
    if (dataType === 'rainfall') {
      url += `rainfall/${HCDPFetchObj.production}/${HCDPFetchObj.periods}/${HCDPFetchObj.extents}/${HCDPFetchObj.availableRainfallFileTypes}/${HCDPFetchObj.year}/rainfall_${HCDPFetchObj.production}_${HCDPFetchObj.periods}_${HCDPFetchObj.extents}_${HCDPFetchObj.availableRainfallFileTypes}_${HCDPFetchObj.year}_${HCDPFetchObj.month}${HCDPFetchObj.extensions}`;
    } else {
      url += `temperature/${HCDPFetchObj.temperatureAggregations}/${HCDPFetchObj.periods}/${HCDPFetchObj.extents}/${HCDPFetchObj.availableTemperatureFileTypes}/${HCDPFetchObj.year}/temperature_${HCDPFetchObj.temperatureAggregations}_${HCDPFetchObj.periods}_${HCDPFetchObj.extents}_${HCDPFetchObj.availableTemperatureFileTypes}_${HCDPFetchObj.year}_${HCDPFetchObj.month}${HCDPFetchObj.extensions}`;
    }

    console.log(url);
  }, [HCDPFetchObj]);

  const handleChangeProduction = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const production = event.target.value as 'new' | 'legacy';
    setHCDPFetchObj({ ...HCDPFetchObj, production });
  };

  const handleChangeAggregation = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const temperatureAggregations = event.target.value as 'min' | 'max' | 'mean';
    setHCDPFetchObj({ ...HCDPFetchObj, temperatureAggregations });
  };

  const handleChangeExtents = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const extents = event.target.value as 'statewide' | 'bi' | 'ka' | 'mn' | 'oa';
    setHCDPFetchObj({ ...HCDPFetchObj, extents });
  };

  const handleChangeFill = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const fill = event.target.value as 'raw' | 'partial';
    setHCDPFetchObj({ ...HCDPFetchObj, fill });
  };
  const handleChangeDataType = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const dataType = event.target.value as 'rainfall' | 'temperature';
    setDataType(dataType);
  };

  const handleFileType = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (dataType === 'rainfall') {
      const availableRainfallFileTypes = event.target.value as 'data_map' | 'se' | 'anom' | 'anom_se' | 'metadata' | 'station_data';

      setHCDPFetchObj({ ...HCDPFetchObj, availableRainfallFileTypes });
    } else {
      const availableTemperatureFileTypes = event.target.value as 'data_map' | 'se' | 'metadata' | 'station_data';
      setHCDPFetchObj({ ...HCDPFetchObj, availableTemperatureFileTypes: availableTemperatureFileTypes });
    }
  };

  return (
    <HStack>
      {dataType === 'rainfall' ? (
        <Select size="xs" mr="1rem" placeholder={'Select Variable'} value={HCDPFetchObj.production} onChange={handleChangeProduction}>
          <option value="new">New</option>
          <option value="legacy">Legacy</option>
        </Select>
      ) : (
        <Select
          size="xs"
          mr="1rem"
          placeholder={'Select Variable'}
          value={HCDPFetchObj.temperatureAggregations}
          onChange={handleChangeAggregation}
        >
          <option value="min">Min</option>
          <option value="max">Max</option>
          <option value="mean">Mean</option>
        </Select>
      )}

      <Select size="xs" mr="1rem" placeholder={'Select Variable'} value={HCDPFetchObj.extents} onChange={handleChangeExtents}>
        <option value="statewide">Statewide</option>
        <option value="bi">Big Island</option>
        <option value="ka">Kauai</option>
        <option value="mn">Maui</option>
        <option value="oa">Oahu</option>
      </Select>
      {HCDPFetchObj.availableTemperatureFileTypes === 'station_data' || HCDPFetchObj.availableRainfallFileTypes === 'station_data' ? (
        <Select size="xs" mr="1rem" placeholder={'Select Variable'} value={HCDPFetchObj.fill} onChange={handleChangeFill}>
          <option value="raw">Raw</option>
          <option value="partial">Partial</option>
        </Select>
      ) : null}

      <Select size="xs" mr="1rem" placeholder={'Select Variable'} value={dataType} onChange={handleChangeDataType}>
        <option value="rainfall">Rainfall</option>
        <option value="temperature">Temperature</option>
      </Select>
      {dataType === 'rainfall' ? (
        <Select
          size="xs"
          mr="1rem"
          placeholder={'Select Variable'}
          value={HCDPFetchObj.availableRainfallFileTypes}
          onChange={handleFileType}
        >
          <option value="data_map">Data Map</option>
          <option value="se">Standard Error</option>
          <option value="anom">Anomaly</option>
          <option value="anom_se">Anomaly Standard Error</option>
          <option value="metadata">Metadata</option>
          <option value="station_data">Station Data</option>
        </Select>
      ) : (
        <Select
          size="xs"
          mr="1rem"
          placeholder={'Select Variable'}
          value={HCDPFetchObj.availableTemperatureFileTypes}
          onChange={handleFileType}
        >
          <option value="data_map">Data Map</option>
          <option value="se">Standard Error</option>
          <option value="metadata">Metadata</option>
          <option value="station_data">Station Data</option>
        </Select>
      )}
    </HStack>
  );
>>>>>>> Stashed changes
}
/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
