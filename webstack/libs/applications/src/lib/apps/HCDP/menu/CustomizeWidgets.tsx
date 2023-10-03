/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React
import React, { useEffect, useState } from 'react';
// Libraries
import { TileLayer, LayersControl, CircleMarker, SVGOverlay, Tooltip as LeafletTooltip } from 'react-leaflet';
// Chakra UI
import {
  Button, Box, Text, Drawer, DrawerContent, DrawerBody, Select, Accordion,
  AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, UnorderedList,
  ListItem, Input, Heading, Tooltip, useColorModeValue,
  IconButton,
} from '@chakra-ui/react';
import { MdDelete } from 'react-icons/md';
// SAGE3
import { apiUrls, useAppStore } from '@sage3/frontend';
import { App } from '@sage3/applications/schema';
// App
import LeafletWrapper from '../LeafletWrapper';
import VariableCard from '../viewers/VariableCard';
import FriendlyVariableCard from '../viewers/FriendlyVariableCard';
import StatisticCard from '../viewers/StatisticCard';
import EChartsViewer from '../viewers/EChartsViewer';
import CurrentConditions from '../viewers/CurrentConditions';
import StationMetadata from '../viewers/StationMetadata';

type NLPRequestResponse = {
  success: boolean;
  message: string;
};

export type WidgetType = {
  visualizationType: string;
  yAxisNames: string[];
  xAxisNames: string[];
  color: string;
  layout: { x: number; y: number; w: number; h: number };
  operation?: string;
  startDate: string;
  endDate?: string;
  sinceInMinutes?: number;
  timePeriod: string;
};

// This function is used to only display common variables between all stations
// Will return an array of variables that are common between all stations
function findDuplicateElements(...arrays: any) {
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

export const checkAvailableVisualizations = (variable: string) => {
  const availableVisualizations: { value: string; name: string }[] = [];
  switch (variable) {
    case 'Elevation, Longitude, Latitude, Name, Time':
      availableVisualizations.push({ value: 'stationMetadata', name: 'Station Metadata' });
      availableVisualizations.push({ value: 'map', name: 'Map' });
      break;
    case 'Elevation & Current Temperature':
      availableVisualizations.push({ value: 'scatter', name: 'Scatter Chart' });
      break;

    default:
      availableVisualizations.push({ value: 'variableCard', name: 'Current Value (Large variable name)' });
      availableVisualizations.push({ value: 'friendlyVariableCard', name: 'Current Value (Large station name)' });
      availableVisualizations.push({ value: 'statisticCard', name: 'Current Value (With Statistics)' });
      // availableVisualizations.push({value: 'allVariables', name: 'Current Conditions'});
      availableVisualizations.push({ value: 'line', name: 'Line Chart' });
      availableVisualizations.push({ value: 'bar', name: 'Bar Chart' });
      availableVisualizations.push({ value: 'map', name: 'Map (Current Value)' });
      // availableVisualizations.push({ value: 'scatter', name: 'Scatter Chart' });
      break;
  }
  return availableVisualizations;
};

// Not used for now. TODO in future, will ask ChatGPT to generate a chart
export async function NLPHTTPRequest(message: string): Promise<NLPRequestResponse> {
  const response = await fetch(apiUrls.misc.nlp, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });
  return (await response.json()) as NLPRequestResponse;
}

// Convert the dateTime to ECharts format
function convertToFormattedDateTime(date: Date) {
  const now = new Date(date);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
}

export function getFormattedDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
}

// Get the dateTime 24 hours before
export function getFormattedDateTime24HoursBefore() {
  const now = new Date();
  now.setHours(now.getHours() - 24);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
}

export function getFormattedDateTime1WeekBefore() {
  const now = new Date();
  now.setHours(now.getHours() - 24 * 7);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
}

export function getFormattedDateTime1MonthBefore() {
  const now = new Date();
  now.setHours(now.getHours() - 24 * 30);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
}

export function getFormattedDateTime1YearBefore() {
  const now = new Date();
  now.setHours(now.getHours() - 24 * 365);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
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

function formatDuration(ms: number) {
  if (ms < 0) ms = -ms;
  const mins = Math.floor(ms / 60000) % 60;
  if (mins > 0) {
    return `${mins} minutes ago`;
  } else {
    return `less than a minute ago`;
  }
}

const CustomizeWidgets = React.memo((props: App & { isOpen: boolean; onClose: () => void }) => {
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);

  // The map: any, I kown, should be Leaflet.Map but don't work
  const [map, setMap] = useState<any>();

  // Station & Echart variables
  const [variableNames, setVariableNames] = useState<string[]>([]);
  const [stationMetadata, setStationMetadata] = useState<any>([]);

  // Timing
  const [isLoaded, setIsLoaded] = useState(false);
  const [startDate, setStartDate] = useState<string>(getFormattedDateTime24HoursBefore());
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState<string>(formatDuration(Date.now() - lastUpdate));

  // For color theme
  const textColor = useColorModeValue('gray.800', 'gray.50');
  const drawerBackgroundColor: string = useColorModeValue('gray.50', 'gray.700');
  const headerBackgroundColor: string = useColorModeValue('white', 'gray.800');
  const accentColor: string = useColorModeValue('#DFDFDF', '#424242');
  const [stationType, setStationType] = useState('hcdp');

  const [widget, setWidget] = useState<WidgetType>({
    visualizationType: 'statisticCard',
    yAxisNames: [],
    xAxisNames: [],
    color: '#5AB2D3',
    layout: { x: 0, y: 0, w: 11, h: 130 },
    operation: 'average',
    startDate: getFormattedDateTime24HoursBefore(),
    endDate: getFormattedDateTime(),
    sinceInMinutes: 1140,
    timePeriod: 'previous24Hours',
  });

  // TODO used for ChatGPT
  const [prompt, setPrompt] = useState<string>('');
  // Fetches all station data given a startDate
  const fetchData = async (startDate: string) => {
    setIsLoaded(false);
    if (props.data.state.stationNames.length === 0) return;

    let tmpSensorMetadata: any = [];
    const tmpVariableNames: any = [];
    let response: Response | null = null;
    let stationData = null;
    // Fetch all station data
    response = await fetch(
      `https://api.mesowest.net/v2/stations/timeseries?STID=${String(
        props.data.state.stationNames
      )}&showemptystations=1&start=${startDate}&end=${convertToFormattedDateTime(
        new Date()
      )}&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
    );
    if (response) {
      stationData = await response.json();

      if (stationData) {
        for (let i = 0; i < stationData['STATION'].length; i++) {
          const sensorObservationVariableNames = Object.getOwnPropertyNames(stationData['STATION'][i]['OBSERVATIONS']);
          tmpVariableNames.push(sensorObservationVariableNames);
        }

        tmpSensorMetadata = stationData['STATION'];
      }
    }

    // StationData
    setStationMetadata(tmpSensorMetadata);

    // Variable names used to display on the Select Dropdown
    const filteredVariableNames = findDuplicateElements(...tmpVariableNames);
    filteredVariableNames.push('Elevation, Longitude, Latitude, Name, Time');
    filteredVariableNames.push('Elevation & Current Temperature');

    const tmpOptions = filteredVariableNames.map((name: string) => {
      return { label: name, value: name };
    });

    setVariableNames(filteredVariableNames);

    setIsLoaded(true);
  };

  useEffect(() => {
    fetchData(widget.startDate);
    // This will run every 10 minutes
    const interval = setInterval(() => {
      fetchData(widget.startDate);
      setLastUpdate(Date.now());
    }, 600000);

    return () => clearInterval(interval);
  }, [JSON.stringify(props.data.state.stationNames), JSON.stringify(widget.visualizationType)]);

  useEffect(() => {
    fetchData(startDate);
  }, [startDate]);

  // Update the time since last update
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

  const handleRemoveSelectedStation = (station: { lat: number; lon: number; name: string; selected: boolean }) => {
    const tmpArray: string[] = [...props.data.state.stationNames];
    const stationName = station.name;
    setVariableNames([]);
    if (tmpArray.find((station: string) => station === stationName)) {
      tmpArray.splice(tmpArray.indexOf(stationName), 1);
      updateState(props._id, { stationNames: [...tmpArray] });
    }
  };

  const handleAddSelectedStation = (station: { lat: number; lon: number; name: string; selected: boolean }) => {
    setVariableNames([]);
    updateState(props._id, { stationNames: [...props.data.state.stationNames, station.name] });
  };

  // Select Dropdown handler
  const handleVisualizationTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === 'line' || value === 'bar') {
      setWidget({ ...widget, visualizationType: value, xAxisNames: ['date_time'] });
    } else {
      setWidget({ ...widget, visualizationType: value });
    }
  };

  // Select Dropdown handler
  const handleYAxisChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === 'Elevation & Current Temperature') {
      setWidget({ ...widget, yAxisNames: ['Elevation & Current Temperature'] });
    } else {
      setWidget({ ...widget, yAxisNames: [value], xAxisNames: ['date_time'] });
    }
  };
  // Select Dropdown handler
  // const handleXAxisChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
  //   const value = event.target.value;
  //   updateState(props._id, { widget: { ...props.data.state.widget, xAxisNames: [value] } });
  // };

  // const handleChangeStationType = (event: React.ChangeEvent<HTMLSelectElement>) => {
  //   const value = event.target.value;
  //   updateState(props._id, { getDataFrom: value, stationNames: [] });
  // };

  const generateWidget = async () => {
    const visualizationType = widget.visualizationType;
    const isBarChart = visualizationType === 'bar';
    const isVariableCardOrCurrentConditions =
      visualizationType === 'variableCard' ||
      visualizationType === 'allVariables' ||
      visualizationType === 'friendlyVariableCard' ||
      visualizationType === 'statisticCard';
    const isStationMetadata = visualizationType === 'stationMetadata';
    if (isVariableCardOrCurrentConditions) {
      let row = 0;
      for (let i = 0; i < props.data.state.stationNames.length; i++) {
        if (i % 3 === 0) row++;
        const stationNames = props.data.state.stationNames;
        const app = await createApp({
          title: 'Hawaii Mesonet',
          roomId: props.data.roomId!,
          boardId: props.data.boardId!,
          //TODO get middle of the screen space
          position: {
            x: props.data.position.x + props.data.size.width * (i % 3),
            y: props.data.position.y + props.data.size.height * row,
            z: 0,
          },
          size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          type: 'Hawaii Mesonet',
          state: {
            sensorData: {},
            stationNames: [stationNames[i]],
            listOfStationNames: '016HI',
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
    } else if (isStationMetadata) {
      let row = -1;
      for (let i = 0; i < props.data.state.stationNames.length; i++) {
        if (i % 3 === 0) row++;
        const stationNames = props.data.state.stationNames;
        const app = await createApp({
          title: 'Hawaii Mesonet',
          roomId: props.data.roomId!,
          boardId: props.data.boardId!,
          //TODO get middle of the screen space
          position: {
            x: props.data.position.x + 1500 * (i % 3),
            y: props.data.position.y + (props.data.size.height + 400 * row),
            z: 0,
          },
          size: { width: 1500, height: 400, depth: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          type: 'Hawaii Mesonet',
          state: {
            sensorData: {},
            stationNames: [stationNames[i]],
            listOfStationNames: '016HI',
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
    } else if (isBarChart) {
      let row = -1;

      for (let i = 0; i < props.data.state.stationNames.length; i++) {
        if (i % 3 === 0) row++;
        const stationName = props.data.state.stationNames[i];
        const app = await createApp({
          title: 'Hawaii Mesonet',
          roomId: props.data.roomId!,
          boardId: props.data.boardId!,
          //TODO get middle of the screen space
          position: {
            x: props.data.position.x + 2000 * (i % 3),
            y: props.data.position.y + (props.data.size.height + 800 * row),
            z: 0,
          },
          size: { width: 2000, height: 800, depth: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          type: 'Hawaii Mesonet',
          state: {
            sensorData: {},
            stationNames: [stationName],
            listOfStationNames: '016HI',
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
    } else {
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
        size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'Hawaii Mesonet',
        state: {
          sensorData: {},
          stationNames: props.data.state.stationNames,
          listOfStationNames: '016HI',
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
  };

  const handlePromptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPrompt(value);
  };

  // TODO send prompt to ChatGPT
  const sendToChatGPT = async () => {
    const message = await NLPHTTPRequest(prompt);
    console.log(message);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    const date = new Date(selectedDate);

    const startDate = convertToFormattedDateTime(date);
    setWidget({ ...widget, startDate: startDate, timePeriod: 'custom' });
    setStartDate(startDate);
  };

  const handleSelectDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const timePeriod = e.target.value;
    const date = new Date();

    switch (timePeriod) {
      case 'previous24Hours':
        setStartDate(getFormattedDateTime24HoursBefore());
        setWidget({ ...widget, startDate: getFormattedDateTime24HoursBefore(), timePeriod: 'previous24Hours' });
        break;
      case 'previous1Week':
        setStartDate(getFormattedDateTime1WeekBefore());
        setWidget({ ...widget, startDate: getFormattedDateTime1WeekBefore(), timePeriod: 'previous1Week' });

        break;
      case 'previous1Month':
        setStartDate(getFormattedDateTime1MonthBefore());
        setWidget({ ...widget, startDate: getFormattedDateTime1MonthBefore(), timePeriod: 'previous1Month' });

        break;
      case 'previous1Year':
        setStartDate(getFormattedDateTime1YearBefore());
        setWidget({ ...widget, startDate: getFormattedDateTime1YearBefore(), timePeriod: 'previous1Year' });

        break;
      default:
        break;
    }
  };

  return (
    <>
      <Drawer
        blockScrollOnMount={false}
        trapFocus={false}
        placement={'bottom'}
        onClose={props.onClose}
        isOpen={props.isOpen}
        variant="alwaysOpen"
      >
        <DrawerContent bg="transparent" borderTop={`5px solid ${accentColor}`}>
          <Box display="flex" justifyContent="center" background={drawerBackgroundColor} alignContent="center">
            <Text fontSize="4xl" fontWeight="bold" color={textColor}>
              Visualization Generator
            </Text>
            <Button onClick={props.onClose} bg="red.400" size="sm" color="white" fontWeight="bold" mx="4" transform={'translateY(12px)'}>
              X
            </Button>
          </Box>
          <DrawerBody bg={drawerBackgroundColor}>
            <Box display="flex" justifyContent="center" alignContent="center" height="100%" pb={4}>
              <Box border="3px solid" borderColor={accentColor} boxShadow="lg" overflow="hidden" mx="3" rounded="lg" width="30rem">
                <Box background={headerBackgroundColor} p="1rem" borderBottom={`3px solid ${accentColor}`}>
                  <Heading color={textColor} size="md" isTruncated={true}>
                    Selected Stations
                  </Heading>
                </Box>
                <Accordion allowMultiple overflowY="scroll" height="35rem">
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
              </Box>

              {/********** Leaflet map *****************/}
              <Box border="3px solid" borderColor={accentColor} boxShadow="lg" overflow="hidden" mx="3" rounded="lg" width="40rem">
                <Box background={headerBackgroundColor} p="1rem" borderBottom={`3px solid ${accentColor}`}>
                  <Heading color={textColor} size="md">
                    Map
                  </Heading>
                </Box>

                <LeafletWrapper map={map} setMap={setMap} {...props}>
                  <LayersControl.BaseLayer checked={props.data.state.baseLayer === 'OpenStreetMap'} name="OpenStreetMap">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {stationData.map((station: { lat: number; lon: number; name: string; selected: boolean }, index: number) => {
                      if (props.data.state.stationNames.includes(station.name)) {
                        station.selected = true;
                      } else {
                        station.selected = false;
                      }
                      return (
                        <div key={index}>
                          <CircleMarker
                            key={index}
                            center={{ lat: station.lat - 0.01, lng: station.lon }}
                            fillColor={station.selected ? 'blue' : 'red'}
                            stroke={false}
                            radius={20}
                            fillOpacity={0}
                            eventHandlers={{
                              click: (e) => {
                                if (station.selected) {
                                  if (props.data.state.stationNames.length >= 2) {
                                    handleRemoveSelectedStation(station);
                                  }
                                } else {
                                  if (props.data.state.stationNames.length <= 8) {
                                    handleAddSelectedStation(station);
                                  }
                                }
                              },
                            }}
                          >
                            {props.data.state.stationNames.length >= 9 ? (
                              <LeafletTooltip>'You have reached the max number of selected stations' </LeafletTooltip>
                            ) : null}
                          </CircleMarker>

                          <SVGOverlay
                            bounds={[
                              [station.lat - 0.17, station.lon - 0.05],
                              [station.lat + 0.15, station.lon + 0.05],
                            ]}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
                              <g transform={`translate(100, 100) scale(3) translate(-100, -100)`}>
                                <circle
                                  cx="100"
                                  cy="100"
                                  r="20"
                                  fill={station.selected ? '#2e3f8f' : '#E1BB78'}
                                  stroke={'black'}
                                  strokeWidth="3"
                                />
                              </g>
                            </svg>
                          </SVGOverlay>
                        </div>
                      );
                    })}
                  </LayersControl.BaseLayer>
                </LeafletWrapper>
              </Box>
              <Box
                border="3px solid"
                borderColor={accentColor}
                boxShadow="lg"
                overflow="hidden"
                mx="3"
                rounded="lg"
                height="40rem"
                width="40rem"
              >
                <Box background={headerBackgroundColor} p="1rem" borderBottom={`3px solid ${accentColor}`}>
                  <Heading color={textColor} size="md">
                    Options
                  </Heading>
                </Box>

                {/********** Choose Dataset Type *****************/}
                <Box borderBottom={`3px solid ${accentColor}`} py="1rem" display="flex" flexDir={'row'} alignItems={'center'}>
                  <Text mx="1rem" w="10rem" textOverflow={'ellipsis'}>
                    Dataset:
                  </Text>
                  <Tooltip label={'This tool currently only supports the Mesonet dataset. '} aria-label="A tooltip">
                    <Select
                      w="15rem"
                      placeholder={'Select Station Type'}
                      value={props.data.state.getDataFrom}
                      // onChange={handleChangeStationType}
                      isDisabled={true}
                    >
                      <option value="hcdp">Hawaii Climate Data Portal (HCDP)</option>
                      <option value="mesonet">Mesonet</option>
                    </Select>
                  </Tooltip>
                </Box>

                {/********** Choose Time Period *****************/}
                <Box borderBottom={`3px solid ${accentColor}`} py="1rem" display="flex" flexDir={'row'} alignItems={'center'}>
                  <Text mx="1rem" w="10rem" textOverflow={'ellipsis'} whiteSpace={'nowrap'} overflow="hidden">
                    Choose Time Period
                  </Text>
                  <Box display="flex" flexDir="column" alignItems={'center'}>
                    <Tooltip
                      label={
                        widget.visualizationType === 'variableCard' || widget.visualizationType === 'friendlyVariableCard'
                          ? 'This visualization is not time dependent'
                          : 'Select the date and time for the visualization'
                      }
                      aria-label="A tooltip"
                    >
                      <Select
                        mr="1rem"
                        w="15rem"
                        placeholder={'Select Date Period'}
                        value={widget.timePeriod}
                        onChange={handleSelectDateChange}
                        isDisabled={
                          widget.visualizationType === 'variableCard' || widget.visualizationType === 'friendlyVariableCard' ? true : false
                        }
                      >
                        <option value={'previous24Hours'}>24 hours</option>
                        <option value={'previous1Week'}>1 week</option>
                        <option value={'previous1Month'}>1 month</option>
                        <option value={'previous1Year'}>1 year</option>
                      </Select>
                    </Tooltip>
                    <Text> OR</Text>
                    <Tooltip
                      label={
                        widget.visualizationType === 'variableCard' || widget.visualizationType === 'friendlyVariableCard'
                          ? 'This visualization is not time dependent'
                          : 'Select the date and time for the visualization'
                      }
                      aria-label="A tooltip"
                    >
                      <Input
                        w="240px"
                        mr="1rem"
                        onChange={handleDateChange}
                        value={convertToChakraDateTime(widget.startDate)}
                        placeholder="Select Date and Time"
                        type="datetime-local"
                        isDisabled={
                          widget.visualizationType === 'variableCard' || widget.visualizationType === 'friendlyVariableCard' ? true : false
                        }
                      />
                    </Tooltip>
                  </Box>
                </Box>

                {/********** Choose Variable *****************/}
                <Box borderBottom={`3px solid ${accentColor}`} py="1rem" mt="1rem" display="flex" flexDir={'row'} alignItems={'center'}>
                  <Text mx="1rem" w="10rem" textOverflow={'ellipsis'}>
                    Variable:
                  </Text>
                  <Tooltip label={'Choose the variable that you would like to visualize'} aria-label="A tooltip">
                    <Select w="15rem" placeholder={'Select Variable'} value={widget.yAxisNames[0]} onChange={handleYAxisChange}>
                      {variableNames.map((name: string, index: number) => {
                        return (
                          <option key={index} value={name}>
                            {name}
                          </option>
                        );
                      })}
                    </Select>
                  </Tooltip>
                </Box>

                {/********** Choose Visualization Type *****************/}
                <Box borderBottom={`3px solid ${accentColor}`} py="1rem" mt="1rem" display="flex" flexDir={'row'} alignItems={'center'}>
                  <Text mx="1rem" w="10rem" textOverflow={'ellipsis'} whiteSpace={'nowrap'} overflow="hidden">
                    Visualization Type:
                  </Text>

                  <Select
                    w="15rem"
                    placeholder={'Select Visualization Type'}
                    value={widget.visualizationType}
                    onChange={handleVisualizationTypeChange}
                  // isDisabled={props.data.state.widget.yAxisNames[0] === 'Elevation, Longitude, Latitude, Name, Time'}
                  >
                    {checkAvailableVisualizations(widget.yAxisNames[0]).map(
                      (visualization: { value: string; name: string }, index: number) => {
                        return (
                          <option key={index} value={visualization.value}>
                            {visualization.name}
                          </option>
                        );
                      }
                    )}
                  </Select>
                </Box>

                {/* {props.data.state.widget.visualizationType === 'variableCard' ? (
                  <Box p="1rem" display="flex" flexDirection="row" justifyContent={'center'} alignContent="center">
                    <Box display="flex" flexDirection="column" justifyContent={'center'} alignContent="center">
                      <Text>Current Attribute: </Text>
                      <Select
                        mr="1rem"
                        w="15rem"
                        value={props.data.state.widget.yAxisNames[0]}
                        placeholder={'Select Current Value'}
                        onChange={(e) => {
                          handleYAxisChange(e);
                        }}
                      >
                        {variableNames.map((name: string, index: number) => {
                          return (
                            <option key={index} value={name}>
                              {name}
                            </option>
                          );
                        })}
                      </Select>
                    </Box>
                  </Box>
                ) : null} */}
                {/* {props.data.state.widget.visualizationType === 'line' ||
                props.data.state.widget.visualizationType === 'bar' ||
                props.data.state.widget.visualizationType === 'scatter' ? (
                  <Box p="1rem" display="flex" flexDirection="row" justifyContent={'center'} alignContent="center">
                    <Box display="flex" flexDirection="column" justifyContent={'center'} alignContent="center">
                      <Text>X Axis: </Text>
                      <Select
                        mr="1rem"
                        w="15rem"
                        placeholder={'Select X Axis'}
                        value={props.data.state.widget.xAxisNames[0]}
                        onChange={(e) => {
                          handleXAxisChange(e);
                        }}
                      >
                        {xAxisVariableNames.map((name: string, index: number) => {
                          return (
                            <option key={index} value={name}>
                              {name}
                            </option>
                          );
                        })}
                      </Select>
                    </Box>
                    <Box display="flex" flexDirection="column" justifyContent={'center'} alignContent="center">
                      <Text>Y Axis: </Text>
                      <Select
                        mr="1rem"
                        w="15rem"
                        placeholder={'Select Y Axis'}
                        onChange={(e) => {
                          handleYAxisChange(e);
                        }}
                      >
                        {yAxisVariableNames.map((name: string, index: number) => {
                          return (
                            <option key={index} value={name}>
                              {name}
                            </option>
                          );
                        })}
                      </Select>
                    </Box>
                  </Box>
                ) : null} */}
                <Box mt="2rem" display="flex" flexDir={'row'} alignItems={'center'}>
                  <Text w="15rem"></Text>
                  <Tooltip
                    placement="top"
                    label={
                      !widget.yAxisNames.length && widget.visualizationType !== 'stationMetadata'
                        ? 'You must select an attribute'
                        : 'Generate the visualization'
                    }
                    openDelay={300}
                    aria-label="A tooltip"
                  >
                    <Button
                      isDisabled={!widget.yAxisNames.length && widget.visualizationType !== 'stationMetadata'}
                      size="sm"
                      colorScheme={'green'}
                      onClick={generateWidget}
                      width={'8rem'}
                    >
                      Generate
                    </Button>
                  </Tooltip>
                </Box>
                {/* <Box p="1rem" display="flex" flexDirection="column" justifyContent={'center'} alignContent="center">
                  <Input type={'text'} onChange={handlePromptChange}></Input>
                </Box>
                <Box p="1rem" display="flex" flexDirection="column" justifyContent={'center'} alignContent="center">
                  <Button size="sm" colorScheme={'green'} onClick={sendToChatGPT}>
                    Create Chart
                  </Button>
                </Box> */}
              </Box>
              <Box
                border="3px solid"
                borderColor={accentColor}
                boxShadow="lg"
                overflow="hidden"
                mx="3"
                rounded="lg"
                height="40rem"
                width="70rem"
                display="flex"
                flexDirection={'column'}
                alignContent={'center'}
              >
                <Box background={headerBackgroundColor} p="1rem" borderBottom={`3px solid ${accentColor}`}>
                  <Heading color={textColor} size="md">
                    Preview
                  </Heading>
                </Box>
                <Box color={textColor} height="100%" width="100%" justifyContent={'center'}>
                  {widget.visualizationType === 'variableCard' ? (
                    <>
                      <VariableCard
                        state={props.data.state}
                        stationNames={props.data.state.stationNames}
                        stationMetadata={stationMetadata}
                        isLoaded={isLoaded}
                        startDate={startDate}
                        timeSinceLastUpdate={timeSinceLastUpdate}
                        generateAllVariables={false}
                        isCustomizeWidgetMenu={true}
                      />
                    </>
                  ) : null}
                  {widget.visualizationType === 'friendlyVariableCard' ? (
                    <>
                      <FriendlyVariableCard
                        state={props.data.state}
                        stationNames={props.data.state.stationNames}
                        stationMetadata={stationMetadata}
                        isLoaded={isLoaded}
                        startDate={startDate}
                        timeSinceLastUpdate={timeSinceLastUpdate}
                        generateAllVariables={false}
                        isCustomizeWidgetMenu={true}
                      />
                    </>
                  ) : null}

                  {widget.visualizationType === 'statisticCard' ? (
                    <>
                      <StatisticCard
                        state={props.data.state}
                        widget={widget}
                        stationNames={props.data.state.stationNames}
                        stationMetadata={stationMetadata}
                        isLoaded={isLoaded}
                        startDate={startDate}
                        timeSinceLastUpdate={timeSinceLastUpdate}
                        generateAllVariables={false}
                        isCustomizeWidgetMenu={true}
                      />
                    </>
                  ) : null}

                  {widget.visualizationType === 'line' || widget.visualizationType === 'bar' || widget.visualizationType === 'scatter' ? (
                    <EChartsViewer
                      stationNames={props.data.state.stationNames}
                      stationMetadata={stationMetadata}
                      isLoaded={isLoaded}
                      startDate={startDate}
                      widget={widget}
                    // size={{ width: 700, height: 400,}}
                    />
                  ) : null}
                  {widget.visualizationType === 'allVariables' ? (
                    <>
                      <CurrentConditions
                        state={props.data.state}
                        stationNames={props.data.state.stationNames}
                        startDate={startDate}
                        stationMetadata={stationMetadata}
                        timeSinceLastUpdate={timeSinceLastUpdate}
                        isLoaded={true}
                      />
                    </>
                  ) : null}
                  {widget.visualizationType === 'stationMetadata' ? (
                    <>
                      <StationMetadata
                        state={props.data.state}
                        stationNames={props.data.state.stationNames}
                        stationMetadata={stationMetadata}
                        isLoaded={isLoaded}
                      />
                    </>
                  ) : null}
                </Box>
              </Box>
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
});

export default CustomizeWidgets;

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
