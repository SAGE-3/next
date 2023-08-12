/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useMemo } from 'react';

import {
  Alert,
  Box,
  Image,
  Text,
  Icon,
  Code,
  useColorModeValue,
  Accordion,
  AccordionItem,
  AccordionIcon,
  AccordionButton,
  AccordionPanel,
} from '@chakra-ui/react';
import { MdError } from 'react-icons/md';

// import { v4 } from 'uuid';

// Ansi library
import Ansi from 'ansi-to-react';
// Markdown library
import { Markdown } from './markdown';
// Plotly library
import Plot, { PlotParams } from 'react-plotly.js';
// import { Data, PlotlyDataLayoutConfig } from 'plotly.js';
// Vega library
import { Vega, VisualizationSpec } from 'react-vega';
// VegaLite library
import { VegaLite } from 'react-vega';
// PdfViewer
import { PdfViewer } from './pdfviewer';

import { useAppStore, useHexColor, useKernelStore, useUser, useUsersStore } from '@sage3/frontend';

import { App } from '../../../schema';
import { state as AppState } from '../index';
import { KernelInfo, ExecOutput, ContentItem } from '@sage3/shared/types';

/**
 * The Outputs component is responsible for rendering the output of the kernel
 * in the app. It will render the output based on the type of output that is
 * returned from the kernel. It will also render the error message if there is
 * an error. If the output is streaming, it will render the output as it comes
 * in from the kernel. If the output is not streaming, it will render the output
 * as a whole when the kernel is done executing. Completed message ids are stored in
 * the history array in the state. The last message id in the history array is
 * used to get the output of the kernel when not streaming.
 *
 * @param props
 * @returns
 */
export function Outputs(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // Data stores
  const users = useUsersStore((state) => state.users);
  const { user } = useUser();
  const createApp = useAppStore((state) => state.create);
  const updateState = useAppStore((state) => state.updateState);
  // Local state
  const [content, setContent] = useState<ContentItem[] | null>(null);
  const [executionCount, setExecutionCount] = useState<number>(0);
  const executionCountColor = useHexColor('red');
  const [ownerColor, setOwnerColor] = useState<string>('#000000');
  const { fetchResults, startServerSentEventsStream } = useKernelStore((state) => state);
  const [msgId, setMsgId] = useState<string>(s.history[s.history.length - 1] || '');

  async function getResults(msgId: string) {
    if (s.streaming && s.session !== user?._id) {
      return; // Don't update results just yet if someone else is streaming
    }
    const response = await fetchResults(msgId);
    if (response.ok) {
      const result = response.execOutput;
      if (result.completed) {
        setContent(result.content);
        setExecutionCount(result.execution_count);
      }
    } else {
      console.log(response);
    }
  }

  async function getStreamingResults() {
    if (s.streaming && s.session !== user?._id) {
      return; // Don't update results just yet if someone else is streaming
    }
    const response = await startServerSentEventsStream(s.msgId);
    if (response.ok) {
      const result = response.execOutput;
      if (result.completed) {
        setContent(result.content);
        setExecutionCount(result.execution_count);
        updateState(props._id, { streaming: false, msgId: '', history: [...s.history, s.msgId] });
      }
    } else {
      setContent(response.execOutput.content);
    }
  }

  useEffect(() => {
    if (s.msgId) {
      getStreamingResults();
    }
  }, [s.msgId]);

  // async function getResults() {
  //   if (s.streaming && s.session !== user?._id) {
  //     return; // Don't fetch results if someone else is streaming
  //   }
  //   let result: ExecOutput = {
  //     completed: false,
  //     content: [],
  //     execution_count: 0,
  //     msg_type: '',
  //     session_id: '',
  //     start_time: '',
  //     end_time: '',
  //     last_update_time: '',
  //   };
  //   const response = await fetchResults(s.msgId);
  //   if (response.ok) {
  //     result = response.execOutput;
  //     console.log();
  //     if (result.completed) {
  //       console.log(result);
  //       setContent(result.content);
  //       setExecutionCount(result.execution_count);
  //       updateState(props._id, { streaming: false, msgId: '', history: [...s.history, s.msgId] });
  //     } else {
  //       setContent(result.content);
  //       setExecutionCount(result.execution_count ? result.execution_count : 0);
  //     }
  //   } else {
  //     console.log(response);
  //   }
  // }

  useEffect(() => {
    // get the last message from the history
    if (s.history.length > 0) {
      const msgId = s.history[s.history.length - 1];
      fetchResults(msgId).then((response) => {
        if (response.ok) {
          const result = response.execOutput;
          setContent(result.content);
          setExecutionCount(result.execution_count);
        }
      });
    } else {
      setContent(null);
      setExecutionCount(0);
    }
  }, [s.history]);

  // useEffect(() => {
  //   if (!eventSource) return;
  //   eventSource.addEventListener('new_message', function (event) {
  //     const result = JSON.parse(event.data);
  //     if (result.completed) {
  //       setContent(result.content as ContentItem[]);
  //       setExecutionCount(result.executionCount);
  //       // setMsgType(result.msgType);
  //       setStreaming(false);
  //       eventSource.close();
  //       setEventSource(null);
  //     } else {
  //       setContent(result.content as ContentItem[]);
  //     }
  //   });
  // }, [eventSource]);

  // useEffect(() => {
  //   if (s.msgId) {
  //     getResults();
  //   }
  // }, [s.msgId]);

  /**
   * This function will create a new webview app
   * with the url provided
   *
   * @param url
   */
  const openInWebview = (url: string): void => {
    createApp({
      title: 'Webview',
      roomId: props.data.roomId,
      boardId: props.data.boardId,
      position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
      size: { width: 600, height: props.data.size.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'Webview',
      state: { webviewurl: url },
      raised: true,
      dragging: false,
    });
  };

  // // Get the color of the kernel owner
  // useEffect(() => {
  //   if (s.kernel && users) {
  //     const owner = kernels.find((el: KernelInfo) => el.kernel_id === s.kernel)?.owner;
  //     const ownerColor = users.find((el) => el._id === owner)?.data.color;
  //     setOwnerColor(ownerColor || '#000000');
  //   }
  //   return () => {
  //     setOwnerColor('#000000');
  //   };
  // }, [kernels, users]);

  // Get the error message and put it back together since it streamed in parts
  const error =
    content &&
    content.reduce((acc, item) => {
      if ('traceback' in item) {
        acc.traceback = item.traceback;
      }
      if ('ename' in item) {
        acc.ename = item.ename;
      }
      if ('evalue' in item) {
        acc.evalue = item.evalue;
      }
      return acc;
    }, {} as { traceback?: string[]; ename?: string; evalue?: string });

  const processedContent = useMemo(() => {
    if (!content) return null;
    return content.map((item) => {
      return Object.keys(item).map((key) => {
        // console.log(msgType, key);
        const value = item[key];
        switch (key) {
          // error messages are handled above
          case 'traceback':
          case 'ename':
          case 'evalue':
            return null;
          case 'stdout':
          case 'stderr':
            return <Ansi key={key}>{value as string}</Ansi>;
          case 'text/html':
            if (!value) return null; // hides other outputs if html is present
            // remove extra \n from html
            return <Box key={key} dangerouslySetInnerHTML={{ __html: value.replace(/\n/g, '') }} />;
          case 'text/plain':
            if (item['text/html']) return null;
            return <Ansi key={key}>{value as string}</Ansi>;
          case 'image/png':
            return <Image key={key} src={`data:image/png;base64,${value}`} />;
          case 'image/jpeg':
            return <Image key={key} src={`data:image/jpeg;base64,${value}`} />;
          case 'image/svg+xml':
            return <Box key={key} dangerouslySetInnerHTML={{ __html: value.replace(/\n/g, '') }} />;
          case 'text/markdown':
            return <Markdown key={key} data={value} openInWebview={openInWebview} />;
          case 'application/vnd.vegalite.v4+json':
          case 'application/vnd.vegalite.v3+json':
          case 'application/vnd.vegalite.v2+json':
            return <VegaLite key={key} spec={value as VisualizationSpec} actions={false} renderer="svg" />;
          case 'application/vnd.vega.v5+json':
          case 'application/vnd.vega.v4+json':
          case 'application/vnd.vega.v3+json':
          case 'application/vnd.vega.v2+json':
          case 'application/vnd.vega.v1+json':
            return <Vega key={key} spec={value as VisualizationSpec} actions={false} renderer="svg" />;
          case 'application/vnd.plotly.v1+json': {
            // Configure plotly
            const value = item[key] as unknown as PlotParams;
            const config = value.config || {};
            const layout = value.layout || {};
            config.displaylogo = false;
            config.displayModeBar = false;
            config.scrollZoom = false;
            config.showTips = false;
            config.showLink = false;
            config.linkText = 'Edit in Chart Studio';
            config.plotlyServerURL = `https://chart-studio.plotly.com`;
            config.responsive = true;
            config.autosizable = true;
            layout.dragmode = 'pan';
            layout.hovermode = 'closest';
            layout.showlegend = true;
            layout.font = { size: s.fontSize };
            layout.hoverlabel = {
              font: { size: s.fontSize },
            };
            layout.xaxis = {
              title: { font: { size: s.fontSize } },
              tickfont: { size: s.fontSize },
            };
            layout.yaxis = {
              title: { font: { size: s.fontSize } },
              tickfont: { size: s.fontSize },
            };
            layout.legend ? (layout.legend.font = { size: s.fontSize }) : (layout.legend = { font: { size: s.fontSize } });
            layout.margin = { l: 2, r: 2, b: 2, t: 2, pad: 2 };
            layout.paper_bgcolor = useColorModeValue(`#f4f4f4`, `#1b1b1b`);
            layout.plot_bgcolor = useColorModeValue(`#f4f4f4`, `#1b1b1b`);
            layout.height = window.innerHeight * 0.5;
            layout.width = window.innerWidth * 0.5;
            return (
              <>
                <Plot key={key} data={value.data} layout={layout} config={config} />
              </>
            );
          }
          case 'application/pdf':
            // Open a iframe with the pdf
            return <PdfViewer key={key} data={value as string} />;
          case 'application/json':
            // Render the json as string into a PRE tag
            return <pre key={key}>{JSON.stringify(value as string, null, 2)}</pre>;
          default:
            return (
              <Box key={key}>
                <Accordion allowToggle>
                  <AccordionItem>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        <Text color={executionCountColor} fontSize={s.fontSize}>
                          Error: {key} is not supported in this version of SAGECell.
                        </Text>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel pb={4}>
                      <pre>{JSON.stringify(value as string, null, 2)}</pre>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </Box>
            );
        }
      });
    });
  }, [content, s.fontSize]);

  return (
    <Box flex="1" borderLeft={`.4rem solid ${useHexColor(ownerColor)}`} display={'flex'} flexDirection={'row'}>
      {/* <Box p={1} className={'output ' + useColorModeValue('output-area-light', 'output-area-dark')} overflowY={'auto'}> */}
      {!executionCount && executionCount < 1 ? null : (
        <Text padding={'0.25rem'} fontSize={s.fontSize} color={executionCountColor}>{`[${executionCount}]:`}</Text>
      )}
      <Box p={1} className={'output ' + useColorModeValue('output-area-light', 'output-area-dark')}>
        {error && error.ename && error.evalue ? (
          <Alert status="error">
            <Icon as={MdError} />
            <Code
              style={{
                fontFamily: 'monospace',
                display: 'inline-block',
                marginLeft: '0.5em',
                marginRight: '0.5em',
                fontWeight: 'bold',
                background: 'transparent',
                fontSize: s.fontSize,
              }}
            >
              {error.ename}: <Ansi>{error.evalue}</Ansi>
            </Code>
          </Alert>
        ) : null}
        {error && error.traceback ? Object(error.traceback).map((line: string, idx: number) => <Ansi key={line + idx}>{line}</Ansi>) : null}
        {processedContent}
      </Box>
      {/* </Box> */}
    </Box>
  );
}
