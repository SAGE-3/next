/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { serverTime, useAppStore, useAssetStore, useUser } from '@sage3/frontend';
import { Box, Button, Text, Input, Menu, MenuButton, MenuItem, MenuList, VStack } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { parse } from 'csv-parse/browser/esm';
import { createCharts } from './components/createCharts';

// Styling
import './styling.css';
import { ChangeEvent, MouseEvent, FormEvent, useEffect, useState } from 'react';
import { debounce } from 'throttle-debounce';
import { useParams } from 'react-router';
import { Asset } from '@sage3/shared/types';
import { genId } from '@sage3/shared';
import createPropertyList from './components/createPropertyList';

export interface CreateChartProps {
  input: string;
  data: Record<string, string>[];
  headers: string[];
}

/* App component for chartMaker */
const messages = [
  {
    id: genId(),
    creationDate: '',
    userName: 'RJ',
    text: "Hello I'm RJ",
  },
  {
    userName: 'Arti',
    text: 'Hello friend, I am Arti, a personal assistant',
  },
  {
    userName: 'Roderick',
    text: 'I just joined the chat',
  },
  {
    userName: 'Arti',
    text: 'Hello Roderick, Would you like me to generate a chart for you?',
  },
  {
    userName: 'RJ',
    text: 'can you show me a bar chart of diabetes and uninsured?',
  },
];
function AppComponent(props: App): JSX.Element {
  const state = props.data.state as AppState;
  const user = useUser();

  const generateChart = async () => {
    const time = await serverTime();
  };

  return (
    <AppWindow app={props}>
      <Box h="full" w="full" bg="white" onClick={generateChart}>
        {messages.map((message, index) => {
          return (
            <Text
              color="black"
              rounded={'md'}
              textAlign={user.user?.data.name == message.userName ? 'right' : 'left'}
              bg={user.user?.data.name == message.userName ? 'cyan' : 'grey'}
            >
              {message.text}
            </Text>
          );
        })}
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app chartMaker */

function ToolbarComponent(props: App): JSX.Element {
  const state = props.data.state as AppState;
  const datasets = useAssetStore((state) => state.assets.filter((file) => file.data.file.split('.').pop() == 'csv'));

  const updateState = useAppStore((state) => state.updateState);

  const createApp = useAppStore((state) => state.create);
  const { user } = useUser();

  // The text of the sticky for React
  const [input, setInput] = useState<string>('');

  //BoardInfo
  const { boardId, roomId } = useParams();
  const [selectedFile, setSelectedFile] = useState<Asset | null>(null);

  const handleChangeFile = (value: Asset) => {
    setSelectedFile(value);
  };
  useEffect(() => {
    if (selectedFile) {
      const localurl = '/api/assets/static/' + selectedFile.data.file;
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
            const firstRow = arr[0];
            // extract the headers and save them
            const headers = Object.keys(arr[0]);
            const propertyList = createPropertyList(arr, headers);
            updateState(props._id, {
              ...state,
              fileName: selectedFile?.data.originalfilename,
              fileReference: selectedFile?.data.file,
              headers: headers,
              dataRow: firstRow,
              propertyList: propertyList,
            });
          });
      }
    }
  }, [selectedFile]);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  const generateChart = (e: FormEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!state.fileName) return;
    try {
      const specifications = createCharts(input, state.dataRow, state.headers, state.fileReference, state.propertyList);
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
      console.log(specifications);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <Menu>
        <MenuButton as={Button}>{state.fileName ? state.fileName : 'Select a Dataset'}</MenuButton>
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
      <Input size="xs" onSubmit={generateChart} value={input} bg="white" color="black" onChange={handleChange} width="400px" />
      <Button size="xs" onClick={generateChart} colorScheme="teal" mx={1}>
        Generate
      </Button>
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
