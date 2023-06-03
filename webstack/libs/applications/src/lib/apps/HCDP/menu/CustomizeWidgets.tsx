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
  DrawerHeader,
  DrawerBody,
  HStack,
  Select,
  VStack,
  Flex,
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  UnorderedList,
  ListItem,
  Input,
  Divider,
  Heading,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import LeafletWrapper from '../LeafletWrapper';
import { App, AppState } from '@sage3/applications/schema';
import { TileLayer, LayersControl, Popup, CircleMarker, SVGOverlay, MapContainer } from 'react-leaflet';
import { SAGEColors, colors } from '@sage3/shared';

import { useAppStore, useHexColor } from '@sage3/frontend';
import VariableCard from '../viewers/VariableCard';
import EChartsViewer from '../viewers/EChartsViewer';

type NLPRequestResponse = {
  success: boolean;
  message: string;
};

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

function convertToFormattedDateTime(date: Date) {
  const now = new Date(date);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
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
    return `Refreshed ${mins} minutes ago`;
  } else {
    return `Refreshed less than a minute ago`;
  }
}

const CustomizeWidgets = React.memo((props: App) => {
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);

  // The map: any, I kown, should be Leaflet.Map but don't work
  const [map, setMap] = useState<any>();
  const [selectedStations, setSelectedStations] = useState<any>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [axisVariableNames, setAxisVariableNames] = useState<string[]>([]);
  // const [selectedColor, setSelectedColor] = useState<SAGEColors>('blue');
  const [stationMetadata, setStationMetadata] = useState<any>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const textColor = useColorModeValue('gray.700', 'gray.100');

  const [prompt, setPrompt] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(getFormattedDateTime24HoursBefore());

  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState<string>(formatDuration(Date.now() - lastUpdate));

  const fetchData = async (dateToUse: string) => {
    setIsLoaded(false);
    let tmpSensorMetadata: any = [];
    const tmpVariableNames: any = [];
    let response: Response | null = null;
    let stationData = null;

    response = await fetch(
      `https://api.mesowest.net/v2/stations/timeseries?STID=${String(
        props.data.state.stationNames
      )}&showemptystations=1&start=${dateToUse}&end=${convertToFormattedDateTime(
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
    const filteredVariableNames = findDuplicateElements(...tmpVariableNames);
    filteredVariableNames.push('elevation', 'latitude', 'longitude', 'name', 'current temperature');
    setIsLoaded(true);
    setAxisVariableNames(filteredVariableNames);
    setStationMetadata(tmpSensorMetadata);
  };

  useEffect(() => {
    fetchData(props.data.state.widget.startDate);
    // This will run every 10 minutes
    const interval = setInterval(() => {
      fetchData(props.data.state.widget.startDate);
      setLastUpdate(Date.now());
    }, 600000);

    return () => clearInterval(interval);
  }, [JSON.stringify(props.data.state.stationNames)]);

  useEffect(() => {
    fetchData(startDate);
  }, [startDate]);

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
    setAxisVariableNames([]);
    if (tmpArray.find((station: string) => station === stationName)) {
      tmpArray.splice(tmpArray.indexOf(stationName), 1);
      updateState(props._id, { stationNames: [...tmpArray] });
    }
  };

  const handleAddSelectedStation = (station: { lat: number; lon: number; name: string; selected: boolean }) => {
    setAxisVariableNames([]);
    updateState(props._id, { stationNames: [...props.data.state.stationNames, station.name] });
  };
  const handleVisualizationTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    updateState(props._id, { widget: { ...props.data.state.widget, visualizationType: value } });
  };
  const handleYAxisChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;

    updateState(props._id, { widget: { ...props.data.state.widget, yAxisNames: [value] } });
  };

  const handleXAxisChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    updateState(props._id, { widget: { ...props.data.state.widget, xAxisNames: [value] } });
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const color = event.target.value;
    updateState(props._id, { widget: { ...props.data.state.widget, color: color } });
  };

  const generateWidget = async () => {
    const app = await createApp({
      title: 'SensorOverview',
      roomId: props.data.roomId!,
      boardId: props.data.boardId!,
      //TODO get middle of the screen space
      position: { x: props.data.position.x + 1000, y: props.data.position.y, z: 0 },
      size: { width: 2000, height: 500, depth: 0 },
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
    });
  };

  const handlePromptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPrompt(value);
  };

  const sendToChatGPT = async () => {
    // const message = await NLPHTTPRequest(prompt);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    console.log(selectedDate);
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
        // closeOnOverlayClick={false}
        placement={'bottom'}
        onClose={onClose}
        isOpen={props.data.state.isWidgetOpen}
        variant="alwaysOpen"
        onOverlayClick={() => {
          console.log('clicked');
        }}
      >
        <DrawerContent bg="transparent">
          <Box display="flex" justifyContent="center">
            <Box width="400px" background="#393E46" display="flex" justifyContent={'center'} borderRadius="20px 20px 0 0"></Box>
          </Box>
          <Box display="flex" justifyContent="center" background="#393E46" alignContent="center">
            <Text fontSize="4xl" fontWeight="bold">
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
          {/* <DrawerHeader bg="#393E46" textAlign={'center'} borderBottomWidth="1px">
              Visualization Generator
            </DrawerHeader> */}
          <DrawerBody bg="#393E46">
            <Box display="flex" justifyContent="center" alignContent="center" height="100%" pb={4}>
              <Box border="3px solid" borderColor="gray.700" boxShadow="lg" overflow="hidden" mx="3" rounded="lg" width="30rem">
                <Box bg="gray.800" p="1rem" borderBottom={'1px solid black'}>
                  <Heading size="md" isTruncated={true}>
                    Selected Stations
                  </Heading>
                </Box>
                <Accordion allowMultiple overflowY="scroll" height="35rem">
                  {!isLoaded
                    ? props.data.state.stationNames.map((stationName: string, index: number) => {
                        return (
                          <Box p="1rem" key={index}>
                            Loading Station...
                          </Box>
                        );
                      })
                    : stationMetadata.map((station: any, index: number) => {
                        return (
                          <Box key={index}>
                            <AccordionItem>
                              <h2>
                                <AccordionButton>
                                  <Box as="span" flex="1" textAlign="left">
                                    {station.NAME}
                                  </Box>
                                  <AccordionIcon />
                                </AccordionButton>
                              </h2>
                              <AccordionPanel pb={4}>
                                <UnorderedList>
                                  {Object.getOwnPropertyNames(station.OBSERVATIONS).map((name: string, index: number) => {
                                    return (
                                      <Tooltip key={index} label="Information on the attribute" aria-label="A tooltip">
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
              <Box border="3px solid" borderColor="gray.700" boxShadow="lg" overflow="hidden" mx="3" rounded="lg" width="40rem">
                <Box bg="gray.800" p="1rem" borderBottom={'1px solid black'}>
                  <Heading size="md">Map</Heading>
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
                                  handleRemoveSelectedStation(station);
                                } else {
                                  handleAddSelectedStation(station);
                                }
                              },
                            }}
                          ></CircleMarker>
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
                borderColor="gray.700"
                boxShadow="lg"
                overflow="hidden"
                mx="3"
                rounded="lg"
                height="40rem"
                width="40rem"
              >
                <Box bg="gray.800" p="1rem" borderBottom={'1px solid black'}>
                  <Heading size="md">Options</Heading>
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
                        disabled={props.data.state.widget.visualizationType === 'variableCard' ? true : false}
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
                        {axisVariableNames.map((name: string, index: number) => {
                          return (
                            <option key={index} value={name}>
                              {name}
                            </option>
                          );
                        })}
                      </Select>
                    </Box>
                    <Box display="flex" flexDirection="column" justifyContent={'center'} alignContent="center">
                      <Text>Color: </Text>
                      <Select
                        w="15rem"
                        placeholder={'Select Color'}
                        mr="1rem"
                        value={props.data.state.widget.color}
                        onChange={(e) => {
                          handleColorChange(e);
                        }}
                      >
                        {colors.map((color: SAGEColors, index: number) => {
                          const c = useHexColor(color);
                          return (
                            <>
                              <option key={c} value={c}>
                                {color.charAt(0).toUpperCase() + color.slice(1)}
                              </option>
                            </>
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
                        {axisVariableNames.map((name: string, index: number) => {
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
                        {axisVariableNames.map((name: string, index: number) => {
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
                  <Button size="sm" colorScheme={'green'} onClick={generateWidget}>
                    Generate
                  </Button>
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
                borderColor="gray.700"
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
                <Box bg="gray.800" p="1rem">
                  <Heading size="md">Preview</Heading>
                </Box>
                <Box color={textColor} height="100%" width="100%" justifyContent={'center'}>
                  {props.data.state.widget.visualizationType === 'variableCard' ? (
                    <>
                      <VariableCard
                        variableName={props.data.state.widget.yAxisNames[0]}
                        state={props.data.state}
                        stationNames={props.data.state.stationNames}
                        stationMetadata={stationMetadata}
                        isLoaded={isLoaded}
                        startDate={startDate}
                        timeSinceLastUpdate={timeSinceLastUpdate}
                      />
                    </>
                  ) : (
                    <EChartsViewer
                      stationNames={props.data.state.stationNames}
                      stationMetadata={stationMetadata}
                      isLoaded={isLoaded}
                      startDate={startDate}
                      widget={props.data.state.widget}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
});

function arePropsEqual(
  prevProps: {
    size: {
      width: number;
      height: number;
      depth: number;
    };
    widget: {
      visualizationType: string;
      yAxisNames: string[];
      xAxisNames: string[];
      stationNames: string[];
    };
    assetid: string;
    overlay: boolean;
    isWidgetOpen: boolean;
    location: number[];
    baseLayer: any;
    zoom: number;
    stationNames: string[];
    _id: string;
    roomId: string;
    boardId: string;
  },
  nextProps: {
    size: {
      width: number;
      height: number;
      depth: number;
    };
    widget: {
      visualizationType: string;
      yAxisNames: string[];
      xAxisNames: string[];
      stationNames: string[];
    };
    assetid: string;
    overlay: boolean;
    isWidgetOpen: boolean;
    location: number[];
    baseLayer: any;
    zoom: number;
    stationNames: string[];
    _id: string;
    roomId: string;
    boardId: string;
  }
) {
  // Compare all properties to determine equality
  return (
    prevProps.size.width === nextProps.size.width &&
    prevProps.size.height === nextProps.size.height &&
    prevProps.size.depth === nextProps.size.depth &&
    prevProps.widget.visualizationType === nextProps.widget.visualizationType &&
    prevProps.widget.yAxisNames === nextProps.widget.yAxisNames &&
    prevProps.widget.xAxisNames === nextProps.widget.xAxisNames &&
    prevProps.widget.stationNames === nextProps.widget.stationNames &&
    prevProps.isWidgetOpen === nextProps.isWidgetOpen
  );
}

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
