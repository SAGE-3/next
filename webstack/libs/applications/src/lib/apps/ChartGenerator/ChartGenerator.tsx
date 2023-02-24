/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// SAGE3 imports
import { useAppStore, useUIStore } from '@sage3/frontend';
import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Chakra Imports styling
import {
  Box,
  Button,
  ButtonGroup,
  Container,
  Grid,
  HStack,
  IconButton,
  Select,
  useColorModeValue,
  Tooltip,
  VStack,
} from '@chakra-ui/react';

//Icon imports
import { MdAdd, MdAddCircle, MdClose, MdRemove } from 'react-icons/md';
import { FaBars } from 'react-icons/fa';

// Styling
import './styling.css';
import { ChangeEvent, Key, useEffect, useRef, useState } from 'react';

import { debounce } from 'throttle-debounce';

// ChartJS imports
import 'chartjs-adapter-date-fns';
import { enUS } from 'date-fns/locale';
import {
  Chart as ChartJS,
  LinearScale,
  CategoryScale,
  BarElement,
  PointElement,
  LineElement,
  Legend,
  Tooltip as ChartJSTooltip,
  LineController,
  BarController,
  TimeScale,
  Title,
  Colors,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

// ChartJS register
ChartJS.register(
  LinearScale,
  CategoryScale,
  BarElement,
  PointElement,
  LineElement,
  Legend,
  ChartJSTooltip,
  LineController,
  BarController,
  TimeScale,
  Title,
  Colors
);

// Supported chart types
export const typeOptions = [
  {
    name: 'Bar Graph',
    value: 'bar',
  },
  {
    name: 'Line Graph',
    value: 'line',
  },
];

// // For scaling apps when zooming in and out of board
// const maxFontSize = 100;
// const minFontSize = 25;

/* App component for ChartJSViewer */

function AppComponent(props: App): JSX.Element {
  //App State
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const commonButtonColors = useColorModeValue('gray.300', 'gray.300');
  const buttonTextColor = useColorModeValue('white', 'black');
  const scale = useUIStore((state) => state.scale);

  const chartRef = useRef<any>(null);
  const [chart, setChart] = useState<any>(null);

  //Local State
  const [open, setOpen] = useState(false);
  const [attributeNames, setAttributeNames] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [labels] = useState<string[]>([]);

  //TODO: Temporary for all properties for station data
  const [stationMetadata, setStationMetadata] = useState<any>({});

  useEffect(() => {
    if (chart) {
      chart.data.datasets = [
        ...s.datasets.map((d) => ({
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          type: d.chartType as const,
          label: d.yDataName,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          data: data[d.yDataName],
          borderColor: d.borderColor,
          backgroundColor: d.backgroundColor,
          yAxisID: d.yAxisID,
        })),
      ];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const minYValue = Math.min(...data[s.datasets[0].yDataName].filter((v) => v != null));
      chart.options.scales.y.min = minYValue;
      console.log(chart.data.datasets);
      chart.update();
    }
  }, [JSON.stringify(s.datasets), JSON.stringify(data)]);

  useEffect(() => {
    const ctx = chartRef.current?.getContext('2d');
    let climateData: never[] = [];
    const getData = (isIntervalCall: boolean) => {
      fetch(s.url).then((response) => {
        response.json().then((station) => {
          climateData = station['STATION'][0]['OBSERVATIONS'];
          delete station['STATION'][0]['SENSOR_VARIABLES'];
          delete station['STATION'][0]['OBSERVATIONS'];
          const attributeProps = Object.keys(climateData);

          setStationMetadata(station['STATION'][0]);
          // setData(climateData);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const minYValue = Math.min(...climateData[s.datasets[0].yDataName].filter((v) => v != null));
          console.log(station);
          // setAttributeNames(attributeProps);
          if (!isIntervalCall) {
            const chartTmp = new ChartJS(ctx, {
              type: 'bar',

              data: {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                labels: climateData[s.labelName],
                datasets: [
                  {
                    label: s.datasets[0].yDataName,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    data: climateData[s.datasets[0].yDataName],
                    borderColor: s.datasets[0].borderColor,
                    backgroundColor: s.datasets[0].backgroundColor,
                    yAxisID: s.datasets[0].yAxisID,
                    type: s.datasets[0].chartType,
                  },
                ],
              },
              options: {
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                  y: {
                    type: 'linear',
                    min: minYValue,
                    beginAtZero: true,
                    ticks: {
                      color: 'white',
                      font: {
                        size: 40,
                      },
                    },
                  },
                  y1: {
                    min: 20,
                    position: 'right',
                    display: false,
                    beginAtZero: true,
                    ticks: {
                      color: 'white',
                      font: {
                        size: 40,
                      },
                    },
                  },
                  x: {
                    type: 'time' as const,

                    adapters: {
                      date: {
                        locale: enUS,
                      },
                    },
                    ticks: {
                      color: 'white',
                      font: {
                        size: 40,
                      },
                    },
                  },
                },
                plugins: {
                  title: {
                    display: true,
                    text: station['STATION'][0]['NAME'],
                    font: { size: 60 },
                    color: 'white',
                  },
                  legend: {
                    labels: {
                      color: 'white',
                      // This more specific font property overrides the global property
                      font: {
                        size: 40,
                      },
                    },
                  },
                },
              },
            });
            setChart(chartTmp);
          }

          setData(climateData);
        });
      });
    };
    getData(false);
    // Fetch data every 10 minutes. TODO: late joiners will not be synced. They will get recent data faster than older
    const interval = setInterval(() => {
      getData(true);
    }, 60 * 1000 * 10);

    return () => clearInterval(interval);
  }, []);

  return (
    <AppWindow app={props}>
      <>
        <canvas style={{ backgroundColor: 'black' }} ref={chartRef}></canvas>
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app ChartGenerator */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const [sensorVariableNames, setSensorVariableNames] = useState<any>([]);
  const [climateData, setClimateData] = useState<any>([]);

  useEffect(() => {
    fetch(s.url).then((response) => {
      response.json().then((station) => {
        const tmpClimateDdata = station['STATION'][0]['OBSERVATIONS'];
        delete station['STATION'][0]['SENSOR_VARIABLES'];
        delete station['STATION'][0]['OBSERVATIONS'];

        setSensorVariableNames(Object.keys(tmpClimateDdata));
        setClimateData(tmpClimateDdata);
      });
    });
  }, []);
  // Functions to increase/decrease font size for chart titles
  const increaseFontSize = () => {
    updateState(props._id, { fontSizeMultiplier: s.fontSizeMultiplier + 1 });
  };
  const decreaseFontSize = () => {
    updateState(props._id, { fontSizeMultiplier: s.fontSizeMultiplier - 1 });
  };

  //  // Change x axis
  //  const handleXAxisChange = (e: ChangeEvent<HTMLSelectElement>) => {
  //   const xAxisProperty = e.target.value;

  //   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //   // @ts-ignore
  //   const newData = data[xAxisProperty];
  //   console.log(chartData);
  //   setChartData({
  //     ...chartData,
  //     labels: [...newData],
  //   });
  // };

  // Change y axis
  const handleYAxisChange = (e: ChangeEvent<HTMLSelectElement>, index: number) => {
    const value = e.target.value;
    const newDatasets = [...s.datasets];
    newDatasets[index].yDataName = value;

    //TODO: need to fix setting minimum value

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const minYValue = Math.min(...climateData[value].filter((v) => v != null));
    newDatasets[index].minYValue = minYValue;
    updateState(props._id, { datasets: newDatasets });
  };

  // Change chart type
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    //TODO: customizable chart types for each dataset trace
    const value = e.target.value;
    const newDatasets = [...s.datasets];
    for (let i = 0; i < newDatasets.length; i++) {
      newDatasets[i].chartType = value;
    }
    updateState(props._id, { datasets: newDatasets });
  };

  // Increase the number of "traces" or variables to visualize
  const increaseDatasetSize = () => {
    const tmpDatasets = [...s.datasets];
    updateState(props._id, {
      datasets: [
        ...tmpDatasets,
        {
          yDataName: '',
          chartType: 'line',
        },
      ],
    });
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Zoom In'} openDelay={400}>
          <Button isDisabled={s.fontSizeMultiplier >= 30} onClick={increaseFontSize} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdAdd fontSize="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Zoom Out'} openDelay={400}>
          <Button isDisabled={s.fontSizeMultiplier <= 1} onClick={decreaseFontSize} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdRemove fontSize="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
      {s.datasets.map((dataset, index) => {
        console.log(sensorVariableNames);
        return (
          <Select
            borderWidth="1px"
            borderRadius="lg"
            size="sm"
            mx="1rem"
            backgroundColor={'whiteAlpha.900'}
            color="gray.800"
            name="yAxis"
            key={index}
            placeholder={'choose an attribute'}
            onChange={(e) => {
              handleYAxisChange(e, index);
            }}
          >
            {sensorVariableNames.map((variableName: any, index: Key | null | undefined) => {
              return (
                <option data-key={index} value={variableName} key={index}>
                  {variableName}
                </option>
              );
            })}
          </Select>
        );
      })}
    </>
  );
}

export default { AppComponent, ToolbarComponent };
