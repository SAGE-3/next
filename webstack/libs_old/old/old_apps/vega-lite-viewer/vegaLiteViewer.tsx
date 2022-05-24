/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: vegaLiteViewer
 * created by: roderick
 */

// Import the React library
import React, { useEffect, useState } from 'react';

// Window layout component provided by SAGE3
import { Collection, DataPane } from '@sage3/frontend/smart-data/layout';

// State management functions from SAGE3
import { useSageStateAtom, useSageAssetUrl } from '@sage3/frontend/smart-data/hooks';

// Import the props definition for this application
import { graphData, vegaAxis, vegaLiteSpecs, vegaLiteViewerProps } from './metadata';

//uncomment for table
// import { Table, Thead, Tbody, Tr, Td, Center } from '@chakra-ui/react';
import { Box, Button, Center, CloseButton, Container, Grid, IconButton, Select } from '@chakra-ui/react';

// Import the CSS definitions for this application
import './styling.css';

import { VegaLite, VisualizationSpec } from 'react-vega';
import { FaBars } from 'react-icons/fa';
import { markOptions } from './options';
import { MdInvertColors, MdInvertColorsOff } from 'react-icons/md';

interface axisType {
  x: number;
  y: number;
}

type attributes = {
  name: string;
  value: number;
};

type barDataType = {
  table: { [x: string]: any };
};

type attributesArr = attributes[];

export const AppsvegaLiteViewer = (props: vegaLiteViewerProps): JSX.Element => {
  // Getting basic info about the app
  // console.log('App vegaLiteViewer information>', props.id, props.position);
  const testingData = useSageAssetUrl(props.data.file);
  const { data, setData } = useSageStateAtom<vegaLiteSpecs>(props.state.vegaLiteSpecs);
  const [barData, setBarData] = useState<barDataType>({ table: [] });
  const [open, setOpen] = useState(false);
  const [attributeOptions, setAttributeOptions] = useState<attributesArr>([]);
  const [axis, setAxis] = useState<axisType>({ x: 0, y: 1 });

  const ww = Math.floor(props.position.width);
  const hh = Math.floor(props.position.height);

  useEffect(() => {
    fetch(testingData.data.url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (myJson) {
        console.log(myJson);
        const attributeArr: attributesArr = [];
        if (typeof Object.keys(myJson) !== 'undefined' && Object.keys(myJson).length > 0) {
          Object.keys(myJson[0]).forEach((element, i) => attributeArr.push({ name: element, value: i }));
        }
        setAttributeOptions(attributeArr);
        const table: any[] = [];
        for (let i = 0; i < myJson.length; i++) {
          const row = {
            [attributeArr[axis.x].name]: myJson[i][attributeArr[axis.x].name],
            [attributeArr[axis.y].name]: myJson[i][attributeArr[axis.y].name],
          };
          table.push(row);
        }
        const axisData = {
          x: { field: [attributeArr[axis.x].name].toString(), type: 'ordinal' } as vegaAxis,
          y: { field: [attributeArr[axis.y].name].toString(), type: 'quantitative' } as vegaAxis,
        };
        setData({
          ...data,
          encoding: axisData,
        });
        // x: { field: 'name', type: 'ordinal' } as vegaAxis,
        // y: { field: 'sales', type: 'quantitative' } as vegaAxis,
        setBarData({ table: table });
      });
  }, [axis]);

  useEffect(() => {
    setData({
      ...data,
      width: ww - 115,
      height: hh - 117,
    });
  }, [ww, hh]);

  const handleChangeMark = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setData({
      ...data,
      mark: value,
    });
  };

  const handleGraphColors = () => {
    const encoding = data.encoding;
    setData({
      ...data,
      encoding: {
        ...encoding,
        color: {
          field: [attributeOptions[axis.x].name].toString(),
          scale: {
            range: [`#${Math.floor(Math.random() * 16777215).toString(16)}`, `#${Math.floor(Math.random() * 16777215).toString(16)}`],
          },
        },
      },
    });
  };

  const toggleColor = () => {
    const encodingCP = Object.assign({}, data.encoding);
    delete encodingCP.color;
    setData({
      ...data,
      encoding: encodingCP,
    });
  };

  const handleAxisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setAxis({
      ...axis,
      [e.target.name]: value,
    });
  };
  const capitalize = (s: string) => {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    // Main application layout
    <div>
      <Collection>
        {open ? (
          <div className="sideMenu" style={{ maxWidth: 0.35 * ww }}>
            <CloseButton color="red" className="closeButton" onClick={() => setOpen(false)} />
            <Container textAlign="center">
              <h1>Graph Type</h1>

              <Box borderColor="black" maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden">
                <Select placeholder={capitalize(data.mark) + ' Graph'} onChange={handleChangeMark}>
                  {markOptions.map((value, index) => {
                    return (
                      <option value={value.value} key={index}>
                        {value.name}
                      </option>
                    );
                  })}
                </Select>
              </Box>
              <h1>X values</h1>
              <Box borderColor="black" maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden">
                <Select name="x" placeholder={attributeOptions[axis.x].name} onChange={handleAxisChange}>
                  {attributeOptions.map((value, index) => {
                    return axis.x == index ? null : (
                      <option value={value.value} key={index}>
                        {value.name}
                      </option>
                    );
                  })}
                </Select>
              </Box>
              <h1>Y values</h1>
              <Box borderColor="black" maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden">
                <Select name="y" placeholder={attributeOptions[axis.y].name} onChange={handleAxisChange}>
                  {attributeOptions.map((value, index) => {
                    return axis.y == index ? null : (
                      <option value={value.value} key={index}>
                        {value.name}
                      </option>
                    );
                  })}
                </Select>
              </Box>
              <br />
              <h1>Colors</h1>
              <Grid textAlign="center" templateColumns="repeat(2,1fr)" gap={2}>
                <Box borderColor="black" maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden">
                  <IconButton aria-label="Search database" icon={<MdInvertColors />} onClick={handleGraphColors}>
                    Colors
                  </IconButton>
                </Box>
                <Box borderColor="black" maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden">
                  <IconButton aria-label="Search database" icon={<MdInvertColorsOff />} onClick={toggleColor}>
                    No Colors
                  </IconButton>
                </Box>
              </Grid>
            </Container>
          </div>
        ) : null}
        <div className={open ? 'dimBackground' : undefined} style={open ? { marginLeft: 0.34 * ww } : undefined}>
          <DataPane {...props.state.vegaLiteSpecs}>
            <Button display="flex" alignItems="center" leftIcon={<FaBars />} onClick={() => setOpen(true)} />

            <Center>
              <VegaLite spec={data as VisualizationSpec} data={barData} />
            </Center>
          </DataPane>
        </div>
      </Collection>
    </div>
  );
};

export default AppsvegaLiteViewer;
