/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore, useUIStore } from '@sage3/frontend';
import { Box, Button, ButtonGroup, Container, Grid, HStack, IconButton, Select, useColorModeValue, Tooltip } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import Plot from 'react-plotly.js';

// Styling
import './styling.css';
import { ChangeEvent, SetStateAction, useEffect, useRef, useState } from 'react';
import { FaBars } from 'react-icons/fa';
import { MdAdd, MdAddCircle, MdClose, MdRemove } from 'react-icons/md';
import Plotly from 'plotly.js-dist-min';
import { enUS } from 'date-fns/locale';
import 'chartjs-adapter-date-fns';

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
import { Chart, Line } from 'react-chartjs-2';
import { debounce } from 'throttle-debounce';

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

const maxFontSize = 100;
const minFontSize = 25;

/* App component for PlotlyViewer */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const [open, setOpen] = useState(false);
  const [attributeNames, setAttributeNames] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);

  const commonButtonColors = useColorModeValue('gray.300', 'gray.300');
  const buttonTextColor = useColorModeValue('white', 'black');

  const ref = useRef<HTMLDivElement>(null);
  const scale = useUIStore((state) => state.scale);
  const chartRef = useRef<ChartJS>(null);

  const [labels, setLabels] = useState<string[]>([]);
  const [chartData, setChartData] = useState<any>({
    labels,
    datasets: [
      {
        label: 'Dataset 1',
        data: [1, 2, 3, 4],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  });
  const [options, setOptions] = useState({
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      y: {
        ticks: {
          color: 'white',
          font: {
            size: 20 * (1 / scale),
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
          color: 'red',
          font: {
            size: 20 * (1 / scale),
          },
        },
      },
    },

    plugins: {
      title: {
        display: true,
        text: '',
        font: { size: 20 * (1 / scale) },
      },
      legend: {
        labels: {
          // This more specific font property overrides the global property
          font: {
            size: 20 * (1 / scale),
          },
        },
      },
    },
  });

  // Saving the text after 1sec of inactivity
  const debounceSave = debounce(500, (scale, fontSizeMultiplier) => {
    let fontSize = fontSizeMultiplier * (1 / scale);
    // let fontSize = 15 * (1 / val);
    if (fontSize > maxFontSize) {
      fontSize = maxFontSize;
    }
    if (fontSize < minFontSize) {
      fontSize = minFontSize;
    }
    setOptions({
      ...options,
      scales: {
        y: { ticks: { font: { size: fontSize }, color: 'white' } },
        x: { ...options.scales.x, ticks: { font: { size: fontSize }, color: 'white' } },
      },
      plugins: {
        title: {
          display: false,
          text: '',
          font: { size: fontSize },
        },
        legend: {
          labels: {
            // This more specific font property overrides the global property
            font: {
              size: fontSize,
            },
          },
        },
      },
    });
  });
  // Keep a copy of the function
  const debounceFunc = useRef(debounceSave);

  useEffect(() => {
    debounceFunc.current(scale, s.fontSizeMultiplier);
  }, [scale]);

  // useEffect(() => {
  //   let fontSize = s.fontSizeMultiplier * (1 / scale);
  //   // let fontSize = 15 * (1 / val);
  //   if (fontSize > maxFontSize) {
  //     fontSize = maxFontSize;
  //   }
  //   if (fontSize < minFontSize) {
  //     fontSize = minFontSize;
  //   }
  //   setOptions({
  //     ...options,
  //     scales: {
  //       y: { ticks: { font: { size: fontSize } } },
  //       x: { ...options.scales.x, ticks: { font: { size: fontSize } } },
  //     },
  //     plugins: {
  //       title: {
  //         display: false,
  //         text: 'Line Chart',
  //         font: { size: fontSize, color: 'red' },
  //       },
  //       legend: {
  //         labels: {
  //           // This more specific font property overrides the global property
  //           font: {
  //             size: fontSize,
  //           },
  //         },
  //       },
  //     },
  //   });
  // }, [s.fontSizeMultiplier]);

  useEffect(() => {
    let climateData: never[] = [];

    fetch(s.url).then((response) => {
      response.json().then((station) => {
        climateData = station['STATION'][0]['OBSERVATIONS'];
        const attributeProps = Object.keys(climateData);

        setData(climateData);
        setAttributeNames(attributeProps);
      });
    });
  }, [s.url]);
  useEffect(() => {
    let tmpTraces: any[] = [];
    let chartType = '';
    let yDataName = '';
    //Setting labels for X axis
    for (let i = 0; i < s.datasets.length; i++) {
      yDataName = s.datasets[i].yDataName;
      chartType = s.datasets[i].chartType;
      tmpTraces.push({
        // @ts-ignore
        type: chartType as const,
        label: yDataName,
        // @ts-ignore
        data: data[yDataName],
        borderColor: 'rgb(255, 255, 255)',
        backgroundColor: 'rgb(244, 187, 68)',
      });
    }
    setChartData({
      // @ts-ignore
      labels: data[s.labelName],
      datasets: [...tmpTraces],
    });
    // setRevCount(Math.floor(Math.random() * 1000000));
  }, [JSON.stringify(data), JSON.stringify(s.datasets)]);

  const handleYAxisChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    let newDatasets = [...s.datasets];
    newDatasets[0].yDataName = value;
    updateState(props._id, { datasets: newDatasets });
  };
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    let newDatasets = [...s.datasets];
    for (let i = 0; i < newDatasets.length; i++) {
      newDatasets[i].chartType = value;
    }
    updateState(props._id, { datasets: newDatasets });
  };
  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      chart.options.color = 'white';
      // @ts-ignore
      if (chart.config.options) chart.scales.x.ticks.color = 'red';
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
            <Grid textAlign="center" templateColumns="repeat(1,1fr)" gap={2}>
              <br />
              <h1>Graph Type</h1>
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
              <h1>X values</h1>
              <Container>
                <Box maxW="sm" overflow="hidden">
                  <HStack>
                    {/* <Select
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
                    ></IconButton> */}
                  </HStack>
                </Box>
              </Container>
              <h1>Y values</h1>
              <Container>
                <Box maxW="sm" overflow="hidden">
                  <HStack>
                    <Select
                      borderColor="black"
                      borderWidth="1px"
                      borderRadius="lg"
                      name="yAxis"
                      placeholder={'choose an attribute'}
                      onChange={handleYAxisChange}
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

  const increaseFontSize = () => {
    updateState(props._id, { fontSizeMultiplier: s.fontSizeMultiplier + 1 });
  };
  const decreaseFontSize = () => {
    updateState(props._id, { fontSizeMultiplier: s.fontSizeMultiplier - 1 });
  };
  console.log(s.fontSizeMultiplier);
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
