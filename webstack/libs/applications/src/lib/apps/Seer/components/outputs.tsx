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
  Flex,
} from '@chakra-ui/react';
import { MdError } from 'react-icons/md';

// Event Source import
import { fetchEventSource } from '@microsoft/fetch-event-source';
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

import { useAppStore, useUser, useHexColor, useUsersStore, useKernelStore } from '@sage3/frontend';

import { App } from '../../../schema';
import { state as AppState } from '../index';

// import { ContentItemType } from '../index';
import { KernelInfo, ContentItem } from '@sage3/shared/types';

interface OutputsProps {
  app: App;
  msgId: string;
  online: boolean;
}

export function Outputs(props: OutputsProps): JSX.Element {
  const { user } = useUser();
  if (!user) return <></>;

  // App state
  const s = props.app.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);

  // Users
  const users = useUsersStore((state) => state.users);

  // Local state
  const [content, setContent] = useState<ContentItem[] | null>(null);
  const [executionCount, setExecutionCount] = useState<number>(0);
  const [ownerColor, setOwnerColor] = useState<string>('#000000');
  const [history, setHistory] = useState<string[]>(s.history || []);

  /**
   * This function will create a new webview app
   * with the url provided
   *
   * @param url
   */
  const openInWebview = (url: string): void => {
    createApp({
      title: 'Webview',
      roomId: props.app.data.roomId,
      boardId: props.app.data.boardId,
      position: { x: props.app.data.position.x + props.app.data.size.width + 20, y: props.app.data.position.y, z: 0 },
      size: { width: 600, height: props.app.data.size.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'Webview',
      state: { webviewurl: url },
      raised: true,
      dragging: false,
      pinned: false,
    });
  };

  // Get the color of the kernel owner
  useEffect(() => {
    if (s.kernel && users) {
      const owner = kernels.find((el: KernelInfo) => el.kernel_id === s.kernel)?.owner;
      const ownerColor = users.find((el) => el._id === owner)?.data.color;
      setOwnerColor(ownerColor || '#000000');
    }
  }, [s.kernel, kernels, users]);

  useEffect(() => {
    setHistory(s.history);
  }, [s.history]);

  /**
   * Update local state if the online status changes
   * @param {boolean} online
   */
  useEffect(() => {
    if (!apiStatus) {
      updateState(props.app._id, {
        streaming: false,
        kernel: '',
        msgId: '',
        history: [],
      });
      console.log('kernel store is not available');
    }
  }, [apiStatus]);

  /**
   * This effect will fetch the results of the last
   * executed cell if the app is online and the
   * msgId is not empty.
   */
  useEffect(() => {
    if (!s.streaming) return;
    function setEventSource() {
      const ctrl = new AbortController();
      fetchEventSource(`/api/fastapi/status/${s.msgId}/stream`, {
        method: 'GET',
        headers: {
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache',
        },
        signal: ctrl.signal,
        onmessage(event) {
          setError(null);
          if (!event.data) return;
          try {
            const parsedData = JSON.parse(event.data);
            setContent(parsedData.content);
            if (parsedData.execution_count) {
              setExecutionCount(parsedData.execution_count);
            }
          } catch (error) {
            console.log('EventSource> error', error);
            ctrl.abort();
          }
        },
        onclose() {
          updateState(props.app._id, { streaming: false, history: [...s.history, props.msgId], msgId: '' });
        },
      });
    }

    if (s.msgId && s.session === user?._id) {
      setEventSource();
    }
  }, [props.msgId]);

  async function getResults() {
    if (!history || history.length === 0 || s.streaming) return;
    const msgId = history[history.length - 1];
    console.log('Attempting to fetch results');
    const response = await fetchResults(msgId);
    if (response.ok) {
      const result = response.execOutput;
      if (result.msg_type === 'error') {
        setContent(null);
        setExecutionCount(0);
        const error = result.content.reduce((acc, item) => {
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
        setError(error);
        return;
      }
      if (result.completed) {
        setError(null);
        setContent(result.content);
        setExecutionCount(result.execution_count);
      }
    } else {
      setError({
        traceback: ['Error fetching results'],
        ename: 'Error',
        evalue: 'Error fetching results',
      });
      setContent(null);
      setExecutionCount(0);
    }
  }

  useEffect(() => {
    getResults();
  }, [history.length]);

  function processedContent(content: ContentItem[]) {
    // if (!content) return <></>;
    return content.map((item) => {
      return Object.keys(item).map((key) => {
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
            return <PdfViewer key={key} data={value as string} />;
          case 'application/json':
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
  }

  /**
   * This function will create a new webview app
   * with the url provided
   *
   * @param url
   */
  const openInWebview = (url: string): void => {
    createApp({
      title: 'Webview',
      roomId: props.app.data.roomId,
      boardId: props.app.data.boardId,
      position: { x: props.app.data.position.x + props.app.data.size.width + 20, y: props.app.data.position.y, z: 0 },
      size: { width: 600, height: props.app.data.size.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'Webview',
      state: { webviewurl: url },
      raised: true,
      dragging: false,
    });
  };

  return (
    <Box
      p={1}
      w={'100%'}
      h={'100%'}
      minHeight="150px"
      // border={`1px solid ${useHexColor(ownerColor)}`}
      overflow={'auto'}
      css={{
        '&::-webkit-scrollbar': {
          background: 'black',
          width: '6px',
          height: '6px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'teal',
          borderRadius: '24px',
        },
      }}
    >
      <Flex align="start">
        {!executionCount || executionCount < 1 ? null : (
          <Text padding="0.25rem" fontSize={s.fontSize} color={executionCountColor} marginRight="0.5rem">
            [{executionCount}]:
          </Text>
        )}
        <Box
          flex="1"
          borderLeft={`0.4rem solid ${useHexColor(ownerColor)}`}
          p={1}
          className={`output ${useColorModeValue('output-area-light', 'output-area-dark')}`}
          fontSize={s.fontSize}
        >
          {error && (
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
          )}
          {error?.traceback && error.traceback.map((line: string, idx: number) => <Ansi key={line + idx}>{line}</Ansi>)}
          {renderedContent}
        </Box>
      </Flex>
    </Box>
  );
}
