/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Sage Imports
import { useAppStore, useHexColor, useUIStore } from '@sage3/frontend';
import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

// React Imports
import {
  Box,
  HStack,
  Spinner,
  useColorModeValue,
  Button,
  ButtonGroup,
  Text,
  Tooltip,
  Select,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Heading,
  Checkbox,
  Portal,
} from '@chakra-ui/react';

import { MdDelete, MdAdd, MdArrowDropDown, MdArrowDropUp, MdDoubleArrow } from 'react-icons/md';

// Styling
import './styling.css';
import { useEffect, useRef, useState } from 'react';

// Visualization imports
import VariableCard from '../HCDP/viewers/VariableCard';
import EChartsViewer from '../HCDP/viewers/EChartsViewer';
import CurrentConditions from '../HCDP/viewers/CurrentConditions';
import CustomizeWidgets, {
  getFormattedDateTime1MonthBefore,
  getFormattedDateTime1WeekBefore,
  getFormattedDateTime1YearBefore,
} from '../HCDP/menu/CustomizeWidgets';
import StationMetadata from '../HCDP/viewers/StationMetadata';
import FriendlyVariableCard from '../HCDP/viewers/FriendlyVariableCard';
import StatisticCard from '../HCDP/viewers/StatisticCard';
import MapViewer from '../HCDP/viewers/MapViewer';

import { checkAvailableVisualizations } from '../HCDP/menu/CustomizeWidgets';
import LeafletWrapper from '../HCDP/LeafletWrapper';
import MapGL from './MapGL';

export const getFormattedTimePeriod = (timePeriod: string) => {
  switch (timePeriod) {
    case 'previous24Hours':
      return '24 hours';
    case 'previous1Week':
      return '1 week';
    case 'previous1Month':
      return '1 month';
    case 'previous1Year':
      return '1 year';
    default:
      return 'Custom date range';
  }
};

function convertToFormattedDateTime(date: Date) {
  const now = new Date(date);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
}

function formatDuration(ms: number) {
  if (ms < 0) ms = -ms;
  const mins = Math.floor(ms / 60000) % 60;
  if (mins > 0) {
    return `${mins} minutes ago`;
  } else {
    return `less than a minute ago`;
  }
}

// Convert the dateTime to Chakra format
function convertToChakraDateTime(dateTime: string) {
  const year = dateTime.slice(0, 4);
  const month = dateTime.slice(4, 6);
  const day = dateTime.slice(6, 8);
  const hours = dateTime.slice(8, 10);
  const minutes = dateTime.slice(10, 12);

  const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

  return formattedDateTime;
}

function getFormattedDateTime24HoursBefore() {
  const now = new Date();
  now.setHours(now.getHours() - 24);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
}

/* App component for Sensor Overview */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const [stationMetadata, setStationMetadata] = useState([]);
  const updateState = useAppStore((state) => state.updateState);

  // Color Variables
  const bgColor = useColorModeValue('gray.100', 'gray.900');
  const textColor = useColorModeValue('gray.700', 'gray.100');

  // Time Variables
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState<string>(formatDuration(Date.now() - lastUpdate));
  const [isDuplicateMenuOpen, setIsDuplicateMenuOpen] = useState<boolean>(false);
  const scale = useUIStore((state) => state.scale);
  const createApp = useAppStore((state) => state.create);

  useEffect(() => {
    const updateTimesinceLastUpdate = () => {
      if (lastUpdate > 0) {
        const delta = Date.now() - lastUpdate;
        setTimeSinceLastUpdate(formatDuration(delta));
      }
    };
    updateTimesinceLastUpdate();
    const interval = setInterval(() => {
      updateTimesinceLastUpdate();
    }, 1000 * 30); // 30 seconds
    return () => clearInterval(interval);
  }, [lastUpdate]);

  useEffect(() => {
    const fetchStationData = async () => {
      setIsLoaded(false);
      let tmpStationMetadata: any = [];
      let url = '';
      if (props.data.state.widget.visualizationType === 'variableCard') {
        url = `https://api.mesowest.net/v2/stations/timeseries?STID=${String(
          s.stationNames
        )}&showemptystations=1&start=${getFormattedDateTime24HoursBefore()}&end=${convertToFormattedDateTime(
          new Date()
        )}&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`;
      } else {
        url = `https://api.mesowest.net/v2/stations/timeseries?STID=${String(s.stationNames)}&showemptystations=1&start=${
          props.data.state.widget.startDate
        }&end=${convertToFormattedDateTime(new Date())}&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`;
      }

      const response = await fetch(url);
      const sensor = await response.json();
      if (sensor) {
        const sensorData = sensor['STATION'];
        tmpStationMetadata = sensorData;
      }

      const availableVariableNames = Object.getOwnPropertyNames(tmpStationMetadata[0].OBSERVATIONS);
      availableVariableNames.push('Elevation, Longitude, Latitude, Name, Time');
      availableVariableNames.push('Elevation & Current Temperature');

      updateState(props._id, { availableVariableNames: availableVariableNames });
      setStationMetadata(tmpStationMetadata);
      setIsLoaded(true);
    };
    fetchStationData().catch((err) => {
      fetchStationData();
      console.log(err);
    });
    const interval = setInterval(
      () => {
        fetchStationData();
        setLastUpdate(Date.now());
      },
      60 * 10000
      //10 minutes
    );
    return () => clearInterval(interval);
  }, [JSON.stringify(s.stationNames), JSON.stringify(s.widget)]);

  const handleLockAspectRatio = () => {
    const visualizationType = s.widget.visualizationType;
    switch (visualizationType) {
      case 'variableCard':
        return 1;
      case 'friendlyVariableCard':
        return 1;
      case 'statisticCard':
        return 1.5;
      case 'stationMetadata':
        return 2.5;
      default:
        return false;
    }
  };

  //TODO just for testing out the menu for now, Later will move to top
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });

  const handleButtonHover = (event: any) => {
    const buttonRect = event.target.getBoundingClientRect();
    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    setButtonPosition({ top: buttonRect.top, left: buttonCenterX });
    onOpen();
  };

  const handleDuplicateVisualizationsAs = async (visualizationType: string) => {
    const widget = { ...props.data.state.widget, visualizationType: visualizationType };
    const app = await createApp({
      title: 'Hawaii Mesonet',
      roomId: props.data.roomId!,
      boardId: props.data.boardId!,
      //TODO get middle of the screen space
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
      rotation: { x: 0, y: 0, z: 0 },
      type: 'Hawaii Mesonet',
      state: {
        sensorData: {},
        stationNames: props.data.state.stationNames,
        listOfStationNames: s.stationNames[0],
        location: [-157.816, 21.297],
        zoom: 10,
        pitch: 0,
        stationScale: 5,
        baseLayer: 'OpenStreetMap',
        overlay: true,
        widget: widget,
      },

      raised: true,
      dragging: false,
    });
  };

  return (
    <AppWindow app={props} lockAspectRatio={handleLockAspectRatio()}>
      <Box overflowY="auto" bg={bgColor} h="100%" border={`solid #7B7B7B 15px`}>
        <Box position="absolute" top="50%" right="1rem" zIndex={999}>
          <Button
            onMouseEnter={handleButtonHover}
            onMouseLeave={() => {
              onClose();
            }}
            colorScheme="twitter"
            height="10%"
          >
            <MdDoubleArrow size="40" />
          </Button>
          {isOpen && (
            <Portal>
              <Box
                onMouseEnter={() => {
                  onOpen();
                }}
                onMouseLeave={() => {
                  onClose();
                }}
                position="absolute"
                top={`${buttonPosition.top}px`}
                left={`${buttonPosition.left}px`}
                // bg="blue.200"
                borderRadius="md"
                p={4}
                boxShadow="md"
                zIndex={1}
                className="selectableList"
                transform={`scale(0.9) translateY(-${buttonPosition.top / 4}px)`}
                transformOrigin={'top left'}
              >
                {/* Content of the opened div */}
                <Box ml="0.4rem">Duplicate as:</Box>
                {/* <Tooltip label={'Select a visualization that you would like to see'} aria-label="A tooltip"> */}
                {checkAvailableVisualizations(s.widget.yAxisNames[0]).map(
                  (visualization: { value: string; name: string }, index: number) => {
                    return (
                      <Text
                        key={index}
                        onClick={() => {
                          handleDuplicateVisualizationsAs(visualization.value);
                        }}
                        className="selectableListItem"
                      >
                        {visualization.name}
                      </Text>
                    );
                  }
                )}
                {/* </Tooltip> */}
              </Box>
            </Portal>
          )}
        </Box>

        {stationMetadata.length > 0 ? (
          <Box bgColor={bgColor} color={textColor} fontSize="lg">
            <HStack>
              <Box>
                {s.widget.visualizationType === 'variableCard' ? (
                  <VariableCard
                    size={{ width: props.data.size.width - 30, height: props.data.size.height - 35, depth: 0 }}
                    state={props.data.state}
                    stationNames={s.stationNames}
                    startDate={s.widget.startDate}
                    stationMetadata={stationMetadata}
                    timeSinceLastUpdate={timeSinceLastUpdate}
                    generateAllVariables={s.widget.visualizationType === 'allVariables'}
                    isLoaded={true}
                    isCustomizeWidgetMenu={false}
                  />
                ) : null}
                {s.widget.visualizationType === 'friendlyVariableCard' ? (
                  <FriendlyVariableCard
                    size={{ width: props.data.size.width - 30, height: props.data.size.height - 35, depth: 0 }}
                    state={props.data.state}
                    stationNames={s.stationNames}
                    startDate={s.widget.startDate}
                    stationMetadata={stationMetadata}
                    timeSinceLastUpdate={timeSinceLastUpdate}
                    generateAllVariables={s.widget.visualizationType === 'allVariables'}
                    isLoaded={true}
                    isCustomizeWidgetMenu={false}
                  />
                ) : null}
                {s.widget.visualizationType === 'statisticCard' ? (
                  <StatisticCard
                    size={{ width: props.data.size.width - 30, height: props.data.size.height - 35, depth: 0 }}
                    state={props.data.state}
                    widget={props.data.state.widget}
                    stationNames={s.stationNames}
                    startDate={s.widget.startDate}
                    stationMetadata={stationMetadata}
                    timeSinceLastUpdate={timeSinceLastUpdate}
                    generateAllVariables={s.widget.visualizationType === 'allVariables'}
                    isLoaded={isLoaded}
                    isCustomizeWidgetMenu={false}
                  />
                ) : null}
                {props.data.state.widget.visualizationType === 'line' ||
                props.data.state.widget.visualizationType === 'bar' ||
                props.data.state.widget.visualizationType === 'scatter' ? (
                  <EChartsViewer
                    stationNames={s.stationNames}
                    isLoaded={isLoaded}
                    startDate={props.data.state.widget.startDate}
                    timeSinceLastUpdate={timeSinceLastUpdate}
                    widget={s.widget}
                    size={{ width: props.data.size.width - 30, height: props.data.size.height - 35, depth: 0 }}
                    stationMetadata={stationMetadata}
                  />
                ) : null}
                {props.data.state.widget.visualizationType === 'allVariables' ? (
                  <>
                    <CurrentConditions
                      size={props.data.size}
                      state={props.data.state}
                      stationNames={s.stationNames}
                      startDate={s.widget.startDate}
                      stationMetadata={stationMetadata}
                      timeSinceLastUpdate={timeSinceLastUpdate}
                      isLoaded={true}
                    />
                  </>
                ) : null}
                {props.data.state.widget.visualizationType === 'stationMetadata' ? (
                  <>
                    <StationMetadata
                      size={{ width: props.data.size.width - 30, height: props.data.size.height - 35, depth: 0 }}
                      state={props.data.state}
                      stationNames={s.stationNames}
                      stationMetadata={stationMetadata}
                      isLoaded={isLoaded}
                    />
                  </>
                ) : null}
                {props.data.state.widget.visualizationType === 'map' ? (
                  <>
                    <Box id={'container' + props._id} width={props.data.size.width} height={props.data.size.height}>
                      <MapViewer {...props} isSelectingStations={false} isLoaded={isLoaded} stationMetadata={stationMetadata} />
                    </Box>
                  </>
                ) : null}
              </Box>
            </HStack>
          </Box>
        ) : (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform={`scale(${Math.min(props.data.size.width / 50, props.data.size.height / 50)})`}
          >
            <Spinner thickness="5px" speed="0.30s" emptyColor="gray.200" />
          </Box>
        )}
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app Sensor Overview */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const createApp = useAppStore((state) => state.create);

  const updateState = useAppStore((state) => state.updateState);
  const fitApps = useUIStore((state) => state.fitApps);

  const [map, setMap] = useState<any>(null);
  const [stationMetadata, setStationMetadata] = useState([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isSortedOn, setIsSortedOn] = useState<{ name: string; direction: string }>({ name: 'NAME', direction: 'ascending' });

  // For color theme
  const textColor = useColorModeValue('gray.800', 'gray.50');
  const drawerBackgroundColor: string = useColorModeValue('gray.50', 'gray.700');
  const headerBackgroundColor: string = useColorModeValue('white', 'gray.800');
  const accentColor: string = useColorModeValue('#DFDFDF', '#424242');

  const stationNameRef = useRef<any>(s.stationNames);
  useEffect(() => {
    const fetchStationData = async () => {
      setIsLoaded(false);
      let tmpStationMetadata: any = [];
      let url = '';
      const stationNames = stationData.map((station) => station.name);
      url = `https://api.mesowest.net/v2/stations/timeseries?STID=${String(
        stationNames
      )}&showemptystations=1&start=${getFormattedDateTime24HoursBefore()}&end=${convertToFormattedDateTime(
        new Date()
      )}&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`;

      const response = await fetch(url);
      const sensor = await response.json();
      if (sensor) {
        const sensorData = sensor['STATION'];
        tmpStationMetadata = sensorData;
      }
      setStationMetadata(tmpStationMetadata);
      setIsLoaded(true);
    };

    fetchStationData().catch((err) => {
      fetchStationData();
      console.log(err);
    });
  }, []);

  const handleVisualizeAllVariables = async () => {
    let url = '';
    if (props.data.state.widget.visualizationType === 'variableCard') {
      url = `https://api.mesowest.net/v2/stations/timeseries?STID=${String(
        s.stationNames
      )}&showemptystations=1&start=${getFormattedDateTime24HoursBefore()}&end=${convertToFormattedDateTime(
        new Date()
      )}&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`;
    } else {
      url = `https://api.mesowest.net/v2/stations/timeseries?STID=${String(s.stationNames)}&showemptystations=1&start=${
        props.data.state.widget.startDate
      }&end=${convertToFormattedDateTime(new Date())}&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`;
    }

    const response = await fetch(url);
    const sensor = await response.json();
    if (sensor) {
      const observations = sensor['STATION'][0]['OBSERVATIONS'];
      let properties = Object.getOwnPropertyNames(observations);
      let row = 0;
      let visualizationSize = { height: 1800, width: 1800 };
      const isLineBarScatterStationMetadataVis =
        props.data.state.widget.visualizationType === 'line' ||
        props.data.state.widget.visualizationType === 'bar' ||
        props.data.state.widget.visualizationType === 'scatter' ||
        props.data.state.widget.visualizationType === 'stationMetadata';

      const isStatisticsCard = props.data.state.widget.visualizationType === 'statisticCard';
      if (isLineBarScatterStationMetadataVis) {
        visualizationSize = { height: 1200, width: 2000 };
      } else if (isStatisticsCard) {
        visualizationSize = { height: 1200, width: 1800 };
      }
      properties = properties.filter((property) => property !== 'date_time');
      properties = properties.filter((property) => property !== 'wind_cardinal_direction_1d');
      for (let i = 0; i < properties.length; i++) {
        if (i % 3 === 0) row++;

        const widget = props.data.state.widget;
        widget.yAxisNames[0] = properties[i];
        const app = await createApp({
          title: 'Hawaii Mesonet',
          roomId: props.data.roomId!,
          boardId: props.data.boardId!,
          position: {
            x: props.data.position.x + visualizationSize.width * (i % 3),
            y: props.data.position.y + visualizationSize.height * row,
            z: 0,
          },
          size: {
            width: visualizationSize.width,
            height: visualizationSize.height,
            depth: 0,
          },
          rotation: { x: 0, y: 0, z: 0 },
          type: 'Hawaii Mesonet',
          state: {
            sensorData: {},
            stationNames: props.data.state.stationNames,
            listOfStationNames: s.stationNames[0],
            location: [-157.816, 21.297],
            zoom: 8,
            baseLayer: 'OpenStreetMap',
            overlay: true,
            widget: widget,
          },
          raised: true,
          dragging: false,
        });
      }
    }
  };

  const handleChangeVariable = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const variable = event.target.value;
    updateState(props._id, { widget: { ...s.widget, yAxisNames: [variable] } });

    if (variable === 'Elevation & Current Temperature') {
      updateState(props._id, { widget: { ...s.widget, yAxisNames: [variable] } });

      // setWidget({ ...widget, yAxisNames: ['Elevation & Current Temperature'] });
    } else {
      updateState(props._id, { widget: { ...s.widget, yAxisNames: [variable], xAxisNames: ['date_time'] } });

      // setWidget({ ...widget, yAxisNames: [value], xAxisNames: ['date_time'] });
    }
  };

  const handleVisualizationTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const visualizationType = event.target.value;
    updateState(props._id, { widget: { ...s.widget, visualizationType: visualizationType } });
  };

  const removeVisualizationsThatRequireMultipleStations = (availableVisualizations: { value: string; name: string }[]) => {
    if (s.stationNames.length > 1) {
      return availableVisualizations.filter((visualization) => {
        return (
          visualization.value !== 'variableCard' &&
          visualization.value !== 'friendlyVariableCard' &&
          visualization.value !== 'statisticCard'
        );
      });
    } else {
      return availableVisualizations;
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    const date = new Date(selectedDate);

    const startDate = convertToFormattedDateTime(date);
    updateState(props._id, { widget: { ...s.widget, startDate: startDate, timePeriod: 'custom' } });
  };

  const handleSelectDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const timePeriod = e.target.value;
    const date = new Date();
    switch (timePeriod) {
      case 'previous24Hours':
        updateState(props._id, { widget: { ...s.widget, startDate: getFormattedDateTime24HoursBefore(), timePeriod: 'previous24Hours' } });
        break;
      case 'previous1Week':
        updateState(props._id, { widget: { ...s.widget, startDate: getFormattedDateTime1WeekBefore(), timePeriod: 'previous1Week' } });

        break;
      case 'previous1Month':
        updateState(props._id, { widget: { ...s.widget, startDate: getFormattedDateTime1MonthBefore(), timePeriod: 'previous1Month' } });

        break;
      case 'previous1Year':
        updateState(props._id, { widget: { ...s.widget, startDate: getFormattedDateTime1YearBefore(), timePeriod: 'previous1Year' } });

        break;
      default:
        break;
    }
  };
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleAddSelectedStation = (station: { lat: number; lon: number; name: string; selected: boolean }) => {
    const stationNames = s.stationNames;
    stationNames.push(station.name);
    updateState(props._id, { stationNames: stationNames });
  };

  const handleRemoveSelectedStation = (station: { lat: number; lon: number; name: string; selected: boolean }) => {
    const stationNames = s.stationNames;
    const index = stationNames.indexOf(station.name);
    if (index > -1) {
      stationNames.splice(index, 1);
    }
    updateState(props._id, { stationNames: stationNames });
  };

  const handleFilterOn = (attributeName: string) => {
    const isFirstTime = isSortedOn.name !== attributeName || isSortedOn.direction === 'ascending';
    const isSecondTime = isSortedOn.name === attributeName && isSortedOn.direction === 'descending';
    const isThirdTime = isSortedOn.name === attributeName && isSortedOn.direction === 'ascending';
    if (isFirstTime) {
      const tmpStationMetadata = stationMetadata.sort((a: any, b: any) => {
        if (isNaN(a[attributeName])) {
          if (attributeName === 'SELECTED') {
            if (s.stationNames.includes(a['STID'])) {
              return -1;
            } else {
              return 1;
            }
          } else {
            return a[attributeName] < b[attributeName] ? 1 : -1;
          }
        } else {
          return Number(a[attributeName]) > Number(b[attributeName]) ? 1 : -1;
        }
      });
      setStationMetadata(tmpStationMetadata);
      setIsSortedOn({ name: attributeName, direction: 'descending' });
    } else if (isSecondTime) {
      const tmpStationMetadata = stationMetadata.sort((a: any, b: any) => {
        if (isNaN(a[attributeName])) {
          if (attributeName === 'SELECTED') {
            if (s.stationNames.includes(a['STID'])) {
              return 1;
            } else {
              return -1;
            }
          } else {
            return a[attributeName] < b[attributeName] ? 1 : -1;
          }
        } else {
          return Number(a[attributeName]) < Number(b[attributeName]) ? 1 : -1;
        }
      });
      setStationMetadata(tmpStationMetadata);
      setIsSortedOn({ name: attributeName, direction: 'ascending' });
    }
  };

  const tableRows = [
    { propName: 'SELECTED', name: 'Selected' },

    { propName: 'NAME', name: 'Station Name' },
    { propName: 'COUNTY', name: 'County Name' },
    { propName: 'ELEVATION', name: 'Elevation' },
    { propName: 'LATITUDE', name: 'Latitude' },
    { propName: 'LONGITUDE', name: 'Longitude' },
  ];

  const handleChangeSelectedStation = (e: React.ChangeEvent<HTMLInputElement>, stationSTID: string) => {
    const tmpSelectedStations = s.stationNames;
    if (e.target.checked) {
      tmpSelectedStations.push(stationSTID);
    } else {
      for (let i = 0; i < tmpSelectedStations.length; i++) {
        if (tmpSelectedStations[i] === stationSTID) {
          tmpSelectedStations.splice(i, 1);
        }
      }
    }
    updateState(props._id, { stationNames: tmpSelectedStations });
  };

  return (
    <>
      <Button mr="1rem" size="xs" onClick={onOpen}>
        Select Stations
      </Button>

      <Modal size="xl" isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxH="60rem" maxW="60rem">
          <ModalHeader>Station Selection</ModalHeader>
          <ModalCloseButton />
          <Box rounded="2xl" height={'40rem'} width="60rem">
            <MapGL {...props} isSelectingStations={true} stationNameRef={stationNameRef} />
          </Box>
          <ModalBody>
            <Box
              transform="translate(-25px, 7px)"
              border="3px solid"
              borderColor={accentColor}
              boxShadow="lg"
              mx="3"
              rounded="lg"
              height={'20rem'}
              width="58rem"
            >
              <Box background={headerBackgroundColor} p="1rem" borderBottom={`3px solid ${accentColor}`}>
                <Heading color={textColor} size="md" isTruncated={true}>
                  Available Stations
                </Heading>
              </Box>
              <Box overflowY="scroll" height="15rem" width="58rem">
                {/* //MdKeyboardArrowUp
                //MdArrowDropDown
                //MdArrowDropUp */}
                <table id="stationTable" style={{ width: '100%' }}>
                  {tableRows.map((row, index) => {
                    let icon = null;
                    let widthSize = '0%';
                    if (isSortedOn.name == row.propName && isSortedOn.direction === 'ascending') {
                      icon = <MdArrowDropUp size="20px" />;
                    } else if (isSortedOn.name == row.propName && isSortedOn.direction === 'descending') {
                      icon = <MdArrowDropDown size="20px" />;
                    }

                    switch (row.propName) {
                      case 'SELECTED':
                        widthSize = '9%';
                        break;
                      case 'NAME':
                        widthSize = '21%';
                        break;
                      case 'COUNTY':
                        widthSize = '20%';
                        break;
                      case 'ELEVATION':
                        widthSize = '10%';
                        break;
                      case 'LATITUDE':
                        widthSize = '10%';
                        break;
                      case 'LONGITUDE':
                        widthSize = '10%';
                        break;
                    }
                    return (
                      <th style={{ width: widthSize }} key={index} onClick={() => handleFilterOn(row.propName)}>
                        <Box display="flex">
                          {row.name} {icon}
                        </Box>
                      </th>
                    );
                  })}
                  {!isLoaded
                    ? null
                    : stationMetadata.map((station: any, index: number) => {
                        const isSelected = s.stationNames.includes(station.STID);
                        return (
                          <tr key={index}>
                            <td style={{ textAlign: 'center', width: '10px' }}>
                              <Checkbox
                                colorScheme="teal"
                                isChecked={isSelected}
                                onChange={(e) => handleChangeSelectedStation(e, station.STID)}
                              />
                            </td>
                            <td>{station.NAME}</td>
                            <td>{station.COUNTY}</td>
                            <td style={{ textAlign: 'right' }}>{station.ELEVATION}</td>
                            <td style={{ textAlign: 'right' }}>{Number(station.LATITUDE).toFixed(1)}</td>
                            <td style={{ textAlign: 'right' }}>{Number(station.LONGITUDE).toFixed(1)}</td>
                            {/* <td>variable</td> */}
                          </tr>
                        );
                      })}
                </table>
                {!isLoaded ? (
                  <Box width="100%" height="100%" position="relative">
                    {' '}
                    <Box top="50%" left="50%" position="absolute">
                      <Text>Loading Stations...</Text>
                    </Box>
                  </Box>
                ) : null}
              </Box>
            </Box>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Divider border={'1px'} size={'2xl'} orientation="vertical" />

      <Tooltip label={'Select a time period for this visualization'} aria-label="A tooltip">
        <Select
          mx="1rem"
          size="xs"
          w="10rem"
          placeholder={'Select time period'}
          value={s.widget.timePeriod}
          onChange={handleSelectDateChange}
        >
          <option value={'previous24Hours'}>24 hours</option>
          <option value={'previous1Week'}>1 week</option>
          <option value={'previous1Month'}>1 month</option>
          <option value={'previous1Year'}>1 year</option>
        </Select>
      </Tooltip>
      {/* <Text mx="1rem">OR</Text> */}
      {/* <Tooltip label={'Select a custom start date for this visualization'} aria-label="A tooltip">
        <Input
          w="10rem"
          mr="1rem"
          size="xs"
          onChange={handleDateChange}
          value={convertToChakraDateTime(s.widget.startDate)}
          placeholder="Select Date and Time"
          type="datetime-local"
          // isDisabled={
          //   widget.visualizationType === 'variableCard' || widget.visualizationType === 'friendlyVariableCard' ? true : false
          // }
        />
      </Tooltip> */}
      <Divider border={'1px'} size={'2xl'} orientation="vertical" />

      <Tooltip label={'Select a variable that you would like to visualize'} aria-label="A tooltip">
        <Select
          size="xs"
          mx="1rem"
          w="10rem"
          placeholder={'Select Variable'}
          value={s.widget.yAxisNames[0]}
          onChange={handleChangeVariable}
        >
          {s.availableVariableNames.map((name: string, index: number) => {
            return (
              <option key={index} value={name}>
                {name}
              </option>
            );
          })}
        </Select>
      </Tooltip>
      <Divider border={'1px'} size={'2xl'} orientation="vertical" />

      <Tooltip label={'Select a visualization that you would like to see'} aria-label="A tooltip">
        <Select
          size="xs"
          w="10rem"
          ml="1rem"
          placeholder={'Select Visualization Type'}
          value={s.widget.visualizationType}
          onChange={handleVisualizationTypeChange}
        >
          {checkAvailableVisualizations(s.widget.yAxisNames[0]).map((visualization: { value: string; name: string }, index: number) => {
            return (
              <option key={index} value={visualization.value}>
                {visualization.name}
              </option>
            );
          })}
        </Select>
      </Tooltip>

      {s.widget.visualizationType === 'variableCard' ? (
        <ButtonGroup size="xs" isAttached variant="outline">
          {/* <Button >Celcius</Button>
  <Button >Fahrenheit</Button> */}
        </ButtonGroup>
      ) : null}
      <Divider border={'1px'} size={'2xl'} ml="1rem" orientation="vertical" />
      <ButtonGroup ml="1rem">
        <Tooltip label={'Duplicate this chart for all other variables from this station'} aria-label="A tooltip">
          <Button colorScheme={'teal'} size="xs" onClick={handleVisualizeAllVariables}>
            All Variables
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

/* Grouped App toolbar component for the app Sensor Overview, this component will display when a group of apps are Lasso'ed are a Sensor Overview app. */

const GroupedToolbarComponent = (props: { apps: App[] }): JSX.Element => {
  const updateState = useAppStore((state) => state.updateState);
  const [variableNames, setVariableNames] = useState<string[]>([]);

  useEffect(() => {
    const availableVariableNames = props.apps.map((app) => app.data.state.availableVariableNames);
    setVariableNames(findDuplicateElementsInArray(...availableVariableNames));
  }, []);

  const handleVariableChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === 'Elevetion & Current Temperature') {
      props.apps.forEach((app: App) => {
        updateState(app._id, { widget: { ...app.data.state.widget, yAxisNames: ['Elevation & Current Temperature'] } });
      });
    } else {
      props.apps.forEach((app: App) => {
        updateState(app._id, { widget: { ...app.data.state.widget, yAxisNames: [value], xAxisNames: ['date_time'] } });
      });
    }
  };

  const handleVisualizationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
  };

  const availableVisualizations = (): any => {
    const availableVis = [];
    for (let i = 0; i < props.apps.length; i++) {
      availableVis.push(checkAvailableVisualizations(props.apps[i].data.state.widget.yAxisNames[0]));
    }
    return findDuplicateElementsInArrayObjects(...availableVis);
  };

  return (
    <>
      <Tooltip label={'Choose the variable that you would like to visualize'} aria-label="A tooltip">
        <Select size="xs" mr="1rem" placeholder={'Select Variable'} onChange={handleVariableChange}>
          {variableNames.map((name: string, index: number) => {
            return (
              <option key={index} value={name}>
                {name}
              </option>
            );
          })}
        </Select>
      </Tooltip>
      <Select
        size="xs"
        placeholder={'Select Visualization Type'}
        mr="1rem"
        // value={widget.visualizationType}
        onChange={handleVisualizationChange}
        // isDisabled={props.data.state.widget.yAxisNames[0] === 'Elevation, Longitude, Latitude, Name, Time'}
      >
        {availableVisualizations().map((visualization: { value: string; name: string }, index: number) => {
          return (
            <option key={index} value={visualization.value}>
              {visualization.name}
            </option>
          );
        })}
      </Select>
    </>
  );
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
// export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

// This function is used to only display common variables between all stations
// Will return an array of variables that are common between all stations
function findDuplicateElementsInArrayObjects(...arrays: any) {
  const elementCount: any = [];
  arrays.forEach((array: any[]) => {
    array.forEach((element) => {
      let found = false;
      for (let i = 0; i < elementCount.length; i++) {
        if (JSON.stringify(elementCount[i].element) === JSON.stringify(element)) {
          elementCount[i].count++;
          found = true;
          break;
        }
      }
      if (!found) {
        elementCount.push({ element: element, count: 1 });
      }
    });
  });
  const duplicates = [];
  for (let i = 0; i < elementCount.length; i++) {
    if (elementCount[i].count === arrays.length) {
      duplicates.push(elementCount.element);
    }
  }

  return [];
}

// This function is used to only display common variables between all stations
// Will return an array of variables that are common between all stations
function findDuplicateElementsInArray(...arrays: any) {
  const elementCount: any = {};
  arrays.forEach((array: any[]) => {
    array.forEach((element) => {
      if (element in elementCount) {
        elementCount[element]++;
      } else {
        elementCount[element] = 1;
      }
    });
  });

  const duplicates = [];
  for (const element in elementCount) {
    if (elementCount[element] === arrays.length) {
      duplicates.push(element);
    }
  }

  return duplicates;
}

// For now, this is hard-coded. Will change when HCDP is ready.
export const stationData: { lat: number; lon: number; name: string; selected: boolean }[] = [
  {
    lat: 20.8415,
    lon: -156.2948,
    name: '017HI',
    selected: false,
  },
  {
    lat: 20.7067,
    lon: -156.3554,
    name: '016HI',
    selected: false,
  },
  {
    lat: 20.7579,
    lon: -156.32,
    name: '001HI',
    selected: false,
  },
  {
    lat: 20.7598,
    lon: -156.2482,
    name: '002HI',
    selected: false,
  },
  {
    lat: 20.64422,
    lon: -156.342056,
    name: '028HI',
    selected: false,
  },
  {
    lat: 20.7382,
    lon: -156.2458,
    name: '013HI',
    selected: false,
  },
  {
    lat: 20.7104,
    lon: -156.2567,
    name: '003HI',
    selected: false,
  },
  {
    lat: 19.6974,
    lon: -155.0954,
    name: '005HI',
    selected: false,
  },
  {
    lat: 19.964,
    lon: -155.25,
    name: '006HI',
    selected: false,
  },
  {
    lat: 19.932,
    lon: -155.291,
    name: '007HI',
    selected: false,
  },
  {
    lat: 19.748,
    lon: -155.996,
    name: '008HI',
    selected: false,
  },
  {
    lat: 19.803,
    lon: -155.851,
    name: '009HI',
    selected: false,
  },
  {
    lat: 19.73,
    lon: -155.87,
    name: '010HI',
    selected: false,
  },
  {
    lat: 21.333,
    lon: -157.8025,
    name: '011HI',
    selected: false,
  },
  {
    lat: 21.3391,
    lon: -157.8369,
    name: '012HI',
    selected: false,
  },
  {
    lat: 22.2026,
    lon: -159.5188,
    name: '014HI',
    selected: false,
  },
  {
    lat: 22.1975,
    lon: -159.421,
    name: '015HI',
    selected: false,
  },
  {
    lat: 20.63395,
    lon: -156.27389,
    name: '019HI',
    selected: false,
  },
  {
    lat: 20.644215,
    lon: -156.284703,
    name: '032HI',
    selected: false,
  },
  {
    lat: 20.7736,
    lon: -156.2223,
    name: '020HI',
    selected: false,
  },
  {
    lat: 20.7195,
    lon: -156.00236,
    name: '023HI',
    selected: false,
  },
  {
    lat: 19.6061748,
    lon: -155.051523,
    name: '033HI',
    selected: false,
  },
  {
    lat: 19.845036,
    lon: -155.362586,
    name: '022HI',
    selected: false,
  },
  {
    lat: 19.8343,
    lon: -155.1224,
    name: '021HI',
    selected: false,
  },
  {
    lat: 19.8343,
    lon: -155.1224,
    name: '021HI',
    selected: false,
  },
  {
    lat: 19.6687,
    lon: -155.9575, //missing a negative here in tom's website
    name: '029HI',
    selected: false,
  },
  {
    lat: 19.1689,
    lon: -155.5704,
    name: '018HI',
    selected: false,
  },
  {
    lat: 20.12283,
    lon: -155.749328,
    name: '025HI',
    selected: false,
  },
  {
    lat: 20.019528,
    lon: -155.677085,
    name: '027HI',
    selected: false,
  },
  {
    lat: 21.145283,
    lon: -156.729459,
    name: '030HI',
    selected: false,
  },
  {
    lat: 21.131411,
    lon: -156.758628,
    name: '031HI',
    selected: false,
  },
  {
    lat: 21.506875,
    lon: -158.145114,
    name: '026HI',
    selected: false,
  },
  {
    lat: 22.2198,
    lon: -159.57525,
    name: '024HI',
    selected: false,
  },
];
