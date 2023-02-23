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
import { MdAdd, MdAddCircle, MdClose, MdFormatAlignLeft, MdFormatAlignRight, MdRemove, MdRemoveCircle } from 'react-icons/md';
import { FaBars } from 'react-icons/fa';

// Styling
import './styling.css';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

import { debounce } from 'throttle-debounce';

// ChartJS imports
import 'chartjs-adapter-date-fns';
import { enUS } from 'date-fns/locale';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import React from 'react';

// ChartJS register
ChartJS.register(...registerables);

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
  const { updateState, update } = useAppStore((state) => state);
  const commonButtonColors = useColorModeValue('gray.300', 'gray.300');
  const buttonTextColor = useColorModeValue('white', 'black');
  const scale = useUIStore((state) => state.scale);

  //Local State
  const [open, setOpen] = useState(true);
  const [attributeNames, setAttributeNames] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [labels] = useState<string[]>([]);
  const [chartData, setChartData] = useState<any>({
    labels,
    datasets: [
      {
        label: 'Dataset 1',
        data: [1, 2, 3, 4],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
      },
    ],
  });
  const [options, setOptions] = useState({
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      // grid line settings

      y: {
        min: 0,
        display: true,
        position: 'left',
        ticks: {
          color: 'blue',
          font: {
            size: 40,
          },
        },
      },
      y1: {
        min: 0,
        display: true,
        position: 'right',
        ticks: {
          color: 'red',
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
        text: '',
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
  });

  const chartRef = useRef<ChartJS>(null);
  useEffect(() => {
    update(props._id, { title: 'ChartJS - ' });
  }, []);

  //TODO: Temporary for all properties for station data
  const [stationMetadata, setStationMetadata] = useState<any>({});

  // Used to update font sizes in the toolbar +/-
  useEffect(() => {
    const fontSize = s.fontSizeMultiplier * (1 / scale);

    setOptions({
      ...options,
      scales: {
        y1: {
          ...options.scales.y1,
        },
        y: {
          ...options.scales.y,
          ticks: { ...options.scales.y.ticks, font: { size: fontSize } },
        },
        x: { ...options.scales.x, ticks: { ...options.scales.x.ticks, font: { size: fontSize } } },
      },
      plugins: {
        title: {
          ...options.plugins.title,

          font: { size: fontSize },
        },
        legend: {
          labels: {
            color: 'white',
            // This more specific font property overrides the global property
            font: {
              size: fontSize,
            },
          },
        },
      },
    });
  }, [s.fontSizeMultiplier]);

  const setTitle = (chartTitle: string) => {
    setOptions({ ...options, plugins: { ...options.plugins, title: { ...options.plugins.title, text: chartTitle } } });
  };

  const setMinimumYValue = (minYValue: number, yaxisID: string) => {
    if (yaxisID === 'y') {
      setOptions({
        ...options,
        plugins: { ...options.plugins, title: { ...options.plugins.title } },
        scales: { ...options.scales, y: { ...options.scales.y, min: minYValue }, y1: { ...options.scales.y1 } },
      });
    } else {
      setOptions({
        ...options,
        plugins: { ...options.plugins, title: { ...options.plugins.title } },
        scales: { ...options.scales, y: { ...options.scales.y }, y1: { ...options.scales.y1, min: minYValue } },
      });
    }
  };

  // Fetching HCDP datafrom state.url
  useEffect(() => {
    let climateData: never[] = [];

    fetch(s.url).then((response) => {
      response.json().then((station) => {
        climateData = station['STATION'][0]['OBSERVATIONS'];
        delete station['STATION'][0]['SENSOR_VARIABLES'];
        delete station['STATION'][0]['OBSERVATIONS'];
        setStationMetadata(station['STATION'][0]);
        const attributeProps = Object.keys(climateData);
        setTitle('Data for Station ' + station['STATION'][0]['NWSFIREZONE']);
        setData(climateData);

        if (s.datasets[0].yDataName !== '') {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const minYValue = Math.min(...climateData[s.datasets[0].yDataName].filter((v) => v != null));
          setMinimumYValue(minYValue, s.datasets[0].yaxisID);
        }

        setAttributeNames(attributeProps);
      });
    });
  }, [s.url]);

  // Update the chart if axis or data changes
  useEffect(() => {
    const tmpTraces: any[] = [];
    let chartType = '';
    let yDataName = '';
    let yaxisID = '';
    //Setting labels for X axis
    for (let i = 0; i < s.datasets.length; i++) {
      yDataName = s.datasets[i].yDataName;
      chartType = s.datasets[i].chartType;
      yaxisID = s.datasets[i].yaxisID;
      console.log(yaxisID);
      tmpTraces.push(
        {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          type: chartType as const,
          label: yDataName,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          data: data[yDataName],
          borderColor: 'rgb(255, 255, 255)',
          backgroundColor: yaxisID == 'y' ? 'red' : 'blue',
          yaxisID: yaxisID,
        }
        // {
        //   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //   // @ts-ignore
        //   type: chartType as const,
        //   label: yDataName,
        //   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //   // @ts-ignore
        //   data: data['soil_moisture_set_1'],
        //   borderColor: 'rgb(255, 255, 255)',
        //   backgroundColor: 'rgb(244, 187, 68)',
        //   yaxisID: yaxisID,
        // }
      );
    }
    setChartData({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      labels: data[s.labelName],
      datasets: [...tmpTraces],
    });
    // setRevCount(Math.floor(Math.random() * 1000000));
  }, [JSON.stringify(data), JSON.stringify(s.datasets)]);

  // Change x axis
  const handleXAxisChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const xAxisProperty = e.target.value;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const newData = data[xAxisProperty];
    console.log(chartData);
    setChartData({
      ...chartData,
      labels: [...newData],
    });
  };

  // Change y axis
  const handleYAxisChange = (e: ChangeEvent<HTMLSelectElement>, index: number) => {
    const value = e.target.value;
    const newDatasets = [...s.datasets];
    newDatasets[index].yDataName = value;

    //TODO: need to fix setting minimum value

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const minYValue = Math.min(...data[value].filter((v) => v != null));

    setMinimumYValue(minYValue, newDatasets[index].yaxisID);

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

  // decrement the number of "traces" or variables to visualize
  const decreaseDatasetSize = (indexToRemove: number) => {
    const tmpDatasets = [...s.datasets];

    tmpDatasets.splice(indexToRemove, 1);
    updateState(props._id, {
      datasets: [...tmpDatasets],
    });
  };

  const moveToRight = (indexToMove: number) => {
    const newDatasets = [...s.datasets];
    console.log(newDatasets);
    newDatasets[indexToMove].yaxisID = 'y1';
    updateState(props._id, { datasets: newDatasets });
    if (s.datasets[indexToMove].yDataName !== '') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const fullDataset = s.datasets.map((d) => data[d.yDataName]).flat();
      console.log(fullDataset);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const minYValue = Math.ceil(Math.min(fullDataset.filter((v) => !isNaN(parseFloat(v)) && isFinite(v))));
      console.log(minYValue);
      setMinimumYValue(isNaN(minYValue) ? 0 : minYValue, 'y1');
    }
  };

  const moveToLeft = (indexToMove: number) => {
    const newDatasets = [...s.datasets];
    console.log(newDatasets);
    newDatasets[indexToMove].yaxisID = 'y';
    updateState(props._id, { datasets: newDatasets });
    if (s.datasets[indexToMove].yDataName !== '') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const minYValue = Math.min(...data[s.datasets[indexToMove].yDataName].filter((v) => v != null));
      setMinimumYValue(isNaN(minYValue) ? 0 : minYValue, 'y');
    }
  };

  useEffect(() => {
    if (chartRef.current) {
      // chartRef.current?.options.interaction?.mode = 'nearest';
    }
  }, []);

  return (
    <AppWindow app={props}>
      <>
        <div
          style={{
            position: 'absolute',
            overflow: 'hidden',
            width: '400px',
            maxWidth: props.data.size.width,
            height: '100%',
            pointerEvents: open ? 'all' : 'none',
          }}
        >
          <div className="sideMenu" style={{ left: open ? 0 : '-100%', opacity: open ? 1.0 : 0.0 }}>
            <Button className="closeButton" onClick={() => setOpen(false)} backgroundColor={commonButtonColors} size="sm" mx="1">
              <MdClose color={buttonTextColor} />
            </Button>
            <br />
            <br />
            <Grid templateColumns="repeat(1,1fr)" gap={2}>
              {Object.keys(stationMetadata).map((property, index) => {
                // Create a Title for each property name
                const firstLetterCapitalized = property.slice(0, 1);
                const remainingLettersWithoutUnderscore = property.replaceAll('_', ' ');
                const remainingLettersToLowerCase = remainingLettersWithoutUnderscore.slice(1).toLowerCase();
                const finalProperty = firstLetterCapitalized + remainingLettersToLowerCase;

                return typeof stationMetadata[property] === 'string' ? (
                  <h1 style={{ marginLeft: '1rem' }} key={index}>
                    <b>{finalProperty}: </b>
                    {stationMetadata[property]}
                  </h1>
                ) : null;
              })}
              <br />
              <h1 style={{ textAlign: 'center' }}>Graph Type</h1>
              <Container>
                <Box borderColor="black" maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden">
                  <Select placeholder={'Chart Type'} onChange={handleTypeChange}>
                    {typeOptions.map((value, index) => (
                      <option value={value.value} key={index}>
                        {value.name}
                      </option>
                    ))}
                  </Select>
                </Box>
              </Container>
              <h1 style={{ textAlign: 'center' }}> X values</h1>
              <Container>
                <Box maxW="sm" overflow="hidden">
                  <HStack>
                    <Select
                      borderColor="black"
                      borderWidth="1px"
                      borderRadius="lg"
                      name="xAxis"
                      placeholder={'choose an attribute'}
                      onChange={handleXAxisChange}
                    >
                      {attributeNames.map((attributeName, index) => {
                        return (
                          <option data-key={index} value={attributeName} key={index}>
                            {attributeName}
                          </option>
                        );
                      })}
                    </Select>
                    <IconButton
                      aria-label="Add Field"
                      borderColor="black"
                      borderWidth="1px"
                      borderRadius="lg"
                      icon={<MdAddCircle />}
                    ></IconButton>
                  </HStack>
                </Box>
              </Container>
              <h1 style={{ textAlign: 'center' }}>Y values</h1>
              <Container>
                <Box maxW="sm" overflow="hidden">
                  <HStack>
                    <VStack>
                      {s.datasets.map((dataset, index) => {
                        return (
                          <HStack key={index}>
                            <Select
                              borderColor="black"
                              borderWidth="1px"
                              borderRadius="lg"
                              name="yAxis"
                              placeholder={'choose an attribute'}
                              onChange={(e) => {
                                handleYAxisChange(e, index);
                              }}
                            >
                              {attributeNames.map((attributeName, index) => {
                                return (
                                  <option data-key={index} value={attributeName} key={index}>
                                    {attributeName}
                                  </option>
                                );
                              })}
                            </Select>
                            (
                            <IconButton
                              aria-label="Add Field"
                              borderColor="black"
                              borderWidth="1px"
                              borderRadius="lg"
                              disabled={index == 0 ? true : false}
                              icon={<MdRemoveCircle />}
                              onClick={() => decreaseDatasetSize(index)}
                            ></IconButton>
                            <IconButton
                              aria-label="Add Field"
                              borderColor="black"
                              borderWidth="1px"
                              borderRadius="lg"
                              icon={<MdFormatAlignRight />}
                              onClick={() => moveToRight(index)}
                            ></IconButton>
                            <IconButton
                              aria-label="Add Field"
                              borderColor="black"
                              borderWidth="1px"
                              borderRadius="lg"
                              icon={<MdFormatAlignLeft />}
                              onClick={() => moveToLeft(index)}
                            ></IconButton>
                            )
                          </HStack>
                        );
                      })}
                      <IconButton
                        aria-label="Add Field"
                        borderColor="black"
                        borderWidth="1px"
                        borderRadius="lg"
                        icon={<MdAddCircle />}
                        onClick={increaseDatasetSize}
                      ></IconButton>
                    </VStack>
                  </HStack>
                </Box>
              </Container>
              <br />
              <br />
            </Grid>
          </div>
        </div>

        <div className={open ? 'dimBackground' : undefined}>
          <div onClick={() => setOpen(false)} style={{ width: props.data.size.width, height: props.data.size.height }}>
            <Chart ref={chartRef} style={{ backgroundColor: 'black', color: 'white' }} options={options} data={chartData} type={'bar'} />;
          </div>
        </div>

        <Button
          position="absolute"
          backgroundColor={commonButtonColors}
          size="sm"
          left="0"
          top="0"
          onClick={(e: any) => {
            e.preventDefault();
            setOpen(true);
          }}
        >
          <FaBars color={buttonTextColor} />
        </Button>
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app ChartGenerator */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  // Functions to increase/decrease font size for chart titles
  const increaseFontSize = () => {
    updateState(props._id, { fontSizeMultiplier: s.fontSizeMultiplier + 1 });
  };
  const decreaseFontSize = () => {
    updateState(props._id, { fontSizeMultiplier: s.fontSizeMultiplier - 1 });
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
    </>
  );
}

export default { AppComponent, ToolbarComponent };
