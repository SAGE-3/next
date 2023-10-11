/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import './styling.css';

// Chakra Imports
import { Button, HStack } from '@chakra-ui/react';

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

import { AppWindow } from '@sage3/applications/apps';

const convertToFahrenheit = (tempInCelcius: number) => {
  const tempInFahrenheit = Math.floor((tempInCelcius * 9) / 5 + 32);
  return tempInFahrenheit;
};

const fetchRequest = async (id: string) => {
  const response = await fetch('/api//hcdp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https:/ikeauth.its.hawaii.edu/files/v2/download/public/system/ikewai-annotated-data/HCDP/production/temperature/max/month/statewide/data_map/2011/temperature_max_month_statewide_data_map_2011_03.tif ',
      appId: id,
    }),
  });
  console.log(response);
};

// HCDP app
function AppComponent(props: App): JSX.Element {
  // State and Store
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);

  const [, setStationMetadata] = useState([]);

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
  console.log(s);
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
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <HStack>
      <Button onClick={() => fetchRequest(props._id)}>Test Fetch</Button>
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
