/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ChangeEvent, useEffect, useRef, useState } from 'react';
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
  Switch,
} from '@chakra-ui/react';

import { MdArrowDropDown, MdArrowDropUp, MdDoubleArrow, MdSensors } from 'react-icons/md';
import { RangeDatepicker } from 'chakra-dayzed-datepicker';

// Sage Imports
import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

// Visualization imports
import VariableCard from './viewers/VariableCard';
import EChartsViewer from './viewers/EChartsViewer';
import CurrentConditions from './viewers/CurrentConditions';
import {
  getFormattedDateTime1MonthBefore,
  getFormattedDateTime1WeekBefore,
  getFormattedDateTime1YearBefore,
  getFormattedDateTime24HoursBefore,
} from './utils';
import StationMetadata from './viewers/StationMetadata';
import FriendlyVariableCard from './viewers/FriendlyVariableCard';
import StatisticCard from './viewers/StatisticCard';
import MapViewer from './viewers/MapViewer';
import { checkAvailableVisualizations } from './utils';
import MapGL from './MapGL';

// Styling
import './styling.css';

export type StationDataType = { lat: number; lng: number; name: string; selected: boolean; station_id: string };

const convertToStringFormat = (date: string) => {
  const year = date.substring(0, 4);
  const month = date.substring(4, 6);
  const day = date.substring(6, 8);
  switch (month) {
    case '01':
      return `Jan ${day}, ${year}`;
    case '02':
      return `Feb ${day}, ${year}`;
    case '03':
      return `Mar ${day}, ${year}`;
    case '04':
      return `Apr ${day}, ${year}`;
    case '05':
      return `May ${day}, ${year}`;
    case '06':
      return `Jun ${day}, ${year}`;
    case '07':
      return `Jul ${day}, ${year}`;
    case '08':
      return `Aug ${day}, ${year}`;
    case '09':
      return `Sep ${day}, ${year}`;
    case '10':
      return `Oct ${day}, ${year}`;
    case '11':
      return `Nov ${day}, ${year}`;
    case '12':
      return `Dec ${day}, ${year}`;
    default:
      return `${month}/${day}/${year}`;
  }
};

const resolveTimePeriod = (timePeriod: string) => {
  switch (timePeriod) {
    case '24 hours':
      return 1440;
    case '1 week':
      return 10080;
    case '1 month':
      return 43200;
    default:
      return 'Custom date range';
  }
};

function formatDuration(ms: number) {
  if (ms < 0) ms = -ms;
  const mins = Math.floor(ms / 60000) % 60;
  if (mins > 0) {
    return `${mins} minutes ago`;
  } else {
    return `less than a minute ago`;
  }
}

const convertFormattedTimeToDateTime = (formattedTime: string) => {
  return new Date(formattedTime);
};

/* App component for Sensor Overview */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);

  // Color Variables
  const bgColor = useColorModeValue('gray.100', 'gray.900');
  const textColor = useColorModeValue('gray.700', 'gray.100');

  // Time Variables
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState<string>(formatDuration(Date.now() - lastUpdate));
  const createApp = useAppStore((state) => state.create);
  const [stationData, setStationData] = useState<StationDataType[]>([]);
  const [stationMetadata, setStationMetadata] = useState({});

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
    const interval = setInterval(
      () => {
        if (s.widget.liveData) {
          fetchStationData();
          setLastUpdate(Date.now());
        }
      },

      60 * 1000
      //10 minutes
    );

    fetchStationData();
    return () => clearInterval(interval);
  }, [JSON.stringify(s.stationNames), JSON.stringify(s.widget)]);

  const fetchStationData = async () => {
    try {
      const token = '71c5efcd8cfe303f2795e51f01d19c6';

      // First fetch station data
      const stationResponse = await fetch(`https://api.hcdp.ikewai.org/mesonet/db/stations?station_ids=${s.stationNames.join(',')}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!stationResponse.ok) {
        throw new Error(`Station API error: ${stationResponse.status}`);
      }

      const data: StationDataType[] = await stationResponse.json();
      // Get center Lat and Lon of stations
      const centerLat = data.reduce((acc, station) => acc + station.lat, 0) / data.length;
      const centerLon = data.reduce((acc, station) => acc + station.lng, 0) / data.length;
      setStationData(data);
      updateState(props._id, { location: [centerLon, centerLat] });
      // Then fetch measurements for each station
      const stationByMeasurements: any = {};
      for (const station of data) {
        try {
          // Build query URL with start date
          const queryParams = new URLSearchParams({
            station_ids: station.station_id,
            var_ids: s.widget.yAxisNames.join(','),
            row_mode: 'json',
            limit: '100',
          });
          const url = s.url !== '' ? s.url : `https://api.hcdp.ikewai.org/mesonet/db/measurements?${queryParams}`;
          const measurements = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (!measurements.ok) {
            console.warn(`Measurement API error for station ${station.station_id}: ${measurements.status}`);
            stationByMeasurements[station.station_id] = [];
            continue;
          }

          const measurementData = await measurements.json();
          console.log(measurementData, s.widget.yAxisNames);
          stationByMeasurements[station.station_id] = measurementData;
        } catch (err) {
          console.warn(`Failed to fetch measurements for station ${station.station_id}:`, err);
          stationByMeasurements[station.station_id] = [];
        }
      }

      // Final state update
      setStationMetadata(stationByMeasurements);
      setIsLoaded(true);
      setLastUpdate(Date.now());
    } catch (err) {
      console.error('Failed to fetch station data:', err);
      setIsLoaded(true); // Set loaded even on error to prevent infinite loading state
      // Optionally show error to user
    }
  };

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
    await createApp({
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
      pinned: false,
    });
  };
  const duplicateMenuBackground = useColorModeValue('gray.50', 'gray.800');
  const duplicateMenuItems = useColorModeValue('gray.100', 'gray.700');
  const duplicateHoverMenuItem = useColorModeValue('rgb(178, 216, 243)', 'cyan.600');
  return (
    <AppWindow app={props} lockAspectRatio={handleLockAspectRatio()} hideBackgroundIcon={MdSensors}>
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
                borderRadius="lg"
                p={4}
                zIndex={1}
                border={'solid 1px grey'}
                borderLeft={'solid #60CDBA 3px'}
                bg={duplicateMenuBackground}
                transform={`scale(0.9) translateY(-${buttonPosition.top / 4}px)`}
                transformOrigin={'top left'}
                shadow={'xl'}
              >
                {/* Content of the opened div */}
                <Text fontWeight={'bold'}>Duplicate as:</Text>
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
                        backgroundColor={duplicateMenuItems}
                        border={'grey solid 2px'}
                        _hover={{ backgroundColor: duplicateHoverMenuItem }}
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

        {stationMetadata ? (
          <Box bgColor={bgColor} color={textColor} fontSize="lg">
            <HStack>
              <Box>
                {props.data.state.widget.visualizationType === 'Line Chart' ||
                props.data.state.widget.visualizationType === 'Pie Chart' ||
                props.data.state.widget.visualizationType === 'Boxplot' ||
                props.data.state.widget.visualizationType === 'Scatter Chart' ? (
                  <EChartsViewer
                    stationNames={s.stationNames}
                    isLoaded={true}
                    startDate={props.data.state.widget.startDate}
                    timeSinceLastUpdate={timeSinceLastUpdate}
                    widget={s.widget}
                    size={{ width: props.data.size.width - 30, height: props.data.size.height - 35, depth: 0 }}
                    stationMetadata={stationMetadata}
                  />
                ) : null}
                {props.data.state.widget.visualizationType === 'map' ? (
                  <>
                    <Box id={'container' + props._id} width={props.data.size.width - 30} height={props.data.size.height - 78}>
                      <MapViewer
                        {...props}
                        isSelectingStations={false}
                        isLoaded={isLoaded}
                        stationData={stationData}
                        stationMetadata={stationMetadata}
                      />
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
            <Spinner thickness="5px" speed="1s" emptyColor="gray.200" />
          </Box>
        )}
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app Sensor Overview */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);
  const [selectedDates, setSelectedDates] = useState<Date[]>([
    convertFormattedTimeToDateTime(s.widget.startDate),
    convertFormattedTimeToDateTime(s.widget.endDate),
  ]);

  const [stationMetadata, setStationMetadata] = useState([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(true);
  const [isSortedOn, setIsSortedOn] = useState<{ name: string; direction: string }>({ name: 'NAME', direction: 'ascending' });

  // For color theme
  const textColor = useColorModeValue('gray.800', 'gray.50');
  const headerBackgroundColor: string = useColorModeValue('white', 'gray.800');
  const accentColor: string = useColorModeValue('#DFDFDF', '#424242');

  const stationNameRef = useRef<any>(s.stationNames);
  const toolbarStationData = useRef<any>(stationData);

  // useEffect(() => {
  //   if (selectedDates.length === 2) {
  //     if (selectedDates[0] instanceof Date && selectedDates[1] instanceof Date) {
  //       const startDate = selectedDates[0].toISOString();
  //       const endDate = selectedDates[1].toISOString();
  //       updateState(props._id, { widget: { ...s.widget, startDate: startDate, endDate: endDate } });
  //     }
  //   }
  // }, [selectedDates]);

  useEffect(() => {
    const fetchAvailableVariables = async () => {
      try {
        const token = '71c5efcd8cfe303f2795e51f01d19c6';
        const allVariables = new Set<string>();

        // Fetch variables for each station
        for (const stationId of s.stationNames) {
          const response = await fetch(
            `https://api.hcdp.ikewai.org/mesonet/db/measurements?station_ids=${stationId}&limit=100&row_mode=json&join_metadata=true`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              // Extract variable names and add to set
              const variables = data.map((item: any) => item.variable);
              variables.forEach((v: string) => allVariables.add(v));
            }
          }
        }

        // Update state with unique variables
        updateState(props._id, { availableVariableNames: Array.from(allVariables) });
      } catch (err) {
        console.error('Failed to fetch available variables:', err);
      }
    };

    fetchAvailableVariables();
  }, [s.stationNames]);

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

  const handleSelectDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const timePeriod = e.target.value;
    switch (timePeriod) {
      case '24 hours':
        updateState(props._id, { widget: { ...s.widget, startDate: getFormattedDateTime24HoursBefore(), timePeriod: '24 hours' } });
        break;
      case '1 week':
        updateState(props._id, { widget: { ...s.widget, startDate: getFormattedDateTime1WeekBefore(), timePeriod: '1 week' } });

        break;
      case '1 month':
        updateState(props._id, { widget: { ...s.widget, startDate: getFormattedDateTime1MonthBefore(), timePeriod: '1 month' } });

        break;
      default:
        break;
    }
  };
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleFilterOn = (attributeName: string) => {
    const isFirstTime = isSortedOn.name !== attributeName || isSortedOn.direction === 'ascending';
    const isSecondTime = isSortedOn.name === attributeName && isSortedOn.direction === 'descending';
    if (isFirstTime) {
      const tmpStationMetadata = toolbarStationData.current.sort((a: any, b: any) => {
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
      toolbarStationData.current = tmpStationMetadata;
      setIsSortedOn({ name: attributeName, direction: 'descending' });
    } else if (isSecondTime) {
      const tmpStationMetadata = toolbarStationData.current.sort((a: any, b: any) => {
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
      toolbarStationData.current = tmpStationMetadata;
      setIsSortedOn({ name: attributeName, direction: 'ascending' });
    }
  };

  const tableRows = [
    { propName: 'selected', name: 'Selected' },
    { propName: 'ID', name: 'ID' },
    { propName: 'name', name: 'Station Name' },
    { propName: 'county', name: 'County Name' },
    { propName: 'elevation', name: 'Elevation' },
    { propName: 'lat', name: 'Latitude' },
    { propName: 'lon', name: 'Longitude' },
  ];
  const handleChangeSelectedStation = (e: React.ChangeEvent<HTMLInputElement>, stationSTID: string) => {
    let updatedStations;

    if (e.target.checked) {
      updatedStations = [...s.stationNames, stationSTID]; // Create a new array with the added station
    } else {
      updatedStations = s.stationNames.filter((name) => name !== stationSTID); // Create a new array without the removed station
    }

    // Update the state and the ref
    updateState(props._id, { stationNames: updatedStations });
    stationNameRef.current = updatedStations;
  };

  const handleChangeLiveData = (val: ChangeEvent<HTMLInputElement>) => {
    const checked = val.target.checked;
    if (checked) {
      updateState(props._id, { widget: { ...s.widget, liveData: checked, timePeriod: '24 hours' } });
    } else {
      const customDateRange = convertToStringFormat(s.widget.startDate) + ' - ' + convertToStringFormat(s.widget.endDate);
      updateState(props._id, { widget: { ...s.widget, liveData: checked, timePeriod: customDateRange } });
    }
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
                      case 'selected':
                        widthSize = '9%';
                        break;
                      case 'ID':
                        widthSize = '9%';
                        break;
                      case 'name':
                        widthSize = '18%';
                        break;
                      case 'county':
                        widthSize = '20%';
                        break;
                      case 'elevation':
                        widthSize = '10%';
                        break;
                      case 'lat':
                        widthSize = '10%';
                        break;
                      case 'lon':
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
                  {toolbarStationData.current.map((station: any, index: number) => {
                    const isSelected = s.stationNames.includes(station.id);
                    return (
                      <tr key={index}>
                        <td style={{ textAlign: 'center', width: '10px' }}>
                          <Checkbox
                            colorScheme="teal"
                            isChecked={isSelected}
                            onChange={(e) => handleChangeSelectedStation(e, station.id)}
                          />
                        </td>
                        <td>{station.id}</td>
                        <td>{station.name}</td>
                        <td>{station.county}</td>
                        <td style={{ textAlign: 'right' }}>{station.elevation}</td>
                        <td style={{ textAlign: 'right' }}>{Number(station.lat).toFixed(1)}</td>
                        <td style={{ textAlign: 'right' }}>{Number(station.lon).toFixed(1)}</td>
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
      <Text fontSize={'sm'} mx="1rem">
        Live Data
      </Text>
      <Switch colorScheme={'green'} isChecked={s.widget.liveData} onChange={handleChangeLiveData} />
      {s.widget.liveData ? (
        <Tooltip label={'Select a time period for this visualization'} aria-label="A tooltip">
          <Select
            mx="1rem"
            size="xs"
            w="10rem"
            placeholder={'Select time period'}
            value={s.widget.timePeriod}
            onChange={handleSelectDateChange}
          >
            <option value={'24 hours'}>24 hours</option>
            <option value={'1 week'}>1 week</option>
            <option value={'1 month'}>1 month</option>
          </Select>
        </Tooltip>
      ) : (
        <RangeDatepicker
          propsConfigs={{ inputProps: { size: 'xs', width: '10rem', ml: '1rem' } }}
          selectedDates={selectedDates}
          onDateChange={setSelectedDates}
        />
      )}

      {/* <Text mx="1rem">OR</Text> */}
      {/* <Tooltip label={'Select a custom start date for this visualization'} aria-label="A tooltip">
        <Input
          w="10rem"

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
      <Divider border={'1px'} size={'2xl'} orientation="vertical" mx="1rem" />
      <Tooltip label={'Select a variable that you would like to visualize'} aria-label="A tooltip">
        <Select size="xs" w="10rem" placeholder={'Select Variable'} value={s.widget.yAxisNames[0]} onChange={handleChangeVariable}>
          {s.availableVariableNames.map((name: string, index: number) => {
            return (
              <option key={index} value={name}>
                {name}
              </option>
            );
          })}
        </Select>
      </Tooltip>
      <Divider border={'1px'} size={'2xl'} orientation="vertical" mx="1rem" />
      <Tooltip label={'Select a visualization that you would like to see'} aria-label="A tooltip">
        <Select
          size="xs"
          w="10rem"
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
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: App[] }) => {
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
    props.apps.forEach((app: App) => {
      updateState(app._id, { widget: { ...app.data.state.widget, visualizationType: value } });
    });
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

// This function is used to only display common variables between all stations
// Will return an array of variables that are common between all stations
function findDuplicateElementsInArrayObjects(...arrays: any) {
  const elementCount: any = [];
  const duplicates = [];
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

  for (let i = 0; i < elementCount.length; i++) {
    if (elementCount[i].count === arrays.length) {
      duplicates.push(elementCount[i].element);
    }
  }
  return duplicates;
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

export const stationData: { id: string; name: string; lat: number; lon: number; county: string; elevation: number; selected: boolean }[] = [
  {
    id: '001HI',
    name: 'Kula Ag',
    elevation: 3163.0,
    lat: 20.7579,
    lon: -156.32,
    county: 'Maui',
    selected: false,
  },
  {
    id: '002HI',
    name: 'Park HQ',
    elevation: 6936.0,
    lat: 20.7598,
    lon: -156.2482,
    county: 'Maui',
    selected: false,
  },
  {
    id: '003HI',
    name: 'Summit',
    elevation: 9800.0,
    lat: 20.7104,
    lon: -156.2567,
    county: 'Maui',
    selected: false,
  },
  {
    id: '004HI',
    name: 'Nahuku',
    elevation: 3944.0,
    lat: 19.4152,
    lon: -155.2384,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '005HI',
    name: 'IPIF',
    elevation: 367.0,
    lat: 19.6974,
    lon: -155.0954,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '006HI',
    name: 'Spencer',
    elevation: 1539.0,
    lat: 19.964,
    lon: -155.25,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '007HI',
    name: 'Laupahoehoe',
    elevation: 3776.0,
    lat: 19.932,
    lon: -155.291,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '008HI',
    name: 'Palamamnui',
    elevation: 869.0,
    lat: 19.748,
    lon: -155.996,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '009HI',
    name: 'Mamalahoa',
    elevation: 1978.0,
    lat: 19.803,
    lon: -155.851,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '010HI',
    name: 'PuuWaawaa',
    elevation: 5427.0,
    lat: 19.7254,
    lon: -155.8738,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '011HI',
    name: 'Lyon',
    elevation: 495.0,
    lat: 21.333,
    lon: -157.8025,
    county: 'Honolulu',
    selected: false,
  },
  {
    id: '012HI',
    name: 'Nuuanu Res 1',
    elevation: 384.0,
    lat: 21.3391,
    lon: -157.8369,
    county: 'Honolulu',
    selected: false,
  },
  {
    id: '013HI',
    name: 'Nene Nest',
    elevation: 8497.0,
    lat: 20.7382,
    lon: -156.2458,
    county: 'Maui',
    selected: false,
  },
  {
    id: '014HI',
    name: 'Waipa',
    elevation: 16.0,
    lat: 22.2026,
    lon: -159.5188,
    county: 'Kauai',
    selected: false,
  },
  {
    id: '015HI',
    name: 'Common Ground',
    elevation: 364.0,
    lat: 22.1975,
    lon: -159.421,
    county: 'Kauai',
    selected: false,
  },
  {
    id: '016HI',
    name: 'Keokea',
    elevation: 2858.0,
    lat: 20.7067,
    lon: -156.3554,
    county: 'Maui',
    selected: false,
  },
  {
    id: '017HI',
    name: 'Piiholo',
    elevation: 2090.0,
    lat: 20.8415,
    lon: -156.2948,
    county: 'Maui',
    selected: false,
  },
  {
    id: '018HI',
    name: 'Kaiholena',
    elevation: 2070.0,
    lat: 19.1689,
    lon: -155.5704,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '019HI',
    name: 'Kahikinui',
    elevation: 2339.0,
    lat: 20.6339,
    lon: -156.2739,
    county: 'Maui',
    selected: false,
  },
  {
    id: '020HI',
    name: 'Waikamoi',
    elevation: 6348.0,
    lat: 20.7736,
    lon: -156.2223,
    county: 'Maui',
    selected: false,
  },
  {
    id: '021HI',
    name: 'Kulaimano',
    elevation: 853.0,
    lat: 19.8343,
    lon: -155.1224,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '022HI',
    name: 'Kanakaleonui',
    elevation: 7715.0,
    lat: 19.845,
    lon: -155.3626,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '023HI',
    name: 'Hamoa',
    elevation: 347.0,
    lat: 20.7195,
    lon: -156.0024,
    county: 'Maui',
    selected: false,
  },
  {
    id: '024HI',
    name: 'Lower Limahuli',
    elevation: 102.0,
    lat: 22.2198,
    lon: -159.5752,
    county: 'Kauai',
    selected: false,
  },
  {
    id: '025HI',
    name: 'Kehena Ditch Cabin',
    elevation: 3799.0,
    lat: 20.1228,
    lon: -155.7493,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '026HI',
    name: 'Kaala',
    elevation: 3950.0,
    lat: 21.5069,
    lon: -158.1451,
    county: 'Honolulu',
    selected: false,
  },
  {
    id: '027HI',
    name: 'Lalamilo',
    elevation: 2631.0,
    lat: 20.0195,
    lon: -155.6771,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '029HI',
    name: 'Keahuolu',
    elevation: 1761.0,
    lat: 19.6687,
    lon: -155.9575,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '030HI',
    name: 'Keopukaloa',
    elevation: 614.0,
    lat: 21.1453,
    lon: -156.7295,
    county: 'Maui',
    selected: false,
  },
  {
    id: '031HI',
    name: 'Honolimaloo',
    elevation: 1319.0,
    lat: 21.1314,
    lon: -156.7586,
    county: 'Maui',
    selected: false,
  },
  {
    id: '032HI',
    name: 'Upper Kahikinui',
    elevation: 3392.0,
    lat: 20.6442,
    lon: -156.2847,
    county: 'Maui',
    selected: false,
  },
  {
    id: '033HI',
    name: 'Keaau',
    elevation: 597.0,
    lat: 19.6062,
    lon: -155.0515,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '034HI',
    name: 'Kaiaulu Puu Waawaa',
    elevation: 3809.0,
    lat: 19.7724,
    lon: -155.8312,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '035HI',
    name: 'Kona Hema',
    elevation: 4209.0,
    lat: 19.2068,
    lon: -155.811,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '036HI',
    name: 'Lahaina WTP',
    elevation: 801.0,
    lat: 20.8907,
    lon: -156.6549,
    county: 'Maui',
    selected: false,
  },
  {
    id: '037HI',
    name: 'Upper Waiolani',
    elevation: 663.0,
    lat: 21.3467,
    lon: -157.8364,
    county: 'Honolulu',
    selected: false,
  },
  {
    id: '038HI',
    name: 'Waiolani',
    elevation: 322.0,
    lat: 21.3376,
    lon: -157.8409,
    county: 'Honolulu',
    selected: false,
  },
  {
    id: '039HI',
    name: 'Lipoa',
    elevation: 289.0,
    lat: 20.7458,
    lon: -156.4306,
    county: 'Maui',
    selected: false,
  },
  {
    id: '040HI',
    name: 'Piihonua',
    elevation: 1988.0,
    lat: 19.7064,
    lon: -155.1874,
    county: 'Hawaii',
    selected: false,
  },
  {
    id: '042HI',
    name: 'Pulehu',
    elevation: 1401.0,
    lat: 20.7953,
    lon: -156.3599,
    county: 'Maui',
    selected: false,
  },
];
