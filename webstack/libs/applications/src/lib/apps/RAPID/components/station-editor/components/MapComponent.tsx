import React from 'react';
import { Box, List, ListItem, useColorMode } from '@chakra-ui/react';
import Map, { NavigationControl, Marker } from 'react-map-gl/maplibre';
import { TbCircleFilled } from 'react-icons/tb';
import { IoTriangle } from 'react-icons/io5';
import { SensorInfoType, SelectedSensor } from '../StationEditorModal';

interface MapComponentProps {
  sensorInfo: SensorInfoType | null;
  selectedSensors: SelectedSensor[];
  setSelectedSensors: React.Dispatch<React.SetStateAction<SelectedSensor[]>>;
}

const MapComponent: React.FC<MapComponentProps> = ({ sensorInfo, selectedSensors, setSelectedSensors }) => {
  const mapTilerAPI = 'elzgvVROErSfCRbrVabp';

  const { colorMode } = useColorMode();

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
              <IoTriangle color={isSensorSelected(station.id, 'Mesonet') ? 'red' : '#777'} />
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
              <TbCircleFilled color={isSensorSelected(station.id, 'Waggle') ? 'red' : '#777'} />
            </Marker>
          ))}
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
