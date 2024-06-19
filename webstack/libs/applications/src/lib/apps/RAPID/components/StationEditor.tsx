import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalOverlay, ModalContent, Box, useColorMode, Input, Select, List, ListItem } from '@chakra-ui/react';

import Map, { NavigationControl } from 'react-map-gl/maplibre';
import { TbCircleFilled } from 'react-icons/tb';
import { IoTriangle } from 'react-icons/io5';
import { Marker } from 'react-map-gl';

interface StationEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

type SensorInfoType = {
  sage: { lat: number; lon: number; name: string; id: string }[];
  mesonet: { lat: number; lon: number; name: string; id: string }[];
};

const StationEditor: React.FC<StationEditorProps> = ({ isOpen, onClose }) => {
  const mapTilerAPI = 'elzgvVROErSfCRbrVabp';
  // const SAGE_URL = 'https://portal.sagecontinuum.org/node/W097';
  // const MESONET_URL = 'https://explore.synopticdata.com/004HI/current';

  const [sensorInfo, setSensorInfo] = useState<SensorInfoType | null>(null);

  const { colorMode } = useColorMode();

  // TODO: Extract as constant
  const token = '07dfee7f747641d7bfd355951f329aba';

  async function fetchStations() {
    try {
      const res = await fetch(`https://api.synopticdata.com/v2/stations/metadata?&network=275&sensorvars=1&complete=1&token=${token}`);

      const data = await res.json();

      const mesonetStations = data.STATION.map((station: any) => ({
        name: station.NAME,
        lat: station.LATITUDE,
        lon: station.LONGITUDE,
        id: station.STID,
        selected: false,
      }));

      setSensorInfo({
        sage: [{ lat: 19.4152, lon: -155.2384, name: 'string', id: 'string' }],
        mesonet: mesonetStations,
      });
    } catch (error) {
      console.log('Error fetching stations:', error);
    }
  }

  useEffect(() => {
    fetchStations();
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent minHeight="60vh" minWidth="90vw" maxWidth="90vw" maxHeight="90vh" width="full" height="full" padding="2">
        <Box position="relative" height="full" width="full" borderRadius="5" overflow="hidden">
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
                  onClick={() => {
                    console.log('Station:', station);
                  }}
                >
                  <IoTriangle color="#777" />
                </Marker>
              ))}
          </Map>
          <Box position="absolute" top="0" left="0" padding="3" bg={colorMode === 'light' ? '#fff' : '#222'} borderRadius="5" margin="3">
            <List fontSize="small" fontWeight="bold">
              <ListItem display="flex" alignItems="center" gap="3">
                <TbCircleFilled color="#777" /> Sage Sensor
              </ListItem>
              <ListItem display="flex" alignItems="center" gap="3">
                <IoTriangle color="#777" /> Mesonet Sensor
              </ListItem>
            </List>
          </Box>
          <Box
            position="absolute"
            top="0"
            right="0"
            height="100%"
            width="30%"
            bg={colorMode === 'light' ? '#fff' : '#222'}
            borderRadius="5"
            padding="8"
            zIndex="10"
            display="flex"
            flexDir="column"
            justifyContent="space-between"
            gap="3"
          >
            <Box display="flex" flexDir="column" gap="3">
              <h3>Select Sensors</h3>
              <Input placeholder="Search" />
              <hr />
              <h3>Selected Sensors</h3>
              <p>No sensors selected. Please select sensors by clicking on them on the map, or search for a station.</p>
              <hr />
            </Box>
            <Box display="flex" flexDir="column" gap="3">
              <Box>
                <label htmlFor="metric">Metric</label>
                <Select name="metric" placeholder="Metric" />
              </Box>
              <Box>
                <label htmlFor="time range">Time Range</label>
                <Select name="time range" placeholder="Time Range" />
              </Box>
              <Box>
                <label htmlFor="visualization type">Visualization Type</label>
                <Select placeholder="Visualization Type" />
              </Box>
            </Box>
            <Box display="flex" justifyContent="end" gap="3">
              <Button onClick={onClose}>Cancel</Button>
              <Button>Save</Button>
            </Box>
          </Box>
        </Box>
      </ModalContent>
    </Modal>
  );
};

export default StationEditor;
