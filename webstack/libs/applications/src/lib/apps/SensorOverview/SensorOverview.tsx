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
import { getFormattedDateTime1MonthBefore, getFormattedDateTime1WeekBefore, getFormattedDateTime1YearBefore } from './utils';
import StationMetadata from './viewers/StationMetadata';
import FriendlyVariableCard from './viewers/FriendlyVariableCard';
import StatisticCard from './viewers/StatisticCard';
import MapViewer from './viewers/MapViewer';
import { checkAvailableVisualizations } from './utils';
import MapGL from './MapGL';

// Styling
import './styling.css';

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
    setIsLoaded(false);
    let tmpStationMetadata: any = [];
    let url = '';

    if (s.widget.liveData || s.widget.startDate === s.widget.endDate) {
      url = `https://api.mesowest.net/v2/stations/timeseries?STID=${String(s.stationNames)}&showemptystations=1&recent=${resolveTimePeriod(
        s.widget.timePeriod
      )}&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`;
      // url = `https://api.mesowest.net/v2/stations/timeseries?STID=${String(s.stationNames)}&showemptystations=1&start=${resolveTimePeriod(
      //   s.widget.timePeriod
      // )}&end=${convertToFormattedDateTime(new Date())}&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`;
    } else if (!s.widget.liveData) {
      url = `https://api.mesowest.net/v2/stations/timeseries?STID=${String(s.stationNames)}&showemptystations=1&start=${
        s.widget.startDate
      }&end=${s.widget.endDate}&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`;
    }

    const response = await fetch(url);
    const sensor = await response.json();

    if (sensor) {
      const sensorData = sensor['STATION'];
      tmpStationMetadata = sensorData;
      console.log(sensorData);
    }
    const availableVariableNames = Object.getOwnPropertyNames(tmpStationMetadata[0].OBSERVATIONS);
    availableVariableNames.push('Elevation, Longitude, Latitude, Name, Time');
    availableVariableNames.push('Elevation & Current Temperature');

    updateState(props._id, { availableVariableNames: availableVariableNames });
    setStationMetadata(tmpStationMetadata);

    setIsLoaded(true);
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
            <Spinner thickness="5px" speed="1s" emptyColor="gray.200" />
          </Box>
        )}
      </Box>
    </AppWindow>
  );
}

const convertFormattedTimeToDateTime = (formattedTime: string) => {
  const year = Number(formattedTime.substring(0, 4));
  const month = Number(formattedTime.substring(4, 6));
  const day = Number(formattedTime.substring(6, 8));
  const hour = Number(formattedTime.substring(8, 10));
  const minute = Number(formattedTime.substring(10, 12));
  return new Date(year, month - 1, day, hour, minute);
};

/* App toolbar component for the app Sensor Overview */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);
  const [selectedDates, setSelectedDates] = useState<Date[]>([
    convertFormattedTimeToDateTime(s.widget.startDate),
    convertFormattedTimeToDateTime(s.widget.endDate),
  ]);

  const [stationMetadata, setStationMetadata] = useState([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isSortedOn, setIsSortedOn] = useState<{ name: string; direction: string }>({ name: 'NAME', direction: 'ascending' });

  // For color theme
  const textColor = useColorModeValue('gray.800', 'gray.50');
  const headerBackgroundColor: string = useColorModeValue('white', 'gray.800');
  const accentColor: string = useColorModeValue('#DFDFDF', '#424242');

  const stationNameRef = useRef<any>(s.stationNames);

  useEffect(() => {
    if (selectedDates.length === 2) {
      if (selectedDates[0] instanceof Date && selectedDates[1] instanceof Date) {
        const startDate = convertToFormattedDateTime(selectedDates[0]);
        const endDate = convertToFormattedDateTime(selectedDates[1]);
        updateState(props._id, { widget: { ...s.widget, startDate: startDate, endDate: endDate } });
      }
    }
  }, [selectedDates]);

  useEffect(() => {
    const fetchStationData = async () => {
      setIsLoaded(false);
      let tmpStationMetadata: any = [];
      let url = '';
      const stationNames = stationData.map((station) => station.name);
      if (s.widget.liveData || s.widget.startDate === s.widget.endDate) {
        url = `https://api.mesowest.net/v2/stations/timeseries?STID=${String(
          s.stationNames
        )}&showemptystations=1&recent=${resolveTimePeriod(
          s.widget.timePeriod
        )}&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`;
      } else if (!s.widget.liveData) {
        url = `https://api.mesowest.net/v2/stations/timeseries?STID=${String(stationNames)}&showemptystations=1&start=${
          s.widget.startDate
        }&end=${s.widget.endDate}&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`;
      }
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

      {s.widget.visualizationType === 'variableCard' ? (
        <ButtonGroup size="xs" isAttached variant="outline">
          {/* <Button >Celcius</Button>
  <Button >Fahrenheit</Button> */}
        </ButtonGroup>
      ) : null}
      {/* <Divider border={'1px'} size={'2xl'} ml="1rem" orientation="vertical" />
      <ButtonGroup ml="1rem">
        <Tooltip label={'Duplicate this chart for all other variables from this station'} aria-label="A tooltip">
          <Button colorScheme={'teal'} size="xs" onClick={handleVisualizeAllVariables}>
            All Variables
          </Button>
        </Tooltip>
      </ButtonGroup> */}
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
    lat: 20.79532,
    lon: -156.35991,
    name: '042HI',
    selected: false,
  },
  {
    lat: 20.7579,
    lon: -156.32,
    name: '001HI',
    selected: false,
  },
  {
    lat: 20.7458,
    lon: -156.4306,
    name: '039HI',
    selected: false,
  },
  {
    lat: 20.89072,
    lon: -156.65493,
    name: '036HI',
    selected: false,
  },
  // {
  //   lat: 20.64422,
  //   lon: -156.342056,
  //   name: '028HI',
  //   selected: false, // this station has no observations
  // },
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
    lat: 19.415215,
    lon: -155.238394,
    name: '004HI',
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
    lat: 19.7064,
    lon: -155.1874,
    name: '040HI',
    selected: false,
  },
  {
    lat: 19.1689,
    lon: -155.5704,
    name: '018HI',
    selected: false,
  },
  {
    lat: 19.6687,
    lon: -155.9575,
    name: '029HI',
    selected: false,
  },
  {
    lat: 19.77241,
    lon: -155.83118,
    name: '034HI',
    selected: false,
  },
  {
    lat: 19.2068247,
    lon: -155.81098,
    name: '035HI',
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
    lat: 21.3467,
    lon: -157.8364,
    name: '037HI',
    selected: false,
  },
  {
    lat: 21.3376,
    lon: -157.8409,
    name: '038HI',
    selected: false,
  },

  {
    lat: 21.506875,
    lon: -158.145114,
    name: '03HI',
    selected: false,
  },
  {
    lat: 21.506875,
    lon: -158.145114,
    name: '026HI',
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
    lat: 22.2198,
    lon: -159.57525,
    name: '024HI',
    selected: false,
  },
];
