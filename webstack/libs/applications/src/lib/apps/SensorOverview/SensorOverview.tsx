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
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Heading,
  Accordion,
  AccordionItem,
  AccordionButton,
  IconButton,
  AccordionIcon,
  AccordionPanel,
  UnorderedList,
  ListItem,
} from '@chakra-ui/react';

import { MdDelete, MdAdd } from 'react-icons/md';

import { TileLayer, LayersControl, CircleMarker, SVGOverlay, Tooltip as LeafletTooltip } from 'react-leaflet';

// Styling
import './styling.css';
import { useEffect, useState } from 'react';

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
  return (
    <AppWindow app={props} lockAspectRatio={handleLockAspectRatio()}>
      <Box overflowY="auto" bg={bgColor} h="100%" border={`solid #7B7B7B 15px`}>
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
                    <MapViewer {...props} isSelectingStations={false} />
                  </>
                ) : null}
              </Box>
            </HStack>
          </Box>
        ) : (
          <Spinner
            w={Math.min(props.data.size.height / 2, props.data.size.width / 2)}
            h={Math.min(props.data.size.height / 2, props.data.size.width / 2)}
            thickness="20px"
            speed="0.30s"
            emptyColor="gray.200"
          />
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

  // For color theme
  const textColor = useColorModeValue('gray.800', 'gray.50');
  const drawerBackgroundColor: string = useColorModeValue('gray.50', 'gray.700');
  const headerBackgroundColor: string = useColorModeValue('white', 'gray.800');
  const accentColor: string = useColorModeValue('#DFDFDF', '#424242');

  useEffect(() => {
    const fetchStationData = async () => {
      setIsLoaded(false);
      let tmpStationMetadata: any = [];
      let url = '';
      console.log(stationData.map((station) => station.name));
      const stationNames = stationData.map((station) => station.name);
      url = `https://api.mesowest.net/v2/stations/timeseries?STID=${String(
        stationNames
      )}&showemptystations=1&start=${getFormattedDateTime24HoursBefore()}&end=${convertToFormattedDateTime(
        new Date()
      )}&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`;
      // if (props.data.state.widget.visualizationType === 'variableCard') {
      //   url = `https://api.mesowest.net/v2/stations/timeseries?STID=${String(
      //     s.stationNames
      //   )}&showemptystations=1&start=${getFormattedDateTime24HoursBefore()}&end=${convertToFormattedDateTime(
      //     new Date()
      //   )}&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`;
      // } else {
      //   url = `https://api.mesowest.net/v2/stations/timeseries?STID=${String(s.stationNames)}&showemptystations=1&start=${
      //     props.data.state.widget.startDate
      //   }&end=${convertToFormattedDateTime(new Date())}&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`;
      // }

      const response = await fetch(url);
      const sensor = await response.json();
      if (sensor) {
        const sensorData = sensor['STATION'];
        tmpStationMetadata = sensorData;
      }

      const availableVariableNames = Object.getOwnPropertyNames(tmpStationMetadata[0].OBSERVATIONS);
      availableVariableNames.push('Elevation, Longitude, Latitude, Name, Time');
      availableVariableNames.push('Elevation & Current Temperature');

      // updateState(props._id, { availableVariableNames: availableVariableNames });
      setStationMetadata(tmpStationMetadata);
      setIsLoaded(true);
    };

    fetchStationData().catch((err) => {
      fetchStationData();
      console.log(err);
    });
  }, []);

  const handleOpenAndEditWidget = async () => {
    const app = await createApp({
      title: 'SensorOverview',
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
      type: 'SensorOverview',
      state: {
        sensorData: {},
        stationNames: props.data.state.stationNames,
        listOfStationNames: s.stationNames[0],
        location: [21.297, -157.816],
        zoom: 8,
        baseLayer: 'OpenStreetMap',
        overlay: true,
        widget: props.data.state.widget,
      },
      raised: true,
      dragging: false,
    });
    // console.log(app);
    fitApps([app.data]);
  };

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
      const largestSize = props.data.size.width > props.data.size.height ? props.data.size.width : props.data.size.height;
      properties = properties.filter((property) => property !== 'date_time');
      properties = properties.filter((property) => property !== 'wind_cardinal_direction_1d');
      for (let i = 0; i < properties.length; i++) {
        if (i % 3 === 0) row++;

        const widget = props.data.state.widget;
        widget.yAxisNames[0] = properties[i];
        const app = await createApp({
          title: 'SensorOverview',
          roomId: props.data.roomId!,
          boardId: props.data.boardId!,
          //TODO get middle of the screen space
          position: {
            x: props.data.position.x + largestSize * (i % 3),
            y: props.data.position.y + largestSize * row,
            z: 0,
          },
          size: {
            width: largestSize,
            height: largestSize,
            depth: 0,
          },
          rotation: { x: 0, y: 0, z: 0 },
          type: 'SensorOverview',
          state: {
            sensorData: {},
            stationNames: props.data.state.stationNames,
            listOfStationNames: s.stationNames[0],
            location: [21.297, -157.816],
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

  return (
    <>
      <Button mr="1rem" size="xs" onClick={onOpen}>
        Select Stations
      </Button>

      <Modal size="xl" isOpen={true} onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxH="60rem" maxW="60rem">
          <ModalHeader>Station Selection</ModalHeader>
          <ModalCloseButton />
          <Box rounded="2xl" height={'40rem'} width="60rem">
            <MapViewer {...props} isSelectingStations={true} />
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
              width="30rem"
            >
              <Box background={headerBackgroundColor} p="1rem" borderBottom={`3px solid ${accentColor}`}>
                <Heading color={textColor} size="md" isTruncated={true}>
                  Available Stations
                </Heading>
              </Box>
              <Accordion allowMultiple overflowY="scroll" height="15rem">
                {!isLoaded
                  ? props.data.state.stationNames.map((stationName: string, index: number) => {
                      return (
                        <Box p="1rem" key={index} bg={index % 2 == 1 ? drawerBackgroundColor : accentColor}>
                          Loading Station...
                        </Box>
                      );
                    })
                  : stationMetadata.map((station: any, index: number) => {
                      return (
                        <Box key={index} bg={index % 2 == 1 ? drawerBackgroundColor : accentColor}>
                          <AccordionItem>
                            <AccordionButton>
                              <Box
                                as="span"
                                flex="1"
                                textAlign="left"
                                ml={'15px'}
                                width="5rem"
                                whiteSpace="nowrap"
                                overflow="hidden"
                                textOverflow="ellipsis"
                              >
                                {station.NAME}
                              </Box>

                              <AccordionIcon />
                              <Tooltip
                                key={index}
                                placement="top"
                                label={
                                  props.data.state.stationNames.length < 2
                                    ? 'You must have at least one station selected'
                                    : 'Remove station from list'
                                }
                                openDelay={300}
                                aria-label="A tooltip"
                              >
                                <IconButton
                                  icon={<MdDelete />}
                                  aria-label="Delete Station"
                                  ml="1rem"
                                  colorScheme="red"
                                  size="xs"
                                  isDisabled={props.data.state.stationNames.length < 2}
                                  fontWeight="bold"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (props.data.state.stationNames.length >= 2)
                                      handleRemoveSelectedStation({
                                        lat: station.lat as number,
                                        lon: station.lon as number,
                                        name: station.STID as string,
                                        selected: true,
                                      });
                                  }}
                                >
                                  X
                                </IconButton>
                              </Tooltip>
                            </AccordionButton>

                            <AccordionPanel pb={4}>
                              <UnorderedList>
                                {Object.getOwnPropertyNames(station.OBSERVATIONS).map((name: string, index: number) => {
                                  return (
                                    <Tooltip key={index} label="Information on the attribute" openDelay={300} aria-label="A tooltip">
                                      <ListItem key={index}>{name}</ListItem>
                                    </Tooltip>
                                  );
                                })}
                              </UnorderedList>
                            </AccordionPanel>
                          </AccordionItem>
                        </Box>
                      );
                    })}
              </Accordion>
              {/* <Accordion allowMultiple overflowY="scroll" height="15rem">
                {!isLoaded
                  ? props.data.state.stationNames.map((stationName: string, index: number) => {
                      return (
                        <Box p="1rem" key={index} bg={index % 2 == 1 ? drawerBackgroundColor : accentColor}>
                          Loading Station...
                        </Box>
                      );
                    })
                  : stationMetadata.map((station: any, index: number) => {
                      return (
                        <Box key={index} bg={index % 2 == 1 ? drawerBackgroundColor : accentColor}>
                          <AccordionItem>
                            <AccordionButton>
                              <Box
                                as="span"
                                flex="1"
                                textAlign="left"
                                ml={'15px'}
                                width="5rem"
                                whiteSpace="nowrap"
                                overflow="hidden"
                                textOverflow="ellipsis"
                              >
                                {station.NAME}
                              </Box>

                              <AccordionIcon />
                              <Tooltip
                                key={index}
                                placement="top"
                                label={
                                  props.data.state.stationNames.length < 2
                                    ? 'You must have at least one station selected'
                                    : 'Remove station from list'
                                }
                                openDelay={300}
                                aria-label="A tooltip"
                              >
                                <IconButton
                                  icon={<MdDelete />}
                                  aria-label="Delete Station"
                                  ml="1rem"
                                  colorScheme="red"
                                  size="xs"
                                  isDisabled={props.data.state.stationNames.length < 2}
                                  fontWeight="bold"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (props.data.state.stationNames.length >= 2)
                                      handleRemoveSelectedStation({
                                        lat: station.lat as number,
                                        lon: station.lon as number,
                                        name: station.STID as string,
                                        selected: true,
                                      });
                                  }}
                                >
                                  X
                                </IconButton>
                              </Tooltip>
                            </AccordionButton>

                            <AccordionPanel pb={4}>
                              <UnorderedList>
                                {Object.getOwnPropertyNames(station.OBSERVATIONS).map((name: string, index: number) => {
                                  return (
                                    <Tooltip key={index} label="Information on the attribute" openDelay={300} aria-label="A tooltip">
                                      <ListItem key={index}>{name}</ListItem>
                                    </Tooltip>
                                  );
                                })}
                              </UnorderedList>
                            </AccordionPanel>
                          </AccordionItem>
                        </Box>
                      );
                    })}
              </Accordion> */}
            </Box>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
            <Button variant="ghost">Secondary Action</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Tooltip label={'Select a time period for this visualization'} aria-label="A tooltip">
        <Select size="xs" w="10rem" placeholder={'Select time period'} value={s.widget.timePeriod} onChange={handleSelectDateChange}>
          <option value={'previous24Hours'}>24 hours</option>
          <option value={'previous1Week'}>1 week</option>
          <option value={'previous1Month'}>1 month</option>
          <option value={'previous1Year'}>1 year</option>
        </Select>
      </Tooltip>
      <Text mx="1rem">OR</Text>
      <Tooltip label={'Select a custom start date for this visualization'} aria-label="A tooltip">
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
      </Tooltip>
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

export default { AppComponent, ToolbarComponent };

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
];
