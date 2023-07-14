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
import { Box, HStack, Spinner, useColorModeValue, Button, ButtonGroup } from '@chakra-ui/react';

// Styling
import './styling.css';
import { useEffect, useState } from 'react';

// Visualization imports
import VariableCard from '../HCDP/viewers/VariableCard';
import EChartsViewer from '../HCDP/viewers/EChartsViewer';
import CurrentConditions from '../HCDP/viewers/CurrentConditions';
import CustomizeWidgets from '../HCDP/menu/CustomizeWidgets';
import StationMetadata from '../HCDP/viewers/StationMetadata';

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
    return `Refreshed ${mins} minutes ago`;
  } else {
    return `Refreshed less than a minute ago`;
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

  return (
    <AppWindow app={props}>
      <Box overflowY="auto" bg={bgColor} h="100%">
        {stationMetadata.length > 0 ? (
          <Box bgColor={bgColor} color={textColor} fontSize="lg">
            <CustomizeWidgets {...props} />
            <HStack>
              <Box>
                {s.widget.visualizationType === 'variableCard' ? (
                  <VariableCard
                    size={props.data.size}
                    state={props.data.state}
                    stationNames={s.stationNames}
                    startDate={s.widget.startDate}
                    stationMetadata={stationMetadata}
                    timeSinceLastUpdate={timeSinceLastUpdate}
                    generateAllVariables={s.widget.visualizationType === 'allVariables'}
                    isLoaded={true}
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
                    size={props.data.size}
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
                      size={props.data.size}
                      state={props.data.state}
                      stationNames={s.stationNames}
                      stationMetadata={stationMetadata}
                      isLoaded={isLoaded}
                    />
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

  const handleOpenWidget = () => {
    updateState(props._id, { isWidgetOpen: true });
  };

  const handleOpenAndEditWidget = async () => {
    updateState(props._id, { isWidgetOpen: false });

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
        isWidgetOpen: true,
      },
      raised: true,
      dragging: false,
    });
    // console.log(app);
    fitApps([app.data]);
  };

  const handleVisualizeAllVariables = async () => {
    console.log(s.stationNames);
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
      const properties = Object.getOwnPropertyNames(observations);
      let row = 0;
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
            x: props.data.position.x + props.data.size.width * (i % 3),
            y: props.data.position.y + props.data.size.height * row,
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
            widget: widget,
            isWidgetOpen: false,
          },
          raised: true,
          dragging: false,
        });
      }
    }
  };

  return (
    <>
      <ButtonGroup>
        <Button colorScheme={'green'} size="xs" onClick={handleOpenWidget}>
          Edit visualization
        </Button>
        {props.data.state.widget.visualizationType === 'variableCard' ? (
          <Button colorScheme={'teal'} size="xs" onClick={handleVisualizeAllVariables}>
            Visualize for all other variables
          </Button>
        ) : null}
        <Button size="xs" colorScheme="orange" onClick={handleOpenAndEditWidget}>
          Duplicate and Edit
        </Button>
      </ButtonGroup>
      {s.widget.visualizationType === 'variableCard' ? (
        <ButtonGroup size="sm" isAttached variant="outline">
          {/* <Button >Celcius</Button>
  <Button >Fahrenheit</Button> */}
        </ButtonGroup>
      ) : null}
    </>
  );
}

export default { AppComponent, ToolbarComponent };
