/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  Button,
  useDisclosure,
  Box,
  Text,
  Drawer,
  DrawerContent,
  DrawerBody,
  Select,
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  UnorderedList,
  ListItem,
  Input,
  Heading,
  Tooltip,
  useColorModeValue,
  IconButton,
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import LeafletWrapper from '../LeafletWrapper';
import { App } from '@sage3/applications/schema';
import { TileLayer, LayersControl, CircleMarker, SVGOverlay, Tooltip as LeafletTooltip } from 'react-leaflet';

import { useAppStore } from '@sage3/frontend';
import VariableCard from '../viewers/VariableCard';
import EChartsViewer from '../viewers/EChartsViewer';
import { getColor } from '../../EChartsViewer/ChartManager';
import CurrentConditions from '../viewers/CurrentConditions';
import StationMetadata from '../viewers/StationMetadata';
import { MdDelete } from 'react-icons/md';

type NLPRequestResponse = {
  success: boolean;
  message: string;
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

// Not used for now. TODO in future, will ask ChatGPT to generate a chart
export async function NLPHTTPRequest(message: string): Promise<NLPRequestResponse> {
  const response = await fetch('/api/nlp', {
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

// Get the dateTime 24 hours before
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

const CustomizeWidgets = React.memo((props: App) => {
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);

  // The map: any, I kown, should be Leaflet.Map but don't work
  const [map, setMap] = useState<any>();

  const { onClose } = useDisclosure();

  // Station & Echart variables
  const [xAxisVariableNames, setXAxisVariableNames] = useState<string[]>([]);
  const [yAxisVariableNames, setYAxisVariableNames] = useState<string[]>([]);
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

  // TODO used for ChatGPT
  const [prompt, setPrompt] = useState<string>('');

  // Fetches all station data given a startDate
  const fetchData = async (startDate: string) => {
    setIsLoaded(false);
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

    //Limiting variable names for the axes
    if (props.data.state.widget.visualizationType === 'line' || props.data.state.widget.visualizationType === 'bar') {
      setXAxisVariableNames(['date_time']);
      setYAxisVariableNames(filteredVariableNames);
    }
    if (props.data.state.widget.visualizationType === 'scatter') {
      setXAxisVariableNames(['elevation', 'latitude', 'longitude', 'name', 'current temperature']);
      setYAxisVariableNames(['elevation', 'latitude', 'longitude', 'name', 'current temperature']);
    }

    setVariableNames(filteredVariableNames);

    setIsLoaded(true);
  };

  useEffect(() => {
    fetchData(props.data.state.widget.startDate);
    // This will run every 10 minutes
    const interval = setInterval(() => {
      fetchData(props.data.state.widget.startDate);
      setLastUpdate(Date.now());
    }, 600000);

    return () => clearInterval(interval);
  }, [JSON.stringify(props.data.state.stationNames), JSON.stringify(props.data.state.widget.visualizationType)]);

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
    console.log(stationName);
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
    const tmpYAxisNames = value === 'allVariables' ? variableNames : [];
    updateState(props._id, { widget: { ...props.data.state.widget, visualizationType: value, yAxisNames: tmpYAxisNames } });
  };

  // Select Dropdown handler
  const handleYAxisChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;

    updateState(props._id, { widget: { ...props.data.state.widget, yAxisNames: [value] } });
  };
  // Select Dropdown handler
  const handleXAxisChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    updateState(props._id, { widget: { ...props.data.state.widget, xAxisNames: [value] } });
  };

  const handleChangeStationType = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setStationType(value);
  };

  const generateWidget = async () => {
    const isVariableCardOrCurrentConditions =
      props.data.state.widget.visualizationType === 'variableCard' || props.data.state.widget.visualizationType === 'allVariables';
    const isStationMetadata = props.data.state.widget.visualizationType === 'stationMetadata';
    if (isVariableCardOrCurrentConditions) {
      let row = 0;
      for (let i = 0; i < props.data.state.stationNames.length; i++) {
        if (i % 3 === 0) row++;
        const stationNames = props.data.state.stationNames;
        const app = await createApp({
          title: 'SensorOverview',
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
          type: 'SensorOverview',
          state: {
            sensorData: {},
            stationNames: [stationNames[i]],
            listOfStationNames: '016HI',
            location: [21.297, -157.816],
            zoom: 8,
            baseLayer: 'OpenStreetMap',
            overlay: true,
            widget: props.data.state.widget,
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
          title: 'SensorOverview',
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
          type: 'SensorOverview',
          state: {
            sensorData: {},
            stationNames: [stationNames[i]],
            listOfStationNames: '016HI',
            location: [21.297, -157.816],
            zoom: 8,
            baseLayer: 'OpenStreetMap',
            overlay: true,
            widget: props.data.state.widget,
          },
          raised: true,
          dragging: false,
        });
      }
    } else {
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
        size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'SensorOverview',
        state: {
          sensorData: {},
          stationNames: props.data.state.stationNames,
          listOfStationNames: '016HI',
          location: [21.297, -157.816],
          zoom: 8,
          baseLayer: 'OpenStreetMap',
          overlay: true,
          widget: props.data.state.widget,
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
    updateState(props._id, { widget: { ...props.data.state.widget, startDate: startDate } });
    setStartDate(startDate);
  };

  return (
    <>
      <Drawer
        blockScrollOnMount={false}
        trapFocus={false}
        placement={'bottom'}
        onClose={onClose}
        isOpen={props.data.state.isWidgetOpen}
        variant="alwaysOpen"
        onOverlayClick={() => {
          console.log('clicked');
        }}
      >
        <DrawerContent bg="transparent" borderTop={`5px solid ${accentColor}`}>
          <Box display="flex" justifyContent="center" background={drawerBackgroundColor} alignContent="center">
            <Text fontSize="4xl" fontWeight="bold" color={textColor}>
              Visualization Generator
            </Text>
            <Button
              onClick={() => {
                updateState(props._id, { isWidgetOpen: false });
              }}
              bg="red.400"
              size="sm"
              color="white"
              fontWeight="bold"
              mx="4"
              transform={'translateY(12px)'}
            >
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
                                    onClick={() => {
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
                <Box display="flex" flexDir={'column'} alignItems={'center'}>
                  <Text>Station Type:</Text>
                  <Tooltip label={'Choose from HCDP or Mesonet datasets'} aria-label="A tooltip">
                    <Select w="15rem" placeholder={'Select Station Type'} value={stationType} onChange={handleChangeStationType}>
                      <option value="hcdp">Hawaii Climate Data Portal (HCDP)</option>
                      <option value="mesonet">Mesonet</option>
                    </Select>
                  </Tooltip>
                </Box>
                <Box py="1rem" display="flex" flexDirection="row" justifyContent={'center'} alignContent="center">
                  <Box
                    transform="translate(-8px, 0px)"
                    display="flex"
                    flexDirection="column"
                    justifyContent={'center'}
                    alignContent="center"
                  >
                    <Text>Choose Date:</Text>
                    <Tooltip
                      label={
                        props.data.state.widget.visualizationType
                          ? 'Date is only available at a 24 hour interval'
                          : 'Select the date and time for the visualization'
                      }
                      aria-label="A tooltip"
                    >
                      <Input
                        w="240px"
                        mr="1rem"
                        onChange={handleDateChange}
                        value={convertToChakraDateTime(props.data.state.widget.startDate)}
                        placeholder="Select Date and Time"
                        type="datetime-local"
                        disabled={
                          props.data.state.widget.visualizationType === 'variableCard' ||
                          props.data.state.widget.visualizationType === 'allVariables'
                            ? true
                            : false
                        }
                      />
                    </Tooltip>
                  </Box>
                  <Box
                    transform="translate(-8px, 0px)"
                    display="flex"
                    flexDirection="column"
                    justifyContent={'center'}
                    alignContent="center"
                  >
                    <Text>Visualization Type: </Text>
                    <Select
                      w="15rem"
                      placeholder={'Select Visualization Type'}
                      value={props.data.state.widget.visualizationType}
                      onChange={handleVisualizationTypeChange}
                    >
                      <option value="variableCard">Current Value</option>
                      <option value="allVariables">Current Conditions</option>
                      <option value="stationMetadata">Station Details</option>
                      <option value="line">Line Chart</option>
                      <option value="bar">Bar Chart</option>
                      <option value="scatter">Scatter Chart</option>
                    </Select>
                  </Box>
                </Box>

                {props.data.state.widget.visualizationType === 'variableCard' ? (
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
                ) : null}
                {props.data.state.widget.visualizationType === 'line' ||
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
                ) : null}
                <Box p="1rem" display="flex" flexDirection="column" justifyContent={'center'} alignContent="center">
                  <Tooltip
                    placement="top"
                    label={
                      !props.data.state.widget.yAxisNames.length && props.data.state.widget.visualizationType !== 'stationMetadata'
                        ? 'You must select an attribute'
                        : 'Generate the visualization'
                    }
                    openDelay={300}
                    aria-label="A tooltip"
                  >
                    <Button
                      isDisabled={
                        !props.data.state.widget.yAxisNames.length && props.data.state.widget.visualizationType !== 'stationMetadata'
                      }
                      size="sm"
                      colorScheme={'green'}
                      onClick={generateWidget}
                    >
                      Generate
                    </Button>
                  </Tooltip>
                </Box>
                <Box p="1rem" display="flex" flexDirection="column" justifyContent={'center'} alignContent="center">
                  <Input type={'text'} onChange={handlePromptChange}></Input>
                </Box>
                <Box p="1rem" display="flex" flexDirection="column" justifyContent={'center'} alignContent="center">
                  <Button size="sm" colorScheme={'green'} onClick={sendToChatGPT}>
                    Create Chart
                  </Button>
                </Box>
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
                  {props.data.state.widget.visualizationType === 'variableCard' ? (
                    <>
                      <VariableCard
                        state={props.data.state}
                        stationNames={props.data.state.stationNames}
                        stationMetadata={stationMetadata}
                        isLoaded={isLoaded}
                        startDate={startDate}
                        timeSinceLastUpdate={timeSinceLastUpdate}
                        generateAllVariables={props.data.state.widget.visualizationType === 'allVariables'}
                      />
                    </>
                  ) : null}

                  {props.data.state.widget.visualizationType === 'line' ||
                  props.data.state.widget.visualizationType === 'bar' ||
                  props.data.state.widget.visualizationType === 'scatter' ? (
                    <EChartsViewer
                      stationNames={props.data.state.stationNames}
                      stationMetadata={stationMetadata}
                      isLoaded={isLoaded}
                      startDate={startDate}
                      widget={props.data.state.widget}
                    />
                  ) : null}
                  {props.data.state.widget.visualizationType === 'allVariables' ? (
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
                  {props.data.state.widget.visualizationType === 'stationMetadata' ? (
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

const operations = ['average', 'max', 'min', 'current'];
