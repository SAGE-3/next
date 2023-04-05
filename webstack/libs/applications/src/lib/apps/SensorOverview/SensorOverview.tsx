/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore } from '@sage3/frontend';
import { Box, HStack, Text, Spinner, useColorModeValue, Wrap, WrapItem } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import VariableCard from './VariableCard';
import CustomizeWidgets from './CustomizeWidgets';
import EChartsViewer from './EChartsViewer';

/* App component for Sensor Overview */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);
  const [stationMetadata, setStationMetadata] = useState([]);

  const bgColor = useColorModeValue('gray.100', 'gray.900');
  const textColor = useColorModeValue('gray.700', 'gray.100');

  useEffect(() => {
    const fetchStationData = async () => {
      const tmpStationMetadata: any = [];

      for (let i = 0; i < s.listOfStationNames.length; i++) {
        // Fetch from the Mesonet website. Will change to HCDP database when website is ready
        await fetch(
          `https://api.mesowest.net/v2/stations/timeseries?STID=${s.listOfStationNames[i]}&showemptystations=1&recent=4320&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`
        ).then((response) => {
          response.json().then(async (sensor) => {
            console.log(sensor);
            const sensorData = sensor['STATION'][0];
            tmpStationMetadata.push(sensorData);
          });
        });
      }
      return tmpStationMetadata;
    };
    fetchStationData().then((data) => {
      setStationMetadata(data);
    });
  }, []);

  const handleDeleteWidget = (widgetIndex: number) => {
    const tmpWidgetsEnabled = [...s.widgetsEnabled];
    tmpWidgetsEnabled.splice(widgetIndex, 1);
    updateState(props._id, { widgetsEnabled: tmpWidgetsEnabled });
  };

  const handleAddWidget = (visualizationType: string, yAxisNames: string[], xAxisNames: string[]) => {
    const tmpWidgetsEnabled = [...s.widgetsEnabled];
    tmpWidgetsEnabled.push({ visualizationType: visualizationType, yAxisNames: yAxisNames, xAxisNames: xAxisNames });
    console.log(tmpWidgetsEnabled);
    updateState(props._id, { widgetsEnabled: tmpWidgetsEnabled });
  };

  return (
    <AppWindow app={props}>
      <Box overflowY="scroll" p={'1rem'} bg={bgColor} h="100%">
        <Wrap>
          {stationMetadata.length > 0 ? (
            stationMetadata.map((station, index) => {
              return (
                <WrapItem key={index}>
                  <Box bgColor={bgColor} color={textColor} fontSize="lg" key={index} p="1rem" border="solid black 1px">
                    <Text textAlign="center" fontSize={'4rem'}>
                      {station['NAME']}
                    </Text>
                    <HStack>
                      <Box>
                        <Wrap maxW={'1500px'}>
                          {s.widgetsEnabled.map(
                            (widget: { visualizationType: string; yAxisNames: string[]; xAxisNames: string[] }, index: any) => {
                              const observations: any = station['OBSERVATIONS'];
                              switch (widget.visualizationType) {
                                case 'variableCard':
                                  return (
                                    <WrapItem key={index}>
                                      <VariableCard
                                        variableName={widget.yAxisNames[0]}
                                        variableValue={
                                          station['OBSERVATIONS'][widget.yAxisNames[0]] !== undefined
                                            ? station['OBSERVATIONS'][widget.yAxisNames[0]][observations[widget.yAxisNames[0]].length - 1]
                                            : '0'
                                        }
                                      />
                                    </WrapItem>
                                  );
                                case 'line':
                                  return (
                                    <WrapItem key={index}>
                                      <EChartsViewer
                                        stationNames={[station['STID']]}
                                        visualizationType={'line'}
                                        dateRange={''}
                                        yAxisNames={widget.yAxisNames}
                                        xAxisNames={widget.xAxisNames}
                                      />
                                    </WrapItem>
                                  );

                                default:
                                  return <></>;
                              }
                            }
                          )}
                        </Wrap>
                      </Box>
                    </HStack>
                  </Box>
                </WrapItem>
              );
            })
          ) : (
            <Spinner
              w={Math.min(props.data.size.height / 2, props.data.size.width / 2)}
              h={Math.min(props.data.size.height / 2, props.data.size.width / 2)}
              thickness="20px"
              speed="0.30s"
              emptyColor="gray.200"
            />
          )}
          <WrapItem>
            <CustomizeWidgets widgetsEnabled={s.widgetsEnabled} handleDeleteWidget={handleDeleteWidget} handleAddWidget={handleAddWidget} />
          </WrapItem>
        </Wrap>
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app Sensor Overview */

function ToolbarComponent(props: App): JSX.Element {
  return <></>;
}

export default { AppComponent, ToolbarComponent };
