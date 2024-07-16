/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useEffect, Key } from 'react';
import ReactDOM from 'react-dom';
import {
  ButtonGroup,
  Button,
  Box,
  Image,
  Input,
  useDisclosure,
  useColorMode,
  WrapItem,
  Wrap,
  IconButton,
  Center,
  VStack,
  HStack,
} from '@chakra-ui/react';
import vegaEmbed from 'vega-embed';
import { ArticulateAPI, ConfirmModal, useThrottleApps, useUIStore } from '@sage3/frontend';

// OpenAI API v4
import OpenAI from 'openai';

import { useAppStore, useUser, serverTime } from '@sage3/frontend';
import { genId } from '@sage3/shared';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

import mute from './arti_images/mute.gif';
import talking from './arti_images/talking.gif';
import thinking from './arti_images/thinking.gif';
import idle from './arti_images/idle.gif';
import attentive from './arti_images/attentive.gif';
import EChartsViewer from './EChartsViewer/EChartsViewer';
import { processStations } from './utils';
import { EChartsCoreOption } from 'echarts';
import { useAudio } from '@sage3/frontend';

import './styling.css';

import MapGL from './MapGL';
import { MdClose } from 'react-icons/md';

const fileName = 'test';

function convertObjectToArray(dataObject: any) {
  const keys = Object.keys(dataObject);
  const length = dataObject[keys[0]].length;
  const dataArray = [];

  for (let i = 0; i < length; i++) {
    const record: any = {};
    keys.forEach((key) => {
      record[key] = dataObject[key][i];
    });
    dataArray.push(record);
  }
  return dataArray;
}

function generateRandomNumber() {
  return Math.floor(Math.random() * 10001);
}

function getCurrentTime() {
  return new Date().toTimeString();
}

function getCode(jsonInput: string) {
  // Remove the ```json and ``` characters
  const cleanJson = jsonInput
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .replace('url', 'values')
    // .replace('"data.json"', '`${data}`')
    .trim();
  return cleanJson;
}

type InteractionLogChartsSelected = {
  chart: EChartsCoreOption;
  timeSelected: string[];
  timeDeleted: string[];
  numberOfTimesClicked: number;
};

/* App component for Chat */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const { user } = useUser();

  const [data, setData] = useState({});
  const { colorMode } = useColorMode();

  // Input text for query
  const [input, setInput] = useState<string>('');

  // Processing
  const [processing, setProcessing] = useState(false);
  const apps = useThrottleApps(250);

  const [previousQuestion, setPreviousQuestion] = useState<string>(s.previousQ);
  const [previousAnswer, setPreviousAnswer] = useState<string>(s.previousA);

  const chatBox = useRef<null | HTMLDivElement>(null);

  const createApp = useAppStore((state) => state.create);

  const [artiState, setArtiState] = useState(idle);
  const selectedAppId = useUIStore((state) => state.selectedAppId);

  const [hoveredChart, setHoveredChart] = useState<EChartsCoreOption | null>(null);
  const [chartOptions, setChartOptions] = useState(s.chartsCreated);
  const { startRecording, stopRecording, finalText, isRecording, isNoise } = useAudio({ silenceDuration: 1500, silenceThreshold: 0.2 });
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [interactionContext, setInteractionContext] = useState<{
    lastChartsInteracted: string[];
    lastChartsGenerated: string[];
    lastChartsSelected: string[];
  }>({ lastChartsInteracted: [], lastChartsGenerated: [], lastChartsSelected: [] });
  const [isControlOn, setIsControlOn] = useState(false);

  // UI store
  const setZoom = useUIStore((state) => state.setScale);
  const moveToBoardPosition = useUIStore((state) => state.setBoardPosition);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);
  const x = Math.floor(-boardPosition.x + window.innerWidth / 2 / scale - 200);
  const y = Math.floor(-boardPosition.y + window.innerHeight / 2 / scale - 200);

  const [selectedChartIds, setSelectedChartIds] = useState<any>(new Set());
  const [appCounterID, setAppCounterID] = useState<number>(0);
  const [mostRecentChartIDs, setMostRecentChartIDs] = useState<number[]>([]);
  const [latestResponse, setLatestResponse] = useState<string>('This is my latest response');

  const [log, setLog] = useState<any>({
    chartsThatWereGenerated: [],
    chartsThatWereSelected: [],
  });

  function showSpeechBubble(message: string) {
    const speechBubble = document.getElementById('speechBubble');
    const speechBubble2 = document.getElementById('speechBubble2');
    if (speechBubble) {
      speechBubble.innerHTML = '<p>' + message + '</p>';

      // Show speech bubble
      speechBubble.style.display = 'block';
      setTimeout(function () {
        // Fade out after 3 seconds
        speechBubble.style.opacity = '1';
        setTimeout(function () {
          speechBubble.style.opacity = '0';
        }, 15000);
      }, 100); // Delay before showing
    }
    if (speechBubble2) {
      speechBubble2.innerHTML = '<p>' + message + '</p>';

      // Show speech bubble
      speechBubble2.style.display = 'block';
      setTimeout(function () {
        // Fade out after 3 seconds
        speechBubble2.style.opacity = '1';
        setTimeout(function () {
          speechBubble2.style.opacity = '0';
        }, 15000);
      }, 100); // Delay before showing
    }
    setLatestResponse(message);
  }

  // Sort messages by creation date to display in order

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  useEffect(() => {
    if (finalText.trim().length > 1) {
      send(finalText);
    } else {
      console.log('empty');
    }
  }, [finalText]);

  const writeLog = async () => {
    await ArticulateAPI.sendLog(log, fileName);
    //alert
    alert('Log saved!');
  };

  useEffect(() => {
    const fetchData = async () => {
      let tmpStationMetadata: any = [];
      let url = '';
      url = `https://api.mesowest.net/v2/stations/timeseries?STID=017HI&showemptystations=1&start=202401181356&end=202401191356&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`;
      try {
        const response = await fetch(url);
        const sensor = await response.json();

        if (sensor) {
          const sensorData = sensor['STATION'];
          tmpStationMetadata = sensorData;
        }
        const tmpData = convertObjectToArray(tmpStationMetadata[0].OBSERVATIONS);
        setData(tmpData);
      } catch (error) {
        console.log('Error in 1');
        console.log(error);
      }
    };
    fetchData();
  }, []);

  // Input text for query
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      e.preventDefault();
      send(input);
    }
  };
  const send = async (text: string) => {
    console.log('I am sending');
    await newMessage(text.trim());
    setInput('');
  };

  // Update from server
  useEffect(() => {
    setPreviousQuestion(s.previousQ);
  }, [s.previousQ]);
  useEffect(() => {
    setPreviousAnswer(s.previousA);
  }, [s.previousA]);

  useEffect(() => {
    if (s.context) {
      const ctx = `@G I want to ask questions about this topic: ${s.context}`;
      newMessage(ctx);
      setInput('');
    }
  }, [s.context]);

  const getChart = async (request: string, response: any) => {
    setProcessing(true);

    const chartResponse = await ArticulateAPI.sendCommand(request, interactionContext, response.toString());
    console.log(chartResponse);
    if (!chartResponse) {
      //do nothing
    } else {
      if (Object.keys(chartResponse).length == 0) {
        showSpeechBubble(`I tried making a chart for you but something went wrong."`);
      } else {
        const tmpChartOptions: EChartsCoreOption[] = await processStations(chartResponse['station_chart_info'], colorMode, props.data.size);
        const chartTitles = [];
        const tmpMostRecentChartIDs: number[] = [];
        for (let i = 0; i < tmpChartOptions.length; i++) {
          chartTitles.push((tmpChartOptions[i] as any).title.text);
          tmpChartOptions[i].id = appCounterID + i;
          tmpMostRecentChartIDs.push(appCounterID + i);
        }
        chartResponse['debug']['utteranceType'] = response;
        if (tmpChartOptions.length > 0) {
          if (response == 3 || response == 2) {
            showSpeechBubble(
              `Based on your interaction, I think this chart would be helpful. \n\n ${chartResponse['debug']['summarizedResponse'][0]}`
            );
          } else {
            showSpeechBubble(
              `I generated ${tmpChartOptions.length} charts for your request: "${request}" \n\n ${chartResponse['debug']['summarizedResponse'][0]}`
            );
          }

          const audio = new Audio('https://github.com/Tabalbar/articulate-plus/raw/dev/263128__pan14__tone-beep-amb-verb.wav');
          audio.play();
          setLog({
            ...log,
            chartsThatWereGenerated: [
              ...log.chartsThatWereGenerated,
              { chartOptions: [...tmpChartOptions], chartInformation: chartResponse['debug'] },
            ],
          });
          setAppCounterID((prev: number) => prev + tmpChartOptions.length);
          setInteractionContext({
            ...interactionContext,
            lastChartsGenerated: [...interactionContext.lastChartsGenerated, ...chartTitles].slice(-5), // Keep only the last 5 chart titles
          });
          setChartOptions((prev: EChartsCoreOption[]) => [...prev, ...tmpChartOptions]);
          setMostRecentChartIDs(tmpMostRecentChartIDs);
        } else {
          showSpeechBubble(`I tried making a chart for you but something went wrong. Try asking again!`);
        }
      }
    }
    setProcessing(false);
    return;
  };

  const newMessage = async (new_input: string) => {
    if (!user) return;
    // Get server time
    const now = await serverTime();
    // Is it a question to Geppetto?

    // Add messages
    const initialAnswer = {
      id: genId(),
      userId: user._id,
      creationId: '',
      creationDate: now.epoch,
      userName: name,
      query: new_input,
      response: 'Working on it...',
    };
    updateState(props._id, { ...s, messages: [...s.messages, initialAnswer] });

    const request = new_input;

    //make fetch call here with request
    const response = await ArticulateAPI.sendText(request);
    let isCommand = false;
    if (isControlOn) {
      if (response == 0) {
        isCommand = true;
      }
    } else {
      if (response == 0 || response == 2) {
        isCommand = true;
      }
    }
    if (isCommand) {
      await getChart(request, response);
    }
  };

  useEffect(() => {
    const divElement = document.getElementById('scrollable');
    if (divElement) {
      divElement.scrollTop = divElement.scrollHeight;
    }
  }, [chartOptions]);

  // Wait for new messages to scroll to the bottom
  useEffect(() => {
    if (!isRecording) {
      setArtiState(mute);
    } else {
      if (!processing) {
        if (isNoise.current) {
          setArtiState(attentive);
        } else {
          setArtiState(idle);
        }
      } else if (processing) {
        setArtiState(thinking);
      }
    }
  }, [processing, isRecording, isNoise.current]);

  useEffect(() => {}, []);

  useEffect(() => {
    // Remove IDs of deleted apps from the selectedChartIds set
    setSelectedChartIds((prevApps: Set<unknown>) => {
      const newIds = new Set(prevApps);
      const appIds = new Set(
        apps.map((app) => {
          if (app.data.type == 'EChartsViewer') {
            return app.data.state.options.id;
          }
        })
      );
      prevApps.forEach((app: any) => {
        if (!appIds.has(app.chartId)) {
          setLog({
            ...log,
            chartsThatWereSelected: [...log.chartsThatWereSelected, { action: 'delete', chartId: app.chartId, time: getCurrentTime() }],
          });
          newIds.delete(app);
        }
      });
      return newIds;
    });
  }, [apps]);

  const generateChart = async (EChartOption: EChartsCoreOption) => {
    EChartOption.title = {
      //@ts-ignore
      ...EChartOption.title,
      textStyle: { fontSize: 30 },
    };
    console.log(EChartOption);
    const app = await createApp({
      title: 'EChartsViewer',
      roomId: props.data.roomId!,
      boardId: props.data.boardId!,
      //TODO get middle of the screen space
      position: {
        x: x,
        y: y,
        z: 0,
      },
      size: {
        width: 1500,
        height: 600,
        depth: 0,
      },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'EChartsViewer',
      state: {
        options: EChartOption,
      },

      raised: true,
      dragging: false,
      pinned: false,
    });
    if (!isControlOn) {
      setTimeout(() => {
        //@ts-ignore
        getChart(EChartOption.title.text, 3);
      }, generateRandomNumber());
    }

    setSelectedChartIds((prevIds: Iterable<unknown> | null | undefined) => {
      const newIds = new Set(prevIds);
      newIds.add({ chartId: EChartOption.id, appId: app.data._id });
      return newIds;
    });
    setHoveredChart(null);
    setLog({
      ...log,
      chartsThatWereSelected: [
        ...log.chartsThatWereSelected,
        { action: 'add', chartId: EChartOption.id, appId: app.data._id, time: getCurrentTime() },
      ],
    });
    setInteractionContext({
      ...interactionContext,
      lastChartsSelected: [...interactionContext.lastChartsSelected, (EChartOption as any).title.text].slice(-5), // Keep only the last 5 chart titles
    });
  };

  useEffect(() => {
    for (let i = 0; i < apps.length; i++) {
      if (selectedAppId === apps[i]._id) {
        if (apps[i].data.type === 'EChartsViewer') {
          setInteractionContext((prevContext) => ({
            ...prevContext,
            lastChartsInteracted: [...prevContext.lastChartsInteracted, apps[i].data.state.options.title.text].slice(-5), // Keep only the last 5 chart titles
          }));
        }
        break;
      }
    }
  }, [selectedAppId]);

  const handleMouseOver = (chart: EChartsCoreOption) => {
    setHoveredChart(chart);
  };

  const handleMouseLeave = () => {
    setHoveredChart(null);
  };

  const handleStopStudy = () => {
    updateState(props._id, { isStudyStarted: false });
    onDeleteClose();
  };

  // function moveToApp(app) {
  //   let app = undefined
  //   for(let i = 0; i < apps.length; i++) {

  //   }
  //   if (!app) return;
  //   if (previousLocationapp !== app._id || !previousLocation.set) {
  //     // Scale
  //     const aW = app.data.size.width + 60; // Border Buffer
  //     const aH = app.data.size.height + 100; // Border Buffer
  //     const wW = window.innerWidth;
  //     const wH = window.innerHeight;
  //     const sX = wW / aW;
  //     const sY = wH / aH;
  //     const zoom = Math.min(sX, sY);

  //     // Position
  //     let aX = -app.data.position.x + 20;
  //     let aY = -app.data.position.y + 20;
  //     const w = app.data.size.width;
  //     const h = app.data.size.height;
  //     if (sX >= sY) {
  //       aX = aX - w / 2 + wW / 2 / zoom;
  //     } else {
  //       aY = aY - h / 2 + wH / 2 / zoom;
  //     }
  //     const x = aX;
  //     const y = aY;

  //     moveToBoardPosition({ x, y });
  //     setZoom(zoom);

  // }

  return (
    <AppWindow app={props}>
      <>
        {hoveredChart === null ? null : (
          <>
            {ReactDOM.createPortal(
              <Box
                position="fixed"
                top="50%"
                rounded="lg"
                left="50%"
                width="810px"
                pointerEvents={'none'}
                height="240px"
                border="6px solid black"
                transform={'translate(-50%, -50%) scale(3)'}
              >
                <EChartsViewer option={hoveredChart} />
              </Box>,
              document.body
            )}
          </>
        )}
        {s.isStudyStarted
          ? ReactDOM.createPortal(
              <Box bg="gray.700" position="fixed" bottom="0" left="0" width="100vw" height="30vh">
                <Box display="flex" height="100%">
                  <ConfirmModal
                    isOpen={isDeleteOpen}
                    onClose={onDeleteClose}
                    onConfirm={handleStopStudy}
                    title="You are about to end the session."
                    message="Are you sure you want to end the session?"
                    cancelText="Cancel"
                    confirmText="End Session"
                    cancelColor="green"
                    confirmColor="red"
                    size="lg"
                  />
                  <IconButton
                    icon={<MdClose size="20px" />}
                    aria-label="close panel"
                    size="md"
                    mx="1"
                    cursor="pointer"
                    position="absolute"
                    top="1rem"
                    right="2rem"
                    onClick={onDeleteOpen}
                  />
                  <Box width="15rem" borderRight="gray 4px solid">
                    <Center>
                      <VStack>
                        <Box display="flex">
                          <Input
                            value={input}
                            onChange={handleChange}
                            height="2rem"
                            width="10rem"
                            border="3px solid black"
                            onKeyDown={onSubmit}
                          />
                          <Button
                            colorScheme={isControlOn ? 'blue' : 'green'}
                            onClick={() => {
                              setIsControlOn((prev) => !prev);
                            }}
                          >
                            {isControlOn ? 'C' : 'E'}
                          </Button>
                        </Box>
                        <HStack>
                          <Button onClick={isRecording ? stopRecording : startRecording}>{isRecording ? 'Sleep' : 'Wake Up'}</Button>
                          <Button onClick={writeLog}>Save</Button>
                        </HStack>

                        <Box position="relative">
                          <div id="speechBubble" className="speech-bubble">
                            <p>Hello! This is a speech bubble.</p>
                          </div>
                          <Image
                            onClick={() => {
                              showSpeechBubble(latestResponse);
                            }}
                            boxSize="15rem"
                            transform={'translate(32px,0)'}
                            src={artiState}
                          />
                        </Box>
                      </VStack>
                    </Center>
                  </Box>
                  <Wrap id="scrollable" display="flex" pt="1rem" overflowY="scroll" height="100%" width="100%">
                    {chartOptions.map((chartOption: EChartsCoreOption, index: Key | null | undefined) => {
                      const chartId = chartOption.id;
                      let isSelected = false;
                      let isNewChart = false;
                      for (const selectedChart of selectedChartIds) {
                        if (selectedChart.chartId == chartId) {
                          isSelected = true;
                          break;
                        }
                      }

                      for (const ID of mostRecentChartIDs) {
                        if (ID == chartId) {
                          isNewChart = true;
                        }
                      }

                      const newChartOption: EChartsCoreOption = {
                        ...chartOption,
                        grid: { bottom: 50, left: 50 },
                        xAxis: {
                          ...(chartOption.xAxis as any),
                          nameLocation: 'end',
                          nameTextStyle: {
                            fontSize: 10, // Increase the font size here
                            fontWeight: 'bold', // Customize the style of the title (optional)
                          },
                          axisLabel: {
                            fontSize: 10,
                            margin: 10,
                            rotate: 30,
                          },
                          nameGap: 350,
                        },
                        yAxis: {
                          ...(chartOption.yAxis as any),
                          axisLabel: {
                            fontSize: 10,
                          },
                          nameTextStyle: {
                            fontSize: 10, // Increase the font size here
                            fontWeight: 'bold', // Customize the style of the title (optional)
                          },
                        },
                        title: {
                          ...(chartOption.title as any),
                          textStyle: {
                            fontSize: 8,
                          },
                        },
                        tooltip: {
                          show: false,
                        },
                      };

                      return (
                        <WrapItem
                          key={index}
                          ml="1rem"
                          width="420px"
                          height="240px"
                          onMouseLeave={isSelected ? undefined : handleMouseLeave}
                          onMouseOver={isSelected ? undefined : () => handleMouseOver(newChartOption)}
                          zIndex="0"
                          onClick={isSelected ? undefined : () => generateChart(chartOption)}
                        >
                          <Box
                            cursor="pointer"
                            zIndex="1000"
                            rounded="lg"
                            bg={isSelected ? 'gray' : 'white'} // Apply gray background if selected
                            border="3px solid black"
                            position="relative"
                            className={isNewChart ? 'glowing-border' : ''} // Apply glowing border if new chart
                          >
                            <Box zIndex="2">
                              <Box
                                width="400px"
                                height="200px"
                                bg={isSelected ? 'gray.800' : undefined}
                                opacity={isSelected ? 0.7 : 1}
                                zIndex="5"
                                position="relative"
                              >
                                {isSelected && (
                                  <Box
                                    position="absolute"
                                    top="0"
                                    left="0"
                                    width="100%"
                                    height="100%"
                                    bg="gray"
                                    opacity="0.5"
                                    zIndex="10"
                                  ></Box>
                                )}
                                <EChartsViewer option={{ ...newChartOption, legend: { show: false } }} size={{ width: 400, height: 200 }} />
                              </Box>
                            </Box>
                          </Box>
                        </WrapItem>
                      );
                    })}
                  </Wrap>
                  <Box width="15rem" mt="6rem" borderLeft="gray 4px solid">
                    <Center>
                      <VStack>
                        <Box display="flex"></Box>
                        <Box position="relative">
                          <div id="speechBubble2" className="speech-bubble2">
                            <p>Hello! This is a speech bubble.</p>
                          </div>
                          <Image
                            onClick={() => {
                              showSpeechBubble(latestResponse);
                            }}
                            boxSize="15rem"
                            transform={'translate(32px,0)'}
                            src={artiState}
                          />
                        </Box>
                      </VStack>
                    </Center>
                  </Box>
                </Box>
              </Box>,
              document.body
            )
          : null}
        <MapGL {...props} />
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app Chat */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const handleStartStudy = () => {
    updateState(props._id, { isStudyStarted: true });
  };

  const handleStopStudy = () => {
    updateState(props._id, { isStudyStarted: false });
    onDeleteClose();
  };

  return (
    <>
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleStopStudy}
        title="You are about to end the session."
        message="Are you sure you want to end the session?"
        cancelText="Cancel"
        confirmText="End Session"
        cancelColor="green"
        confirmColor="red"
        size="lg"
      />
      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Button onClick={handleStartStudy}>Start Study</Button>
        <Button disabled={!s.isStudyStarted} onClick={onDeleteOpen}>
          Stop Study
        </Button>
      </ButtonGroup>
    </>
  );
}

function getDateString(epoch: number): string {
  const date = new Date(epoch).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  const time = new Date(epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${date} - ${time}`;
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
