import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalOverlay, ModalContent, Box, useColorMode, Input, Select, List, ListItem, Text, Flex } from '@chakra-ui/react';

import { TbCircleFilled } from 'react-icons/tb';
import { IoTriangle } from 'react-icons/io5';

import Map, { NavigationControl } from 'react-map-gl/maplibre';
import { Marker } from 'react-map-gl';

import { METRICS, SAGE_SENSORS } from '../data/constants';
import * as API from '../api/apis';
import { useAppStore } from '@sage3/frontend';

import DateRangePicker from './calendar/DateRangePicker';
import { App } from '@sage3/applications/schema';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface StationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  props: App;
}

type SensorInfoType = {
  waggle: { lat: number; lon: number; name: string; id: string; selected: boolean }[];
  mesonet: { lat: number; lon: number; name: string; id: string; selected: boolean }[];
};

interface SelectedSensor {
  id: string;
  type: 'Waggle' | 'Mesonet';
}

const StationEditorModal: React.FC<StationEditorModalProps> = ({ isOpen, onClose, props }) => {
  const mapTilerAPI = 'elzgvVROErSfCRbrVabp';

  const [sensorInfo, setSensorInfo] = useState<SensorInfoType | null>(null);
  // Used to create RAPID app
  const [selectedSensors, setSelectedSensors] = useState<SelectedSensor[]>([]);
  const [metrics, setMetrics] = useState<React.ReactNode[] | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [selectedVisualizationType, setSelectedVisualizationType] = useState<string | null>(null);

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
    console.log('New date range:', newDateRange);
  };

  const { colorMode } = useColorMode();

  const createApp = useAppStore((state) => state.create);

  async function fetchStations() {
    try {
      const mesonetSensors = await API.getMesonetStations();
      const mesonetStations = mesonetSensors.STATION.map((station: any) => ({
        type: 'Mesonet',
        name: station.NAME,
        lat: station.LATITUDE,
        lon: station.LONGITUDE,
        id: station.STID,
        selected: false,
      }));

      const waggleSensors = SAGE_SENSORS.map((sensor) => ({
        type: 'Waggle',
        name: sensor.name,
        lat: sensor.lat,
        lon: sensor.lon,
        id: sensor.id,
        selected: false,
      }));

      setSensorInfo({
        waggle: waggleSensors,
        mesonet: mesonetStations,
      });
    } catch (error) {
      console.log('Error fetching stations:', error);
    }
  }

  // Get the stations and add them to state
  useEffect(() => {
    fetchStations();
  }, []);

  // Update sensor colors and dropdown metrics when sensors are selected
  useEffect(() => {
    setSensorInfo((prevSensorInfo) => {
      if (prevSensorInfo) {
        const updatedMesonetStations = prevSensorInfo.mesonet.map((station) => ({
          ...station,
          selected: selectedSensors.some((s) => s.id === station.id && s.type === 'Mesonet'),
        }));
        const updatedSageSensors = prevSensorInfo.waggle.map((station) => ({
          ...station,
          selected: selectedSensors.some((s) => s.id === station.id && s.type === 'Waggle'),
        }));
        return { ...prevSensorInfo, mesonet: updatedMesonetStations, waggle: updatedSageSensors };
      }
      return prevSensorInfo;
    });

    showConditionalMetrics();
  }, [selectedSensors]);

  function containsWaggleSensors() {
    return selectedSensors.some((sensor) => sensor.type === 'Waggle');
  }
  function containsMesonetSensors() {
    return selectedSensors.some((sensor) => sensor.type === 'Mesonet');
  }

  function showConditionalMetrics() {
    if (selectedSensors.length === 0) {
      setMetrics(null);
      return;
    }
    switch (true) {
      case containsWaggleSensors() && containsMesonetSensors():
        setMetrics(
          METRICS.filter((metric) => metric.waggle !== null && metric.mesonet !== null).map((metric) => (
            <option key={metric.name} value={JSON.stringify(metric)}>
              {metric.name}
            </option>
          ))
        );
        break;
      case containsWaggleSensors():
        setMetrics(
          METRICS.filter((metric) => metric.waggle !== null).map((metric) => (
            <option key={metric.name} value={JSON.stringify(metric)}>
              {metric.name}
            </option>
          ))
        );
        break;
      case containsMesonetSensors():
        setMetrics(
          METRICS.filter((metric) => metric.mesonet !== null).map((metric) => (
            <option key={metric.name} value={JSON.stringify(metric)}>
              {metric.name}
            </option>
          ))
        );
        break;
    }
  }

  function hasAllRequiredFields(): boolean {
    return Boolean(selectedMetric) && Boolean(dateRange?.startDate) && Boolean(dateRange?.endDate) && Boolean(selectedVisualizationType);
  }

  async function handleCreation() {
    try {
      if (!hasAllRequiredFields()) {
        console.error('Missing required fields');
        return;
      }
      const padding = 3;

      createApp({
        title: 'RAPID',
        roomId: props.data.roomId!,
        boardId: props.data.boardId!,
        position: {
          x: props.data.position.x + props.data.size.width + padding,
          y: props.data.position.y,
          z: 0,
        },
        size: {
          width: props.data.size.width,
          height: props.data.size.height,
          depth: 0,
        },
        type: 'RAPID',
        rotation: { x: 0, y: 0, z: 0 },
        state: {
          liveData: true,
          lastUpdated: null,
          sensors: {
            waggle: selectedSensors.filter((s) => s.type === 'Waggle').map((s) => s.id),
            mesonet: selectedSensors.filter((s) => s.type === 'Mesonet').map((s) => s.id),
          },
          category: 'Graph',
          metric: JSON.parse(selectedMetric!),
          startTime: dateRange.startDate,
          endTime: dateRange.endDate,
        },
        raised: true,
        dragging: false,
        pinned: false,
      });

      onClose();
    } catch (error) {
      console.error('Error creating RAPID app:', error);
    }
  }

  console.log("has all required fields", hasAllRequiredFields());

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent minHeight="60vh" minWidth="90vw" maxWidth="90vw" maxHeight="90vh" width="full" height="full" padding="2">
        <Flex height="full" padding="3" borderRadius="5" background={colorMode === 'light' ? '#fff' : '#222'}>
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
                    onClick={() => {
                      if (selectedSensors.some((s) => s.id === station.id && s.type === 'Mesonet')) {
                        setSelectedSensors(selectedSensors.filter((s) => !(s.id === station.id && s.type === 'Mesonet')));
                      } else {
                        setSelectedSensors([...selectedSensors, { id: station.id, type: 'Mesonet' }]);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <IoTriangle color={station.selected ? 'red' : '#777'} />
                  </Marker>
                ))}

              {sensorInfo &&
                sensorInfo.waggle.map((station) => (
                  <Marker
                    key={station.id}
                    latitude={station.lat}
                    longitude={station.lon}
                    onClick={() => {
                      if (selectedSensors.some((s) => s.id === station.id && s.type === 'Waggle')) {
                        setSelectedSensors(selectedSensors.filter((s) => !(s.id === station.id && s.type === 'Waggle')));
                      } else {
                        setSelectedSensors([...selectedSensors, { id: station.id, type: 'Waggle' }]);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <TbCircleFilled color={station.selected ? 'red' : '#777'} />
                  </Marker>
                ))}
            </Map>
            <Box position="absolute" top="0" left="0" padding="3" bg={colorMode === 'light' ? '#fff' : '#222'} borderRadius="5" margin="3">
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

          <Box
            top="0"
            right="0"
            height="100%"
            width="30%"
            bg={colorMode === 'light' ? '#fff' : '#222'}
            borderRadius="5"
            padding="5"
            zIndex="10"
            display="flex"
            flexDir="column"
            justifyContent="space-between"
            gap="3"
            overflow="auto"
          >
            <Box display="flex" flexDir="column" gap="3">
              <h3>Select Sensors</h3>
              <Input placeholder="Search" />
              <hr />
              <Box display="flex" justifyContent="space-between" alignItems="baseline">
                <h3>Selected Sensors</h3>
                <Text
                  fontSize="xs"
                  backgroundColor="transparent"
                  _hover={{ textDecoration: 'underline' }}
                  cursor="pointer"
                  onClick={() => {
                    setSelectedSensors([]);
                  }}
                >
                  Clear
                </Text>
              </Box>
              <Box overflow="auto" height="200px">
                {selectedSensors.length > 0 ? (
                  selectedSensors.map((sensor) => (
                    <Box display="flex" justifyContent="space-between" marginY="2" key={`${sensor.type}-${sensor.id}`}>
                      <p>{`${sensor.type}: ${sensor.id}`}</p>
                      <Button
                        size="xs"
                        onClick={() => setSelectedSensors(selectedSensors.filter((s) => !(s.id === sensor.id && s.type === sensor.type)))}
                      >
                        Remove
                      </Button>
                    </Box>
                  ))
                ) : (
                  <p>No sensors selected. Please select sensors by clicking on them on the map, or search for a station.</p>
                )}
              </Box>
              <hr />
            </Box>

            <Box display="flex" flexDir="column" gap="3">
              <Box>
                <label htmlFor="metric">Metric</label>
                <Select
                  name="metric"
                  placeholder="Metric"
                  onChange={(e) => {
                    setSelectedMetric(e.target.value);
                  }}
                >
                  {metrics}
                </Select>
              </Box>
              <Box>
                <label htmlFor="time range">Time Range</label>
                <DateRangePicker onChange={handleDateRangeChange} initialDateRange={dateRange} />
              </Box>
              <Box>
                <label htmlFor="visualization type">Visualization Type</label>
                <Select
                  placeholder="Visualization Type"
                  onChange={(e) => {
                    setSelectedVisualizationType(e.target.value);
                  }}
                >
                  <option value="Line Graph">Line Graph</option>
                  <option value="Overview">Overview</option>
                </Select>
              </Box>
            </Box>

            <Box display="flex" justifyContent="end" gap="3">
              <Button onClick={onClose}>Cancel</Button>
              <Button isDisabled={!hasAllRequiredFields()} onClick={handleCreation}>
                Create
              </Button>
            </Box>
          </Box>
        </Flex>
      </ModalContent>
    </Modal>
  );
};

export default StationEditorModal;
