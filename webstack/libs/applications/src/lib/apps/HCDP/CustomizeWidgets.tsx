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
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import LeafletWrapper from '../SensorOverview/LeafletWrapper';
import { App, AppState } from '@sage3/applications/schema';
import { TileLayer, LayersControl, Popup, CircleMarker, SVGOverlay, MapContainer } from 'react-leaflet';
import { SAGEColors, colors } from '@sage3/shared';

import { useAppStore, useHexColor } from '@sage3/frontend';
import VariableCard from './viewers/VariableCard';
import EChartsViewer from './viewers/EChartsViewer';

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

const xAxisVariableNames = ['date_time', 'elevation', 'latitude', 'longitude', 'name'];

function CustomizeWidgets(props: {
  size: { width: number; height: number; depth: number };
  widget: { visualizationType: string; yAxisNames: string[]; xAxisNames: string[]; stationNames: string[] };
  props: App;
  // handleDeleteWidget: (index: number) => void;
  // handleAddWidget: (visualizationType: string, yAxisNames: string[], xAxisNames: string[]) => void;
}) {
  const s = props.props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);

  // The map: any, I kown, should be Leaflet.Map but don't work
  const [map, setMap] = useState<any>();
  const [selectedStations, setSelectedStations] = useState<any>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [yAxisVariableNames, setYAxisVariableNames] = useState<string[]>([]);
  // const [selectedColor, setSelectedColor] = useState<SAGEColors>('blue');
  const [stationMetadata, setStationMetadata] = useState<any>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const tmpSensorMetadata: any = [];
      const tmpVariableNames: any = [];
      for (let i = 0; i < s.stationNames.length; i++) {
        const response = await fetch(
          `https://api.mesowest.net/v2/stations/timeseries?STID=${s.stationNames[i]}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
        );
        const stationData = await response.json();
        const sensorObservationVariableNames = Object.getOwnPropertyNames(stationData['STATION'][0]['OBSERVATIONS']);
        const sensorData: any = stationData['STATION'][0];
        tmpSensorMetadata.push(sensorData);
        tmpVariableNames.push(sensorObservationVariableNames);
      }

      const filteredVariableNames = findDuplicateElements(...tmpVariableNames);
      setYAxisVariableNames(filteredVariableNames);
      setStationMetadata(tmpSensorMetadata);
      setIsLoaded(true);
    };
    fetchData();
  }, [s.stationNames]);
  const handleRemoveSelectedStation = (station: { lat: number; lon: number; name: string; selected: boolean }) => {
    const tmpArray: string[] = [...s.stationNames];
    const stationName = station.name;
    setYAxisVariableNames([]);
    if (tmpArray.find((station: string) => station === stationName)) {
      tmpArray.splice(tmpArray.indexOf(stationName), 1);
      updateState(props.props._id, { stationNames: [...tmpArray] });
    }
  };

  const handleAddSelectedStation = (station: { lat: number; lon: number; name: string; selected: boolean }) => {
    setYAxisVariableNames([]);
    updateState(props.props._id, { stationNames: [...s.stationNames, station.name] });
  };
  const handleVisualizationTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setIsLoaded(false);
    updateState(props.props._id, { widget: { ...s.widget, visualizationType: value } });
  };
  const handleYAxisChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;

    updateState(props.props._id, { widget: { ...s.widget, yAxisNames: [value] } });
  };

  const handleXAxisChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    updateState(props.props._id, { widget: { ...s.widget, xAxisNames: [value] } });
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const color = event.target.value;
    updateState(props.props._id, { widget: { ...s.widget, color: color } });
  };

  const handleOperationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const operation = event.target.value;
    updateState(props.props._id, { widget: { ...s.widget, operation: operation } });
  };
  const generateWidget = async () => {
    const app = await createApp({
      title: 'SensorOverview',
      roomId: props.props.data.roomId!,
      boardId: props.props.data.boardId!,
      position: { x: props.props.data.position.x + props.props.data.size.width * 1 + 20, y: props.props.data.position.y, z: 0 },
      size: { width: 1000, height: 1000, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'SensorOverview',
      state: {
        sensorData: {},
        stationNames: s.stationNames,
        listOfStationNames: '016HI',
        location: [21.297, -157.816],
        zoom: 8,
        baseLayer: 'OpenStreetMap',
        overlay: true,
        widget: s.widget,
      },
      raised: true,
    });
  };
  return (
    <>
      <Button colorScheme={'green'} size="xs" onClick={onOpen}>
        Create Widget
      </Button>
      <Drawer
        blockScrollOnMount={false}
        trapFocus={false}
        closeOnOverlayClick={false}
        placement={'bottom'}
        onClose={onClose}
        isOpen={true}
        variant="alwaysOpen"
      >
        <DrawerContent>
          <DrawerHeader borderBottomWidth="1px">Edit Widget Menu</DrawerHeader>
          <DrawerBody>
            <HStack>
              <Box
                border={window.innerWidth < 1300 ? undefined : 'solid 7px black'}
                rounded="lg"
                height={window.innerWidth < 1300 ? '0' : '40vh'}
                width="40vw"
              >
                <LeafletWrapper map={map} setMap={setMap} {...props.props}>
                  <LayersControl.BaseLayer checked={s.baseLayer === 'OpenStreetMap'} name="OpenStreetMap">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {stationData.map((station: { lat: number; lon: number; name: string; selected: boolean }, index: number) => {
                      if (s.stationNames.includes(station.name)) {
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
                                  fill={station.selected ? '#FC03DE' : '#E1BB78'}
                                  stroke={station.selected ? '#FC03DE' : 'black'}
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
              <VStack>
                <HStack>
                  <Flex align={'center'}>
                    <Text w="7rem">Choose Date:</Text>

                    <Input w="16rem" mr="1rem" placeholder="Select Date and Time" size="md" type="datetime-local" />
                    <Text w="9rem">Visualization Type: </Text>
                    <Select w="15rem" placeholder={'Select Visualization Type'} onChange={handleVisualizationTypeChange}>
                      <option value="variableCard">Current Value</option>
                      <option value="line">Line Chart</option>
                      <option value="bar">Bar Chart</option>
                    </Select>
                  </Flex>

                  <Button size="sm" colorScheme={'green'} px="1rem" onClick={generateWidget}>
                    Generate
                  </Button>
                </HStack>
                <Divider />
                <Flex>
                  <Box pl="1rem" height="30rem" width="25rem" overflow={'auto'}>
                    <Accordion allowMultiple>
                      {stationMetadata.map((station: any, index: number) => {
                        if (isLoaded) {
                          return (
                            <Box mr="1rem" key={index}>
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
                                      return <ListItem key={index}>{name}</ListItem>;
                                    })}
                                  </UnorderedList>
                                </AccordionPanel>
                              </AccordionItem>
                            </Box>
                          );
                        } else {
                          return <Box>Loading</Box>;
                        }
                      })}
                    </Accordion>
                  </Box>
                  {s.widget.visualizationType === 'variableCard' ? (
                    <>
                      <VariableCard
                        variableName={s.widget.yAxisNames[0]}
                        state={props.props}
                        stationNames={s.stationNames}
                        stationMetadata={stationMetadata}
                        isLoaded={isLoaded}
                      />
                    </>
                  ) : (
                    <EChartsViewer
                      stationNames={s.stationNames}
                      stationMetadata={stationMetadata}
                      isLoaded={isLoaded}
                      dateStart={''}
                      dateEnd={''}
                      widget={s.widget}
                    />
                  )}
                </Flex>

                {s.widget.visualizationType === 'variableCard' ? (
                  <>
                    <Box display="flex" alignItems={'center'}>
                      <Text mx="1rem">Current Attribute: </Text>
                      <Select
                        mr="1rem"
                        w="15rem"
                        placeholder={'Select Current Value'}
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
                      <Text mr="1rem">Color: </Text>
                      <Select
                        w="15rem"
                        placeholder={'Select Color'}
                        mr="1rem"
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
                      <Text mr="1rem">Operator: </Text>
                      <Select
                        w="15rem"
                        placeholder={'Select Operation'}
                        onChange={(e) => {
                          handleOperationChange(e);
                        }}
                      >
                        {operations.map((operation: string, index: number) => {
                          return (
                            <option value={operation} key={index}>
                              {operation}
                            </option>
                          );
                        })}
                      </Select>
                    </Box>
                  </>
                ) : null}
                {s.widget.visualizationType === 'line' || s.widget.visualizationType === 'bar' ? (
                  <>
                    <Box display="flex" alignItems={'center'}>
                      <Text mx="1rem">X Axis: </Text>
                      <Select
                        w="15rem"
                        mr="1rem"
                        placeholder={'Select X Axis'}
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
                      <Text mr="1rem">Y Axis: </Text>
                      <Select
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
                  </>
                ) : null}
              </VStack>
            </HStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
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
