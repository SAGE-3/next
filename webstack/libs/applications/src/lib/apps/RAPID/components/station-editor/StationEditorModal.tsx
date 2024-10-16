import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Modal, ModalOverlay, ModalContent, Box, useColorMode, Flex } from '@chakra-ui/react';
import { App } from '@sage3/applications/schema';
import { useAppStore } from '@sage3/frontend';
import * as API from '../../api/apis';
import { SAGE_SENSORS } from '../../data/constants';
import MapComponent from './components/MapComponent';
import SensorList from './components/SensorList';
import MetricSelector from './components/MetricSelector';
import DateRangeSelector from './components/DateRangeSelector';
import VisualizationTypeSelector from './components/VisualizationTypeSelector';

interface StationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  app: App;
}

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface SelectedSensor {
  id: string;
  type: 'Waggle' | 'Mesonet';
}

export type SensorInfoType = {
  waggle: { lat: number; lon: number; name: string; id: string; selected: boolean }[];
  mesonet: { lat: number; lon: number; name: string; id: string; selected: boolean }[];
};

const StationEditorModal: React.FC<StationEditorModalProps> = ({ isOpen, onClose, mode, app }) => {
  const [sensorInfo, setSensorInfo] = useState<SensorInfoType | null>(null);
  const [selectedSensors, setSelectedSensors] = useState<SelectedSensor[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [selectedVisualizationType, setSelectedVisualizationType] = useState<string | null>(null);

  const { colorMode } = useColorMode();
  const createApp = useAppStore((state) => state.create);
  const updateApp = useAppStore((state) => state.update);

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    initializeFromProps();
  }, [app.data.state]);

  useEffect(() => {
    updateSensorSelection();
  }, [selectedSensors]);

  function initializeFromProps() {
    const { sensors, metric, startTime, endTime, category } = app.data.state;

    setSelectedSensors([
      ...sensors.waggle.map((id: any) => ({ id, type: 'Waggle' as const })),
      ...sensors.mesonet.map((id: any) => ({ id, type: 'Mesonet' as const })),
    ]);

    setSelectedMetric(JSON.stringify(metric));
    setDateRange({ startDate: new Date(startTime), endDate: new Date(endTime) });
    setSelectedVisualizationType(category);
  }

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

  function updateSensorSelection() {
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
        return { mesonet: updatedMesonetStations, waggle: updatedSageSensors };
      }
      return prevSensorInfo;
    });
  }

  const hasAllRequiredFields: boolean = useMemo(() => {
    return (
      Boolean(selectedSensors.length > 0) &&
      Boolean(selectedMetric) &&
      Boolean(dateRange?.startDate) &&
      Boolean(dateRange?.endDate) &&
      Boolean(selectedVisualizationType)
    );
  }, [selectedMetric, dateRange, selectedVisualizationType, selectedSensors]);

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  async function handleSubmit() {
    try {
      if (!hasAllRequiredFields) {
        console.error('Missing required fields');
        return;
      }

      const appData = {
        state: {
          liveData: true,
          lastUpdated: null,
          sensors: {
            waggle: selectedSensors.filter((s) => s.type === 'Waggle').map((s) => s.id),
            mesonet: selectedSensors.filter((s) => s.type === 'Mesonet').map((s) => s.id),
          },
          category: selectedVisualizationType,
          metric: JSON.parse(selectedMetric!),
          startTime: dateRange.startDate,
          endTime: dateRange.endDate,
        },
      };
      console.log('app data', appData);

      if (mode === 'edit') {
        updateApp(app._id, appData);
      } else {
        const padding = 3;
        createApp({
          ...appData,
          title: 'RAPID',
          roomId: app.data.roomId!,
          boardId: app.data.boardId!,
          position: {
            x: app.data.position.x + app.data.size.width + padding,
            y: app.data.position.y,
            z: 0,
          },
          size: {
            width: app.data.size.width,
            height: app.data.size.height,
            depth: 0,
          },
          type: 'RAPID',
          rotation: { x: 0, y: 0, z: 0 },
          raised: true,
          dragging: false,
          pinned: false,
        });
      }

      onClose();
    } catch (error) {
      console.error('Error submitting RAPID app:', error);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent minHeight="60vh" minWidth="90vw" maxWidth="90vw" maxHeight="90vh" width="full" height="full" padding="2">
        <Flex height="full" padding="3" borderRadius="5" background={colorMode === 'light' ? '#fff' : '#222'}>
          <MapComponent sensorInfo={sensorInfo} selectedSensors={selectedSensors} setSelectedSensors={setSelectedSensors} />
          <Box
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
            <SensorList selectedSensors={selectedSensors} setSelectedSensors={setSelectedSensors} />
            <Box display="flex" flexDir="column" gap="3">
              <MetricSelector selectedSensors={selectedSensors} setSelectedMetric={setSelectedMetric} initialMetric={selectedMetric} />
              <DateRangeSelector dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
              <VisualizationTypeSelector
                setSelectedVisualizationType={setSelectedVisualizationType}
                initialType={selectedVisualizationType}
              />
            </Box>
            <Box display="flex" justifyContent="end" gap="3">
              <Button onClick={onClose}>Cancel</Button>
              <Button isDisabled={!hasAllRequiredFields} onClick={handleSubmit}>
                {mode === 'edit' ? 'Update' : 'Create'}
              </Button>
            </Box>
          </Box>
        </Flex>
      </ModalContent>
    </Modal>
  );
};

export default StationEditorModal;
