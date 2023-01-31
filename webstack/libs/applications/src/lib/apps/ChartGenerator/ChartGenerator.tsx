/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore } from '@sage3/frontend';
import { Box, Button, Container, Grid, HStack, IconButton, Select, useColorModeValue } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import Plot from 'react-plotly.js';

// Styling
import './styling.css';
import { ChangeEvent, SetStateAction, useEffect, useState } from 'react';
import { FaBars } from 'react-icons/fa';
import { MdAddCircle, MdClose } from 'react-icons/md';

/* App component for PlotlyViewer */
export const typeOptions = [
  {
    name: 'Bar Graph',
    value: 'bar',
  },
  {
    name: 'Scatter Graph',
    value: 'scatter',
  },
];

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const [open, setOpen] = useState(false);
  const [attributeNames, setAttributeNames] = useState<string[]>([]);
  const [data, setData] = useState<never[]>([]);

  const commonButtonColors = useColorModeValue('gray.300', 'gray.300');
  const buttonTextColor = useColorModeValue('white', 'black');

  const [traces, setTraces] = useState<any[]>([
    {
      x: [1, 2, 3],
      y: [2, 6, 3],
      type: 'scatter',
      mode: 'lines+markers',
    },
  ]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    let newTraces = traces;
    for (let i = 0; i < newTraces.length; i++) {
      newTraces[i].type = value;
    }
    setTraces(newTraces);
    console.log(value, newTraces);
  };

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
    let tmpTraces: SetStateAction<any[]> = [];
    let xData = '';
    let yData = '';

    for (let i = 0; i < s.axis.x.length; i++) {
      for (let j = 0; j < s.axis.y.length; j++) {
        xData = s.axis.x[i];
        yData = s.axis.y[j];
        tmpTraces.push({
          // @ts-ignore
          x: data[xData],
          // @ts-ignore
          y: data[yData],
          type: 'scatter',
          mode: 'lines',
        });
      }
    }

    setTraces(tmpTraces);
  }, [JSON.stringify(data), JSON.stringify(s.axis)]);

  const handleXAxisChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    updateState(props._id, { axis: { x: [value], y: s.axis.y } });
  };
  const handleYAxisChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    updateState(props._id, { axis: { x: s.axis.x, y: [value] } });
  };
  console.log(traces);
  return (
    <AppWindow app={props}>
      <>
        <div style={{ position: 'absolute', overflow: 'hidden', width: '400px', maxWidth: props.data.size.width, height: '100%' }}>
          <div className="sideMenu" style={{ left: open ? 0 : '-100%', opacity: open ? 1.0 : 0.0 }}>
            <Button className="closeButton" onClick={() => setOpen(false)} backgroundColor={commonButtonColors} size="sm" mx="1">
              <MdClose color={buttonTextColor} />
            </Button>
            <Grid textAlign="center" templateColumns="repeat(1,1fr)" gap={2}>
              <br />
              <h1>Graph Type</h1>
              <Container>
                <Box borderColor="black" maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden">
                  <Select
                    placeholder={
                      traces.length > 0 ? typeOptions.find((typeOption) => typeOption.value == traces[0].type)?.name : 'Pick a chart type'
                    }
                    onChange={handleTypeChange}
                  >
                    {typeOptions.map((value, index) => {
                      if (value.value == traces[0].type) {
                        //do nothing
                        return null;
                      } else {
                        return (
                          <option value={value.value} key={index}>
                            {value.name}
                          </option>
                        );
                      }
                    })}
                  </Select>
                </Box>
              </Container>
              <h1>X values</h1>
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
                          <option value={attributeName} key={index}>
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
                          <option value={attributeName} key={index}>
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
          <div onClick={() => setOpen(false)}>
            <Plot
              data={traces}
              layout={{ width: props.data.size.width, height: props.data.size.height, title: s.layout.title }}
              config={{ autosizable: true }}
            />
          </div>
        </div>
        <Button position="absolute" backgroundColor={commonButtonColors} size="sm" left="0" top="0" m="5px" onClick={() => setOpen(true)}>
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

  return (
    <>
      <Button colorScheme="green">Action</Button>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
