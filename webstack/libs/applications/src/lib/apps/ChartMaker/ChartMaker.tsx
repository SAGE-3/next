/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React
import { Fragment, ChangeEvent, MouseEvent, FormEvent, useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'react-router';
// Chakra UI
import { Box, Button, Text, Input, useColorModeValue, Progress } from '@chakra-ui/react';
// Libraries
import { parse } from 'csv-parse/browser/esm';
// SAGE3
import { apiUrls, serverTime, timeout, useAppStore, useAssetStore, useHexColor, useUser } from '@sage3/frontend';
import { genId } from '@sage3/shared';
// App
import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { SensorTypes, stationDataTemplate } from '../SensorOverview/data/stationData';

// Styling
import './styling.css';

type NLPRequestResponse = {
  success: boolean;
  message: string;
};
export async function NLPHTTPRequest(message: string): Promise<NLPRequestResponse> {
  const response = await fetch(apiUrls.misc.nlp, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });
  return (await response.json()) as NLPRequestResponse;
}

function getDateString(epoch: number): string {
  const date = new Date(epoch).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  const time = new Date(epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${date} - ${time}`;
}

export interface CreateChartProps {
  input: string;
  data: Record<string, string>[];
  headers: string[];
}

const AIDialogue = [
  { text: 'Hi, would you like to access the Hawaii Climate Data Portal? Use the app toolbar to respond.' },
  {
    text: 'Excellent. I’ve created a map for you to select the stations that you are interested in. To select a station, click on the orange markers in the map. A selected station will turn into a blue marker.',
  },
  { text: 'Great, You have selected the stations' },
  {
    text: 'Great! Now we can start making some charts. I’ve created a list of weather data that these stations are measuring. Please select the data that you are interested in. Alternatively, you can tell me what you are interested in and I can select them for you.',
  },
];

function AppComponent(props: App): JSX.Element {
  const state = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const user = useUser();

  //Colors for Dark theme and light theme
  const myColor = useHexColor('blue');
  const artiColor = useHexColor('purple');
  const otherUserColor = useHexColor('gray');
  const bgColor = useColorModeValue('gray.100', 'gray.900');
  const sc = useColorModeValue('gray.400', 'gray.200');
  const scrollColor = useHexColor(sc);
  const textColor = useColorModeValue('gray.700', 'gray.100');

  //Sort messages by creation date to display in order
  const sortedMessages = state.messages ? state.messages.sort((a, b) => a.creationDate - b.creationDate) : [];

  const chatBox = useRef<null | HTMLDivElement>(null);

  //Scroll new message into view
  useEffect(() => {
    if (chatBox.current) {
      // if (messages) messages.scrollTop = messages.scrollHeight;

      chatBox.current.scrollTop = chatBox.current.scrollHeight;
    }
  }, [state.messages.length, chatBox]);

  return (
    <AppWindow app={props}>
      {/* Display Messages */}
      <Box
        h="100%"
        w="100%"
        bg={bgColor}
        overflowY="scroll"
        ref={chatBox}
        css={{
          '&::-webkit-scrollbar': {
            width: '12px',
          },
          '&::-webkit-scrollbar-track': {
            WebkitBoxShadow: 'inset 0 0 6px rgba(0,0,0,0.00)',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: `${scrollColor}`,
            borderRadius: '6px',
            outline: `3px solid ${bgColor}`,
          },
        }}
      >
        {sortedMessages.map((message, index) => {
          const isMe = user.user?._id == message.userId;
          const time = getDateString(message.creationDate);
          return (
            <Fragment key={index}>
              {/* Start of User Messages */}
              {message.query.length ? (
                <Box position="relative" my={10}>
                  <Box top="-30px" right={'15px'} position={'absolute'} textAlign="right">
                    <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="sm">
                      {message.userName}
                    </Text>
                    <Text whiteSpace={'nowrap'} textOverflow="ellipsis" color={textColor} fontSize="xs">
                      {time}
                    </Text>
                  </Box>

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
                      maxWidth="70%"
                    >
                      {message.query}
                    </Box>
                  </Box>
                </Box>
              ) : null}

              {/* Start of Arti Messages */}
              <Box position="relative" my={10} maxWidth={'70%'}>
                <Box top="-30px" left={'15px'} position={'absolute'} textAlign="left">
                  <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="sm">
                    Arti
                  </Text>
                  <Text whiteSpace={'nowrap'} textOverflow="ellipsis" color={textColor} fontSize="xs">
                    {time}
                  </Text>
                </Box>

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
  const assets = useAssetStore((state) => state.assets);

  const datasets = useMemo(
    () =>
      assets.filter((file) => {
        return file.data.mimetype === 'text/csv';
      }),
    [assets]
  );

  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);

  // Create Vega-Lite Viewer app
  const createApp = useAppStore((state) => state.create);
  const deleteApp = useAppStore((state) => state.delete);
  const fetchBoardApps = useAppStore((state) => state.fetchBoardApps);
  const { user } = useUser();

  // Input text for query
  const [input, setInput] = useState<string>('');

  // BoardInfo
  const { boardId, roomId } = useParams();

  // Processing
  const [processing, setProcessing] = useState(false);
  const [selectedStations, setSelectedStations] = useState<SensorTypes[]>([]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };
  // Generating chart from user input
  const generateChart = async (e?: FormEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => {
    if (e) e.preventDefault();

    // // To slow down UI
    setProcessing(true);
    await timeout(1000);

    // get servertime
    const time = await serverTime();

    if (!user) return;
    // Create App for each specification
    const app = await createApp({
      title: 'EChartsViewer',
      roomId: roomId!,
      boardId: boardId!,
      position: { x: props.data.position.x + props.data.size.width * 1 + 20, y: props.data.position.y, z: 0 },
      size: { width: 1000, height: 1000, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'EChartsViewer',
      state: {
        stationName: ['017HI'],
        chartType: 'line',
        yAxisAttributes: ['soil_moisture_set_1'],
        xAxisAttributes: ['date_time'],
        transform: [],
        options: {},
      },
      raised: true,
      dragging: false,
      pinned: false,
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
          response: 'I made a chart for you!',
        },
      ],
    });

    setProcessing(false);
  };
  const handleStory = async () => {
    // // To slow down UI
    setProcessing(true);
    await timeout(1000);

    // get servertime
    const time = await serverTime();
    let currentStoryIndex = state.storyIndex;

    if (!user) return;

    if (input == 'yes') {
      currentStoryIndex++;
      let listOfSelectedStationsAsString = '';
      switch (currentStoryIndex) {
        case 0:
          break;
        case 1:
          {
            // Create App for each specification
            const app = await createApp({
              title: 'Hawaii Mesonet',
              roomId: roomId!,
              boardId: boardId!,
              position: { x: props.data.position.x + props.data.size.width * 1 + 20, y: props.data.position.y, z: 0 },
              size: { width: 1000, height: 1000, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'Hawaii Mesonet',
              state: {
                location: [21.297, -157.816],
                zoom: 8,
                baseLayer: 'OpenStreetMap',
                overlay: true,
                appIdsICreated: [],
                fontSizeMultiplier: 15,
                variableToDisplay: 'temperatureC',
                stationData: [...stationDataTemplate],
              },
              raised: true,
              dragging: false,
              pinned: false,
            });
            // Add messages
            updateState(props._id, {
              ...state,
              storyIndex: state.storyIndex + 1,
              currentAppCreated: app,
              messages: [
                ...state.messages,
                {
                  id: genId(),
                  userId: user._id,
                  creationId: '',
                  creationDate: time.epoch,
                  userName: user?.data.name,
                  query: input,
                  response: AIDialogue[currentStoryIndex].text,
                },
              ],
            });
          }
          break;
        case 2:
          {
            const apps = await fetchBoardApps(props.data.boardId);
            let tmpApp;
            if (apps)
              for (let i = 0; i < apps.length; i++) {
                if (apps[i]._id == state.currentAppCreated.data._id) {
                  tmpApp = apps[i];
                }
              }
            if (tmpApp) {
              const stationData = tmpApp.data.state.stationData;
              const tmpSelectedStations = [];
              for (let i = 0; i < stationData.length; i++) {
                if (stationData[i].selected) {
                  tmpSelectedStations.push(stationData[i]);
                  listOfSelectedStationsAsString += ' ' + stationData[i].name;
                }
              }
              setSelectedStations(tmpSelectedStations);
              deleteApp(state.currentAppCreated.data._id);
              // Add messages
              updateState(props._id, {
                ...state,
                storyIndex: state.storyIndex + 1,
                currentAppCreated: null,
                messages: [
                  ...state.messages,

                  {
                    id: genId(),
                    userId: user._id,
                    creationId: '',
                    creationDate: time.epoch,
                    userName: user?.data.name,
                    query: input,
                    response:
                      AIDialogue[currentStoryIndex].text +
                      listOfSelectedStationsAsString +
                      '. Is this correct? or would you like to select more stations?',
                  },
                ],
              });
            }
          }
          break;
        case 3:
          {
            const listOfStationNames = [];
            for (let i = 0; i < selectedStations.length; i++) {
              listOfStationNames.push(selectedStations[i].name);
            }
            updateState(props._id, {
              ...state,
              storyIndex: state.storyIndex + 1,
              currentAppCreated: null,
              messages: [
                ...state.messages,
                {
                  id: genId(),
                  userId: user._id,
                  creationId: '',
                  creationDate: time.epoch,
                  userName: user?.data.name,
                  query: input,
                  response: AIDialogue[currentStoryIndex].text,
                },
              ],
            });
            createApp({
              title: 'Hawaii Mesonet',
              roomId: roomId!,
              boardId: boardId!,
              position: { x: props.data.position.x + props.data.size.width * 1 + 20, y: props.data.position.y, z: 0 },
              size: { width: 1000, height: 1000, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'Hawaii Mesonet',
              state: {
                listOfStationNames: listOfStationNames,
              },
              raised: true,
              dragging: false,
              pinned: false,
            });
          }
          break;
        case 4:
          break;
        default:
          break;
      }
    }

    setProcessing(false);
  };

  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      handleStory();
      // generateChart();
    }
  };

  return (
    <>
      {processing ? (
        <Progress hasStripe isIndeterminate width="450px" mx="2" borderRadius="md" />
      ) : (
        <>
          <Input
            maxWidth={'15rem'}
            size="xs"
            value={input}
            bg="white"
            color="black"
            onChange={handleChange}
            onKeyDown={onSubmit}
            width="300px"
          />
          <Button size="xs" onClick={generateChart} colorScheme="teal" mx={1} disabled={state.fileName.length === 0}>
            Generate
          </Button>
          <Button
            size="xs"
            onClick={() => {
              createApp({
                title: 'Hawaii Mesonet',
                roomId: roomId!,
                boardId: boardId!,
                position: { x: props.data.position.x + props.data.size.width * 1 + 20, y: props.data.position.y, z: 0 },
                size: { width: 1000, height: 1000, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'Hawaii Mesonet',
                state: {
                  listOfStationNames: ['001HI', '002HI', '001HI', '009HI'],
                },
                raised: true,
                dragging: false,
                pinned: false,
              });
            }}
            colorScheme="teal"
            mx={1}
            disabled={state.fileName.length === 0}
          >
            Test
          </Button>
          <Button
            size="xs"
            onClick={() => {
              updateState('523207b0-12b2-449b-ad29-0299da0d51ca', { listOfStationNames: ['003HI'] });
            }}
            colorScheme="teal"
            mx={1}
            disabled={state.fileName.length === 0}
          >
            Test2
          </Button>
        </>
      )}
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

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
