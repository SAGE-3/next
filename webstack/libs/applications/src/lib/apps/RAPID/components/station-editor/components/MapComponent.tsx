import React, { useState } from 'react';
import { Box, List, ListItem, useColorMode, Link, Text } from '@chakra-ui/react';
import Map, { NavigationControl, Marker, Popup } from 'react-map-gl/maplibre';
import { TbCircleFilled } from 'react-icons/tb';
import { IoTriangle } from 'react-icons/io5';
import { SensorInfoType, SelectedSensor } from '../StationEditorModal';
// import { useAppStore } from '@sage3/frontend';

interface MapComponentProps {
  sensorInfo: SensorInfoType | null;
  selectedSensors: SelectedSensor[];
  setSelectedSensors: React.Dispatch<React.SetStateAction<SelectedSensor[]>>;
}

interface Station {
  type: 'Mesonet' | 'Waggle';
  lat: number;
  lon: number;
  name: string;
  id: string;
  selected: boolean;
}

const MapComponent: React.FC<MapComponentProps> = ({ sensorInfo, selectedSensors, setSelectedSensors }) => {
  const mapTilerAPI = 'elzgvVROErSfCRbrVabp';
  const { colorMode } = useColorMode();
  // const createApp = useAppStore((state) => state.create);

  const [pinInfo, setPinInfo] = useState<Station | null>(null);

  const isSensorSelected = (id: string, type: 'Mesonet' | 'Waggle') => {
    return selectedSensors.some((s) => s.id === id && s.type === type);
  };

  const toggleSensor = (id: string, type: 'Mesonet' | 'Waggle') => {
    if (isSensorSelected(id, type)) {
      setSelectedSensors(selectedSensors.filter((s) => !(s.id === id && s.type === type)));
    } else {
      setSelectedSensors([...selectedSensors, { id, type }]);
    }
  };

  // TODO: Implement this
  // Create Webview
  // async function createWebview(url: string) {
  //   try {
  //     createApp({
  //       title: 'RAPID',
  //       roomId: props.data.roomId!,
  //       boardId: props.data.boardId!,
  //       position: {
  //         x: props.data.position.x + props.data.size.width,
  //         y: props.data.position.y,
  //         z: 0,
  //       },
  //       size: {
  //         width: props.data.size.width,
  //         height: props.data.size.height,
  //         depth: 0,
  //       },
  //       type: 'Webview',
  //       rotation: { x: 0, y: 0, z: 0 },
  //       state: {
  //         webviewurl: url,
  //       },
  //       raised: true,
  //       dragging: false,
  //       pinned: false,
  //     });
  //   } catch (e) {
  //     console.log('ERROR in RAPID:', e);
  //   }
  // }

  return (
    <Box height="100%" width="75%" position="relative" borderRadius="5" overflow="hidden">
      <Map
        initialViewState={{
          longitude: -155.2384,
          latitude: 19.4152,
          zoom: 8,
        }}
        reuseMaps
        mapStyle={`https://api.maptiler.com/maps/streets/style.json?key=${mapTilerAPI}`}
      >
        <NavigationControl position="bottom-left" />
        {sensorInfo &&
          sensorInfo.mesonet.map((station) => (
            <Marker
              key={station.id}
              latitude={station.lat}
              longitude={station.lon}
              onClick={() => toggleSensor(station.id, 'Mesonet')}
              style={{ cursor: 'pointer' }}
            >
              <IoTriangle
                color={isSensorSelected(station.id, 'Mesonet') ? 'red' : '#777'}
                onMouseEnter={() => {
                  setPinInfo({ type: 'Mesonet', ...station });
                }}
                onMouseLeave={() => {
                  setPinInfo(null);
                }}
              />
            </Marker>
          ))}
        {sensorInfo &&
          sensorInfo.waggle.map((station) => (
            <Marker
              key={station.id}
              latitude={station.lat}
              longitude={station.lon}
              onClick={() => toggleSensor(station.id, 'Waggle')}
              style={{ cursor: 'pointer' }}
            >
              <TbCircleFilled
                color={isSensorSelected(station.id, 'Waggle') ? 'red' : '#777'}
                onMouseEnter={() => {
                  setPinInfo({ type: 'Mesonet', ...station });
                }}
                onMouseLeave={() => {
                  setPinInfo(null);
                }}
              />
            </Marker>
          ))}

        {pinInfo && (
          <Popup
            anchor="top"
            longitude={pinInfo.lon}
            latitude={pinInfo.lat}
            onClose={() => {
              setPinInfo(null);
            }}
          >
            <Box textColor="black">
              <Link
                onClick={() => {
                  // createWebview(sensorInfo[pinInfo].url);
                }}
              >
                {pinInfo.type} - {pinInfo.id}
              </Link>
            </Box>
          </Popup>
        )}
      </Map>
      <Box
        position="absolute"
        top="0"
        left="0"
        padding="3"
        bg={colorMode === 'light' ? '#fff' : '#222'}
        color={colorMode === 'light' ? '#222' : '#fff'}
        borderRadius="5"
        margin="3"
      >
        <List fontSize="small" fontWeight="bold">
          <ListItem display="flex" alignItems="center" gap="3">
            <TbCircleFilled color="#777" /> Waggle Sensor
          </ListItem>
          <ListItem display="flex" alignItems="center" gap="3">
            <IoTriangle color="#777" /> Mesonet Sensor
          </ListItem>
        </List>
      </Box>
    </Box>
  );
};

export default MapComponent;
