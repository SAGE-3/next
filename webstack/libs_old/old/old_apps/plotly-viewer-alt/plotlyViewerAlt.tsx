/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: plotlyViewerAlt
 * updated by: Michael Rogers
 */

// Import the React library
import React, { useEffect, useLayoutEffect, useState } from 'react';

// State management functions from SAGE3
import { useSageStateAtom } from '@sage3/frontend/smart-data/hooks';

// Import the props definition for this application
import { plotlyParams, plotlyViewerAltProps } from './metadata';

import Plot from 'react-plotly.js';

import { Select } from '@chakra-ui/select';
import { Box, HStack, Spacer } from '@chakra-ui/layout';
import { MdArrowDropDown } from 'react-icons/md';
import { Collection, DataPane } from '@sage3/frontend/smart-data/layout';

// used for select menu
export type options = [];

// the actual app
export const AppsplotlyViewerAlt = (props: plotlyViewerAltProps): JSX.Element => {

  const fig = useSageStateAtom<plotlyParams>(props.state.Figure);
  const ww = props.position.width-50
  const hh = props.position.height-110

  // loads demo data
  const updateData = (e: React.ChangeEvent<HTMLSelectElement>) => {
    fetch(e.target.value)
    .then((response)=>{
      return response.json();
    })
    .then((data)=>{
      data.layout.width = ww
      data.layout.height = hh
      fig.setData(data)
    })
  };

  // fetch a list of links to plotly demos
  const [mockOptions, setOptions]=useState<options>([]);
  useEffect(()=>{
		fetch('https://api.github.com/repositories/45646037/contents/test/image/mocks')
    .then((response)=>{
      return response.json();
    })
    .then((json)=>
    setOptions(json.map((o: any)=>
    <option key={o.name} value={o.download_url}>{o.name}</option>
    )))
  }, []);

  // resizes plotly to fit window, updates data if changed
  const handleChangeLayout=()=> {
    fig.data.layout.width = ww
    fig.data.layout.height = hh
    fig.setData({...fig.data})
  }

  // calls resize event when layout changes
  useLayoutEffect(()=>{
    handleChangeLayout()
  },[ww,hh])

  return (
    // Main application layout
    <Collection>
      <DataPane {...props.state.Figure}>
        <HStack>
          <Spacer/>
            <Box color='#fff'> {props.state.Figure.reference}</Box>
          <Spacer/>
          <Select
              bg="gray.200"
              w={"50%"}
              icon={<MdArrowDropDown />}
              placeholder="Select demo option" onChange={updateData} variant={'Flushed'}>
              {mockOptions}
          </Select>
        </HStack>
      </DataPane>
      <DataPane {...props.state.Figure}>
        <Plot
          data={fig.data.data}
          layout={fig.data.layout}
          frames={(fig.data.frames) ? fig.data.frames : []}
          config={(fig.data.config) ? fig.data.config : {
            editable: true,
          }}
          useResizeHandler={true}
          onRelayout={handleChangeLayout}
        />
      </DataPane>
    </Collection>
  );
};

export default AppsplotlyViewerAlt;
