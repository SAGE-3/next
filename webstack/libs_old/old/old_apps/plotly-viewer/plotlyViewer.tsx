/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: plotlyViewer
 * created by: Roderick
 */

// Import the React library
import React, { useEffect, useState } from 'react';

// Window layout component provided by SAGE3
import { Collection, DataPane } from '@sage3/frontend/smart-data/layout';

// State management functions from SAGE3
import { useSageStateAtom, useSageAssetUrl } from '@sage3/frontend/smart-data/hooks';

// Import the props definition for this application
import { plotlyLayout, plotlyType, plotlyViewerProps } from './metadata';
import Plot from 'react-plotly.js';
import { typeOptions } from './plotlyOptions';

// Import the CSS definitions for this application
import './styling.css';

//todo: Remove when table view is made
// import { Table, Thead, Tr, Tbody, Td, Button, CloseButton, Grid, GridItem, Center, Select } from '@chakra-ui/react';

import { Box, Button, CloseButton, Container, Grid, Select } from '@chakra-ui/react';
import { graphData } from '../vega-lite-viewer/metadata';
import { FaBars } from 'react-icons/fa';
import { Data } from 'plotly.js';

export type attribute = {
  name: string;
  value: number;
};

export type attributes = attribute[];

interface axisType {
  x: number;
  y: number;
}

export const AppsplotlyViewer = (props: plotlyViewerProps): JSX.Element => {
  const testingData = useSageAssetUrl(props.data.file);

  //todo: Remove when table view is made
  // const [tableData, setTableData] = useState<tableData>([]);
  // const [columns, setColumns] = useState([]);
  const [attributeOptions, setAttributeOptions] = useState<attributes>([]);

  const layout = useSageStateAtom<plotlyLayout>(props.state.layout);
  const data = useSageStateAtom<plotlyType>(props.state.data);

  const [open, setOpen] = useState(false);

  const ww = Math.floor(props.position.width);
  const hh = Math.floor(props.position.height);

  const [axis, setAxis] = useState<axisType>({
    x: 0,
    y: 1,
  });

  useEffect(() => {
    layout.setData({
      ...layout.data,
      width: ww - 50,
      height: hh - 80,
    });
  }, [ww, hh, layout]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    data.setData({
      ...data.data,
      type: value,
    });
  };
  const handleChangeLayout = () => {
    layout.setData({
      ...layout.data,
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
    <Collection>
      {open ? (
        <div className="sideMenu" style={open ? { width: 0.35 * ww } : undefined}>
          <CloseButton color="red" className="closeButton" onClick={() => setOpen(false)} />
          <Grid textAlign="center" templateColumns="repeat(1,1fr)" gap={2}>
            <h1>Graph Type</h1>
            <Container>
              <Box borderColor="black" maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden">
                <Select placeholder={capitalize(data.data.type)} onChange={handleTypeChange}>
                  {typeOptions.map((value, index) => {
                    return value.value === data.data.type ? null : (
                      <option value={value.value} key={index}>
                        {value.name}
                      </option>
                    );
                  })}
                </Select>
              </Box>
            </Container>
            <h1>X values</h1>
            <Container>
              <Box borderColor="black" maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden">
                <Select name="x" placeholder={attributeOptions[axis.x].name} onChange={handleAxisChange}>
                  {attributeOptions.map((value: attribute, index) => {
                    return axis.x == index ? null : (
                      <option value={value.value} key={index}>
                        {value.name}
                      </option>
                    );
                  })}
                </Select>
              </Box>
            </Container>
            <h1>Y values</h1>
            <Container>
              <Box borderColor="black" maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden">
                <Select name="y" placeholder={attributeOptions[axis.x].name} onChange={handleAxisChange}>
                  {attributeOptions.map((value: attribute, index) => {
                    return axis.y == index ? null : (
                      <option value={value.value} key={index}>
                        {value.name}
                      </option>
                    );
                  })}
                </Select>
              </Box>
            </Container>
          </Grid>
        </div>
      ) : null}
      <div className={open ? 'dimBackground' : undefined} style={open ? { marginLeft: 0.34 * ww } : undefined}>
        <DataPane {...props.state.layout}>
          <Button display="flex" alignItems="center" leftIcon={<FaBars />} onClick={() => setOpen(true)} />
          <div onClick={() => setOpen(false)}>
            <Plot
              data={[data.data] as Data[]}
              layout={layout.data}
              useResizeHandler={true}
              onRelayout={handleChangeLayout}
              config={{ editable: true }}
            />
          </div>
        </DataPane>
      </div>
    </Collection>
  );
};

export default AppsplotlyViewer;
