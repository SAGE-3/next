/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore, useAssetStore, useUser } from '@sage3/frontend';
import { Box, Button, IconButton, Input, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { parse } from 'csv-parse/browser/esm';
import { createCharts } from './components/createCharts';

// Styling
import './styling.css';
import {
  ChangeEvent,
  MouseEvent,
  FormEvent,
  FormEventHandler,
  ReactEventHandler,
  useEffect,
  useRef,
  useState,
  SyntheticEvent,
} from 'react';
import { debounce } from 'throttle-debounce';
import { useParams } from 'react-router';
import { Asset } from '@sage3/shared/types';

export interface CreateChartProps {
  input: string;
  data: Record<string, string>[];
  headers: string[];
}

/* App component for chartMaker */

function AppComponent(props: App): JSX.Element {
  const state = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const datasets = useAssetStore((state) => state.assets.filter((file) => file.data.file.split('.').pop() == 'csv'));

  const handleChangeFile = (value: Asset) => {
    if (!value) {
      updateState(props._id, { ...state, file: value });
    } else {
      updateState(props._id, { ...state, file: value });
    }
  };

  return (
    <AppWindow app={props}>
      <Box display="flex" flexDir="column" justifyContent={'center'} alignContent="center" height="100%" width="100%">
        <Box width="100%" my="2" display="flex" justifyContent={'center'}>
          <Box bg="orange" w="90%" height="100%">
            hello
          </Box>
        </Box>
        <Box width="100%" my="2" display="flex" justifyContent={'center'}>
          <Menu>
            <MenuButton as={Button}>
              {state.file?.data.originalfilename ? state.file?.data.originalfilename : 'Select a Dataset'}
            </MenuButton>
            <MenuList>
              {datasets.map((dataset, index) => {
                return (
                  <MenuItem onClick={() => handleChangeFile(dataset)} key={index} value={dataset.data.file}>
                    {dataset.data.originalfilename}
                  </MenuItem>
                );
              })}
            </MenuList>
          </Menu>
        </Box>
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app chartMaker */

function ToolbarComponent(props: App): JSX.Element {
  const state = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const [data, setData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  const createApp = useAppStore((state) => state.create);
  const { user } = useUser();

  // The text of the sticky for React
  const [input, setInput] = useState(state.input);

  //BoardInfo
  const { boardId, roomId } = useParams();

  // Update local value with value from the server
  useEffect(() => {
    setInput(state.input);
  }, [state.input]);

  useEffect(() => {
    if (state.file) {
      const localurl = '/api/assets/static/' + state.file?.data.file;
      if (localurl) {
        fetch(localurl, {
          headers: {
            'Content-Type': 'text/csv',
            Accept: 'text/csv',
          },
        })
          .then(function (response) {
            return response.text();
          })
          .then(async function (text) {
            // Convert the csv to an array
            const arr = await csvToArray(text);
            // save the data
            setData(arr);
            // extract the headers and save them
            const headers = Object.keys(arr[0]);
            setHeaders(headers);
          });
      }
    }
  }, [state.file?.data.originalfilename]);

  // Saving the text after 1sec of inactivity
  const debounceSave = debounce(1000, (val) => {
    console.log('debounce');
    updateState(props._id, { input: val });
  });

  // Keep a copy of the function
  const debounceFunc = useRef(debounceSave);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setInput(text);
    debounceFunc.current(text);
  };
  const generateChart = (e: FormEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!state.file?.data.originalfilename) return;
    try {
      const specifications = createCharts(input, data, headers, state.file?.data.file);
      if (!user) return;
      for (let i = 0; i < specifications.length; i++) {
        createApp({
          title: 'VegaLiteViewer',
          roomId: roomId!,
          boardId: boardId!,
          position: { x: props.data.position.x + props.data.size.width * (i + 1) + 20, y: props.data.position.y, z: 0 },
          size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          type: 'VegaLiteViewer',
          state: {
            spec: JSON.stringify(specifications[i]),
          },
          raised: true,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <>
      <Box width="100%" my="2" display="flex" justifyContent={'center'}>
        <Input onSubmit={generateChart} value={input} bg="white" color="black" onChange={handleChange} width="400px" />
        <Button onClick={generateChart} disabled={state.file ? false : true} colorScheme="teal" mx="2">
          Generate
        </Button>
      </Box>
      <Button colorScheme="green" size="xs">
        Action
      </Button>
    </>
  );
}

export default { AppComponent, ToolbarComponent };

// Convert the csv to an array using the csv-parse library
async function csvToArray(str: string): Promise<Record<string, string>[]> {
  // use the csv parser library to parse the csv
  return new Promise((resolve) => {
    parse(
      str,
      {
        relax_quotes: true,
        columns: true,
        skip_empty_lines: true,
        rtrim: true,
        trim: true,
        // delimiter: ",",
      },
      function (err, records) {
        const data = records as Record<string, string>[];
        // return the array
        return resolve(data);
      }
    );
  });
}
