/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { serverTime, timeout, useAppStore, useAssetStore, useHexColor, useUser } from '@sage3/frontend';
import {
  Box,
  Button,
  Text,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  VStack,
  HStack,
  useColorModeValue,
  Progress,
} from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { parse } from 'csv-parse/browser/esm';
import { createCharts } from './components/createCharts';

// Styling
import './styling.css';
import { Fragment, ChangeEvent, MouseEvent, FormEvent, useEffect, useState } from 'react';
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

function AppComponent(props: App): JSX.Element {
  const state = props.data.state as AppState;
  const user = useUser();

  //Colors for Dark theme and light theme
  const myColor = useHexColor('blue');
  const artiColor = useHexColor('orange');
  const otherUserColor = useHexColor('gray');
  const bgColor = useColorModeValue('gray.100', 'gray.900');
  const textColor = useColorModeValue('gray.700', 'gray.100');

  //Sort messages by creation date to display in order
  const sortedMessages = state.messages.sort((a, b) => a.creationDate - b.creationDate);

  //Scroll new message into view
  useEffect(() => {
    const messages = document.getElementById(props._id);
    if (messages) messages.scrollTop = messages.scrollHeight;
  }, [state.messages.length]);

  return (
    <AppWindow app={props}>
      {/* Display Messages */}
      <Box h="100%" w="100%" bg={bgColor} overflowX="scroll" id={props._id}>
        {sortedMessages.map((message, index) => {
          const isMe = user.user?._id == message.userId;
          return (
            <Fragment key={index}>
              {/* Start of User Messages */}
              <Box position="relative" my={10}>
                <Text position={'absolute'} top="-15px" right={'15px'} fontWeight="bold" color={textColor}>
                  {message.userName}
                </Text>
                <Box display={'flex'} justifyContent="right">
                  <Box
                    color="white"
                    rounded={'md'}
                    boxShadow="md"
                    textAlign={'right'}
                    bg={isMe ? myColor : otherUserColor}
                    p={2}
                    m={3}
                    fontFamily="arial"
                  >
                    {message.query}
                  </Box>
                </Box>
              </Box>

              {/* Start of Arti Messages */}
              <Box position="relative" my={10}>
                <Text position={'absolute'} top="-15px" left={'15px'} fontWeight="bold" color={textColor}>
                  Arti
                </Text>
                <Box display={'flex'} justifyContent="left">
                  <Box boxShadow="md" color="white" rounded={'md'} textAlign={'left'} bg={artiColor} p={2} m={3} fontFamily="arial">
                    {message.response}
                  </Box>
                </Box>
              </Box>
            </Fragment>
          );
        })}
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app chartMaker */

function ToolbarComponent(props: App): JSX.Element {
  const state = props.data.state as AppState;

  // Load Datasets from asset store
  const datasets = useAssetStore((state) => state.assets.filter((file) => file.data.file.split('.').pop() == 'csv'));

  const updateState = useAppStore((state) => state.updateState);

  // Create Vega-Lite Viewer app
  const createApp = useAppStore((state) => state.create);
  const { user } = useUser();

  // Input text for query
  const [input, setInput] = useState<string>('');

  // BoardInfo
  const { boardId, roomId } = useParams();
  const [selectedFile, setSelectedFile] = useState<Asset | null>(null);

  // Processing
  const [processing, setProcessing] = useState(false);

  // Handler for changing dataset to make charts for
  const handleChangeFile = (value: Asset) => {
    setSelectedFile(value);
  };

  useEffect(() => {
    if (selectedFile) {
      const localurl = '/api/assets/static/' + selectedFile.data.file;
      if (localurl) {
        // Fetch dataset from asset store
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

            // Only generate unique filter values to store in database
            // Note: I am NOT storing the entire CSV in database
            const propertyList = createPropertyList(arr, headers);
            const time = await serverTime();
            console.log(propertyList);
            updateState(props._id, {
              ...state,
              fileName: selectedFile?.data.originalfilename,
              fileReference: selectedFile?.data.file,
              headers: headers,
              dataRow: firstRow,
              propertyList: propertyList,
              messages: [
                ...state.messages,
                {
                  id: genId(),
                  userId: user?._id,
                  creationId: '',
                  creationDate: time.epoch,
                  userName: user?.data.name,
                  query: `Hi Arti, I'm ready to generate some charts!`,
                  response: `Hi ${user?.data.name}`,
                },
              ],
            });
          });
      }
    }
  }, [selectedFile]);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  // Generating chart from user input
  const generateChart = async (e: FormEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // To slow down UI
    setProcessing(true);
    await timeout(1000);

    // get servertime
    const time = await serverTime();
    if (!state.fileName) return;
    try {
      // Create array vega-lite Specifications
      const specifications = createCharts(input, state.dataRow, state.headers, state.fileReference, state.propertyList);
      if (!user) return;

      for (let i = 0; i < specifications.length; i++) {
        // Create App for each specification
        const app = await createApp({
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

        // Add messages
        updateState(props._id, {
          ...state,
          messages: [
            ...state.messages,
            {
              id: genId(),
              userId: user._id,
              creationId: app.data._id,
              creationDate: time.epoch,
              userName: user?.data.name,
              query: input,
              response: 'I made a ' + specifications[i].title,
            },
          ],
        });
      }
      setProcessing(false);
      console.log(specifications);
    } catch (e) {
      // For now, throwing errors to help with responses.
      // TODO: need to change to send errmessages instead
      updateState(props._id, {
        ...state,
        messages: [
          ...state.messages,
          {
            id: genId(),
            userId: user?._id,
            creationId: null,
            creationDate: time.epoch,
            userName: user?.data.name,
            query: input,
            response: e,
          },
        ],
      });
      setProcessing(false);
    }
  };

  return (
    <>
      <Menu>
        <MenuButton size="sm" as={Button}>
          {state.fileName ? state.fileName : 'Select a Dataset'}
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
      {processing ? (
        <Progress hasStripe isIndeterminate width="450px" mx="2" borderRadius="md" />
      ) : (
        <>
          <Input size="xs" onSubmit={generateChart} value={input} bg="white" color="black" onChange={handleChange} width="400px" />
          <Button size="xs" onClick={generateChart} colorScheme="teal" mx={1} disabled={state.fileName.length === 0}>
            Generate
          </Button>
        </>
      )}
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
