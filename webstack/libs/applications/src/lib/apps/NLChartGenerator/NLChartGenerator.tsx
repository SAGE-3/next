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

import MapGL from './MapGL';
import { MdClose } from 'react-icons/md';

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

  // Sort messages by creation date to display in order

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  useEffect(() => {
    if (finalText.trim().length > 1) {
      console.log(finalText.trim().length, 'length');
      send(finalText);
    } else {
      console.log('empty');
    }
  }, [finalText]);

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
    if (response == 0 || response == 2) {
      setProcessing(true);

      const chartResponse = await ArticulateAPI.sendCommand(request, interactionContext);
      if (!chartResponse) {
        //do nothing
      } else {
        if (Object.keys(chartResponse).length == 0) {
          return;
        }
        const tmpChartOptions: EChartsCoreOption[] = await processStations(chartResponse['station_chart_info'], colorMode, props.data.size);
        const chartTitles = [];
        for (let i = 0; i < tmpChartOptions.length; i++) {
          chartTitles.push((tmpChartOptions[i] as any).title.text);
        }
        setInteractionContext({ ...interactionContext, lastChartsGenerated: [...chartTitles] });
        // updateState(props._id, { chartsCreated: [...s.chartsCreated, ...tmpChartOptions] });
        setChartOptions((prev: EChartsCoreOption[]) => [...prev, ...tmpChartOptions]);
      }
      setProcessing(false);
    }
    // await the request
    // Add messages
    updateState(props._id, {
      ...s,
      previousQ: request,
      previousA: 'answer',
      messages: [
        ...s.messages,
        initialAnswer,
        {
          id: genId(),
          userId: user._id,
          creationId: '',
          creationDate: now.epoch + 1,
          userName: 'OpenAI',
          query: '',
          response: 'answer',
        },
      ],
    });

    // TODO create a try catch here and handle errors.
    setTimeout(() => {
      // Scroll to bottom of chat box smoothly
      goToBottom();
    }, 100);
  };

  const goToBottom = (mode: ScrollBehavior = 'smooth') => {
    // Scroll to bottom of chat box smoothly
    chatBox.current?.scrollTo({
      top: chatBox.current?.scrollHeight,
      behavior: mode,
    });
  };

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

  const generateChart = async (EChartOption: EChartsCoreOption) => {
    await createApp({
      title: 'EChartsViewer',
      roomId: props.data.roomId!,
      boardId: props.data.boardId!,
      //TODO get middle of the screen space
      position: {
        x: props.data.position.x + props.data.size.width,
        y: props.data.position.y,
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

    setInteractionContext({ ...interactionContext, lastChartsSelected: [(EChartOption as any).title.text] });
  };

  useEffect(() => {
    for (let i = 0; i < apps.length; i++) {
      if (selectedAppId == apps[i]._id) {
        if (apps[i].data.type == 'EChartsViewer') {
          setInteractionContext({ ...interactionContext, lastChartsInteracted: [apps[i].data.state.options.title.text] });
        }
        break;
      }
    }
  }, [selectedAppId]);

  const handleMouseOver = (chart: EChartsCoreOption) => {
    console.log(chart);
    setHoveredChart(chart);
  };

  const handleMouseLove = () => {
    console.log('leaving');
    setHoveredChart(null);
  };

  const handleStopStudy = () => {
    updateState(props._id, { isStudyStarted: false });
    onDeleteClose();
  };

  return (
    <AppWindow app={props}>
      <>
        {hoveredChart === null ? null : (
          <>
            {ReactDOM.createPortal(
              <Box
                position="fixed"
                top="30%"
                rounded="lg"
                left="30%"
                width="810px"
                height="240px"
                border="6px solid black"
                transform={'scale(1.5)'}
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
                          <Button height="2rem" colorScheme="green" width="5rem">
                            Go
                          </Button>
                        </Box>
                        <Button onClick={isRecording ? stopRecording : startRecording}>{isRecording ? 'Sleep' : 'Wake Up'}</Button>

                        <Image boxSize="15rem" transform={'translate(32px,0)'} src={artiState} />
                      </VStack>
                    </Center>
                  </Box>
                  <Wrap display="flex" pt="1rem" overflowY="scroll" height="100%" width="100%">
                    {chartOptions.map((chartOption: EChartsCoreOption, index: Key | null | undefined) => {
                      const newChartOption: EChartsCoreOption = {
                        ...chartOption,
                        grid: { bottom: 100, left: 25 },
                        xAxis: {
                          ...(chartOption.xAxis as any),
                          nameLocation: 'middle',
                          nameTextStyle: {
                            fontSize: 20, // Increase the font size here
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
                        },
                        title: {
                          ...(chartOption.title as any),
                          textStyle: {
                            fontSize: 10,
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
                          // mb="1rem"
                          // width="100%"
                          // height="100%"
                          width="200"
                          height="114"
                          onMouseLeave={handleMouseLove}
                          onMouseOver={() => handleMouseOver(newChartOption)}
                          zIndex="0"
                          onClick={() => generateChart(chartOption)}
                        >
                          <Box
                            cursor="pointer" // Add this line to change the cursor to pointer on hover
                            zIndex="1000"
                            rounded="lg"
                            // m="1rem"
                            border="3px solid black"
                          >
                            <EChartsViewer option={{ ...newChartOption, legend: { show: false } }} size={{ width: 200, height: 100 }} />
                          </Box>
                        </WrapItem>
                      );
                    })}
                  </Wrap>
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
