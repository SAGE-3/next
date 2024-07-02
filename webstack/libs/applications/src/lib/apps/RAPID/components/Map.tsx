import { useEffect, useState } from 'react';
import Map, { NavigationControl, Popup } from 'react-map-gl/maplibre';
import { Box, Link } from '@chakra-ui/react';
import { Marker } from 'react-map-gl';
import Pin from './Pin';

import { App } from '@sage3/applications/schema';
import { useAppStore } from '@sage3/frontend';

export interface SensorInfoType {
  sage: { lat: number; lon: number; url: string };
  mesonet: { lat: number; lon: number; url: string };
  [key: string]: { lat: number; lon: number; url: string };
}

type LocationMapProps = {
  children: React.ReactNode;
};

function LocationMap({ children }: LocationMapProps) {
  return <>{children}</>;
}

function AppComponent(props: App) {
  const mapTilerAPI = 'elzgvVROErSfCRbrVabp';
  const SAGE_URL = 'https://portal.sagecontinuum.org/node/W097';
  const MESONET_URL = 'https://explore.synopticdata.com/004HI/current';
  const [sensorInfo, setSensorInfo] = useState<SensorInfoType>({
    sage: { lat: 0, lon: 0, url: SAGE_URL },
    mesonet: { lat: 0, lon: 0, url: MESONET_URL },
  });
  const [pinInfo, setPinInfo] = useState<string | null>(null);

  const createApp = useAppStore((state) => state.create);

  async function getSensorInfo() {
    try {
      const sageRes = await fetch('https://data.sagecontinuum.org/api/v1/query', {
        method: 'POST',
        body: JSON.stringify({
          start: '-3m',
          filter: {
            name: 'sys.gps.*',
            vsn: 'W097',
          },
        }),
      });
      const sageData = await sageRes.text();

      const parsedData = sageData.split('\n').map((line) => {
        if (line !== '') {
          return JSON.parse(line);
        }
      });

      const sageLat = parsedData.find((d) => d.name === 'sys.gps.lat').value;
      const sageLong = parsedData.find((d) => d.name === 'sys.gps.lon').value;

      const mesonetRes = await fetch(
        'https://api.synopticdata.com/v2/stations/timeseries?&stid=004HI&units=metric,speed|kph,pres|mb&recent=1440&24hsummary=1&qc_remove_data=off&qc_flags=on&qc_checks=all&hfmetars=1&showemptystations=1&precip=1&token=07dfee7f747641d7bfd355951f329aba'
      );

      const mesonetData = await mesonetRes.json();
      const mesonetLat = mesonetData.STATION[0].LATITUDE;
      const mesonetLong = mesonetData.STATION[0].LONGITUDE;

      const info = {
        sage: { ...sensorInfo.sage, lat: sageLat, lon: sageLong },
        mesonet: { ...sensorInfo.mesonet, lat: mesonetLat, lon: mesonetLong },
      };
      localStorage.setItem('sensorInfo', JSON.stringify(info));

      setSensorInfo(info);
    } catch (error) {
      console.log('error', error);
    }
  }

  useEffect(() => {
    if (!localStorage.getItem('sensorInfo')) {
      getSensorInfo();
    } else {
      setSensorInfo(JSON.parse(localStorage.getItem('sensorInfo') as string));
    }
  }, []);
  console.log('sensorInfo', sensorInfo);

  // Create Webview
  async function createWebview(url: string) {
    try {
      createApp({
        title: 'RAPID',
        roomId: props.data.roomId!,
        boardId: props.data.boardId!,
        position: {
          x: props.data.position.x + props.data.size.width,
          y: props.data.position.y,
          z: 0,
        },
        size: {
          width: props.data.size.width,
          height: props.data.size.height,
          depth: 0,
        },
        type: 'Webview',
        rotation: { x: 0, y: 0, z: 0 },
        state: {
          webviewurl: url,
        },
        raised: true,
        dragging: false,
        pinned: false,
      });
    } catch (e) {
      console.log('ERROR in RAPID:', e);
    }
  }

  return (
    <Box width="100%" height="100%">
      <Map
        initialViewState={{
          longitude: -155.2384,
          latitude: 19.4152,
          zoom: 20,
        }}
        reuseMaps
        mapStyle={`https://api.maptiler.com/maps/streets/style.json?key=${mapTilerAPI}`}
      >
        <Marker
          latitude={sensorInfo.sage.lat}
          longitude={sensorInfo.sage.lon}
          onClick={() => {
            setPinInfo(Object.keys(sensorInfo)[0]);
          }}
        >
          <Pin size={18} text="Waggle Node" />
        </Marker>
        <Marker
          latitude={sensorInfo.mesonet.lat}
          longitude={sensorInfo.mesonet.lon}
          onClick={() => {
            setPinInfo(Object.keys(sensorInfo)[1]);
          }}
        >
          <Pin size={18} text="Mesonet Sensor" />
        </Marker>

        {pinInfo && (
          <Popup
            anchor="top"
            longitude={sensorInfo[pinInfo].lon}
            latitude={sensorInfo[pinInfo].lat}
            onClose={() => {
              setPinInfo(null);
            }}
          >
            <Box textColor="black">
              <Link
                onClick={() => {
                  createWebview(sensorInfo[pinInfo].url);
                }}
              >
                {pinInfo}
              </Link>
            </Box>
          </Popup>
        )}
        <NavigationControl position="top-left" />
      </Map>
    </Box>
  );
}

function ToolbarComponent(props: App) {
  return <></>;
}
LocationMap.AppComponent = AppComponent;
LocationMap.ToolbarComponent = ToolbarComponent;

export default LocationMap;
