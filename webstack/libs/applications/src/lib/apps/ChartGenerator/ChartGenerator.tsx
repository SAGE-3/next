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
import { Box, Button, ButtonGroup, Container, Grid, HStack, IconButton, Select, useColorModeValue, Tooltip } from '@chakra-ui/react';

//Icon imports
import { MdAdd, MdAddCircle, MdClose, MdRemove } from 'react-icons/md';
import { FaBars } from 'react-icons/fa';

// Styling
import './styling.css';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

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
import { Chart, Line } from 'react-chartjs-2';

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

// For scaling apps when zooming in and out of board
const maxFontSize = 100;
const minFontSize = 25;

/* App component for ChartJSViewer */

function AppComponent(props: App): JSX.Element {
  //App State
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const commonButtonColors = useColorModeValue('gray.300', 'gray.300');
  const buttonTextColor = useColorModeValue('white', 'black');
  const scale = useUIStore((state) => state.scale);

  const chartRef = useRef<ChartJS>(null);

  //Local State
  const [open, setOpen] = useState(false);
  const [attributeNames, setAttributeNames] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
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
          color: 'white',
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
          color: 'white',
          // This more specific font property overrides the global property
          font: {
            size: 20 * (1 / scale),
          },
        },
      },
    },
  });

  // Updating the font sizes of the charts based on the zoom level
  // Only update after 500 ms
  const debounceSave = debounce(500, (scale, fontSizeMultiplier) => {
    let fontSize = fontSizeMultiplier * (1 / scale);

    // Just in case user's text gets too big or too small
    if (fontSize > maxFontSize) {
      fontSize = maxFontSize;
    }
    if (fontSize < minFontSize) {
      fontSize = minFontSize;
    }

    // Update ChartJS options
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
            color: 'white',
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

  // Used to update font sizes in the toolbar +/-
  useEffect(() => {
    let fontSize = s.fontSizeMultiplier * (1 / scale);
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
          text: 'Line Chart',
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

  // Fetching HCDP datafrom state.url
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

  // Update the chart if axis or data changes
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

  // Change y axis
  const handleYAxisChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    let newDatasets = [...s.datasets];
    newDatasets[0].yDataName = value;
    updateState(props._id, { datasets: newDatasets });
  };

  // Change chart type
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    let newDatasets = [...s.datasets];
    for (let i = 0; i < newDatasets.length; i++) {
      newDatasets[i].chartType = value;
    }
    updateState(props._id, { datasets: newDatasets });
  };

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
              {/**TODO: May need to delete later? Will find out later if this makes sense with the HCDP data */}
              {/* <h1>X values</h1> */}
              {/* <Container>
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
              </Container> */}
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
                    {/**TODO: Create a way to add more attributes on a single chart */}
                    {/* <IconButton
                      aria-label="Add Field"
                      borderColor="black"
                      borderWidth="1px"
                      borderRadius="lg"
                      icon={<MdAddCircle />}
                    ></IconButton> */}
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
