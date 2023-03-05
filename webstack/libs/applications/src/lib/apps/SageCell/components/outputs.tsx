/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore, useHexColor, useUser, useUsersStore } from '@sage3/frontend';
import {
  Alert,
  Box,
  Image,
  Text,
  useColorModeValue,
  Accordion,
  AccordionItem,
  AccordionIcon,
  AccordionButton,
  AccordionPanel,
  Icon,
  Code,
} from '@chakra-ui/react';
import { App } from '../../../schema';
import { state as AppState } from '../index';

// Styling
import './outputs.styles.css';
import { MdError } from 'react-icons/md';
import { useEffect, useState } from 'react';

// Ansi library
import Ansi from 'ansi-to-react';

// Markdown library
import { Markdown } from './markdown';

// Plotly library
import Plot from 'react-plotly.js';

// Vega library
import { Vega } from 'react-vega';

// VegaLite library
import { VegaLite } from 'react-vega';

// PdfViewer
import { PdfViewer } from './pdfviewer';

interface Result {
  request_id?: string;
  execute_result?: {
    data: any;
    execution_count: number;
    metadata: any;
  };
  display_data?: {
    data: any;
    metadata: any;
    transient: any;
  };
  stream?: {
    name: 'stdout' | 'stderr';
    text: string;
  };
  error?: {
    ename: string;
    evalue: string;
    traceback: string;
  };
}

type OutputBoxProps = {
  output: string;
  app: App;
};

export function Outputs(props: OutputBoxProps): JSX.Element {
  if (!props.output) return <></>;
  const s = props.app.data.state as AppState;
  const p = JSON.parse(props.output) as Result;
  const user = useUser();
  const roomId = props.app.data.roomId;
  const boardId = props.app.data.boardId;
  const users = useUsersStore((state: { users: any }) => state.users);
  const [ownerColor, setOwnerColor] = useState<string>('#000000');
  const createApp = useAppStore((state: { create: any }) => state.create);

  const [msgType, setMsgType] = useState<string>();
  const [data, setData] = useState<any>();
  const [metadata, setMetadata] = useState<any>({});
  const [transient, setTransient] = useState<any>({}); // transient data
  const [executionCount, setExecutionCount] = useState<number>();
  const [error, setError] = useState<any>();
  const [stream, setStream] = useState<Result['stream']>();
  const [msgId, setMsgId] = useState<unknown>();

  const openInWebview = (url: string): void => {
    createApp({
      title: `Webview`,
      roomId: props.app.data.roomId,
      boardId: props.app.data.boardId,
      position: { x: props.app.data.position.x + props.app.data.size.width + 20, y: props.app.data.position.y, z: 0 },
      size: { width: 600, height: props.app.data.size.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'Webview',
      state: {
        webviewurl: url,
        zoom: 1.0,
      },
      raised: true,
    });
  };

  const openInPlotly = (data: any): void => {
    createApp({
      title: `Plotly`,
      roomId: props.app.data.roomId,
      boardId: props.app.data.boardId,
      position: { x: props.app.data.position.x + props.app.data.size.width + 20, y: props.app.data.position.y, z: 0 },
      size: { width: 600, height: props.app.data.size.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'Plotly',
      state: {
        data: data,
        layout: {
          autosize: true,
          margin: {
            l: 50,
            r: 50,
            b: 50,
            t: 50,
            pad: 4,
          },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: {
            color: 'white',
            family: 'Roboto, sans-serif',
            size: 12,
          },
          xaxis: {
            showgrid: false,
            zeroline: false,
            showline: false,
            showticklabels: true,
            ticks: 'outside',
            tickcolor: 'white',
            tickfont: {
              family: 'Roboto, sans-serif',
              size: 12,
              color: 'white',
            },
          },
          yaxis: {
            showgrid: false,
            zeroline: false,
            showline: false,
            showticklabels: true,
            ticks: 'outside',
            tickcolor: 'white',
            tickfont: {
              family: 'Roboto, sans-serif',
              size: 12,
              color: 'white',
            },
          },
        },
        config: {
          responsive: true,
          displaylogo: false,
        },
      },
      raised: true,
    });
  };

  // Creates a new VegaLiteViewer app with aceeditor text
  const openInVega = (spec: any) => {
    if (!user) return;
    createApp({
      title: '',
      roomId: props.app.data.roomId,
      boardId: props.app.data.boardId,
      position: { x: props.app.data.position.x + props.app.data.size.width + 20, y: props.app.data.position.y, z: 0 },
      size: { width: props.app.data.size.width, height: props.app.data.size.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'VegaLiteViewer',
      state: {
        spec: spec,
      },
      raised: true,
    });
  };

  /**
   * UseEffect hook to update the state of the output box
   * based on the output received from the kernel. This
   * is triggered when the output prop (string) changes.
   *
   * Set the data, execution count, and metadata
   * based on the output type
   * @param {Result} p
   * @param {string} msgId
   * @param {any} stream
   * @param {any} error
   * @param {any} metadata
   * @returns {void}
   */
  useEffect(() => {
    const requestId = p.request_id;
    // console.log('request_id', requestId);
    if (p.execute_result) {
      // p.execute_result && console.log('execute_result', p.execute_result);
      setMsgType('execute_result');
      setData(p.execute_result.data);
      setExecutionCount(p.execute_result.execution_count);
      setMetadata(p.execute_result.metadata);
    } else if (p.display_data) {
      // p.display_data && console.log('display_data', p.display_data);
      setMsgType('display_data');
      setData(p.display_data.data);
      setMetadata(p.display_data.metadata);
      setTransient;
    } else if (p.stream) {
      setMsgType('stream');
      let incoming = p.stream.text;
      if (requestId === msgId && stream && stream.text !== p.stream.text) {
        incoming = stream.text + incoming;
      }
      setStream({ name: p.stream.name, text: incoming });
    } else if (p.error) {
      setMsgType('error');
      setError(p.error);
    } else {
      console.log('unknown output', p);
    }
    setMsgId(requestId);
  }, [props.output]);

  // get the color of the kernel owner
  useEffect(() => {
    if (s.kernel && users) {
      const kernels = s.availableKernels;
      const owner = kernels.find((el) => el.key === s.kernel)?.value.owner_uuid;
      const ownerColor = users.find((el: { _id: any }) => el._id === owner)?.data.color;
      setOwnerColor(ownerColor || '#000000');
    }
  }, [s.kernel, users]);

  return (
    <Box
      // fontFamily="source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace"
      fontFamily="Consolas, monospace;"
      background={useColorModeValue(`#f4f4f4`, `#1b1b1b`)}
      padding=".5em"
      minHeight="container"
      display="block"
      borderLeft={`0.2em solid ${useHexColor(ownerColor)}`}
      fontSize={s.fontSize + 'px'}
      whiteSpace="pre-wrap"
      overflow="auto"
      lineHeight="1.5em"
    >
      {!executionCount ? null : (
        <Text color="red" fontSize="16px" py={0}>
          {`Out[${executionCount}]`}
        </Text>
      )}
      {!stream ? null : stream.name === 'stdout' ? (
        <Ansi>{stream.text}</Ansi>
      ) : (
        <Icon name="warning" color="red" /> && <Ansi>{stream.text}</Ansi>
      )}

      {!data
        ? null
        : Object.keys(data).map((key: string, i) => {
            const value = data[key];
            const ww = metadata && metadata[key] && metadata[key].width;
            const hh = metadata && metadata[key] && metadata[key].height;
            // console.log('metadata', metadata);
            // console.log('key', key);
            switch (key) {
              case 'text/html':
                if (!data[key]) return null; // hides other outputs if html is present
                let clean = value;
                clean.includes('iframe') && console.log('iframe detected');
                clean.includes('script') && console.log('script detected');
                clean.includes('http://') && console.log('http:// detected');
                clean.includes('https://') && console.log('https:// detected');
                // remove do not remove iframe or the html will not render
                // clean.includes('iframe') && (clean = clean.replace(/iframe/g, ''));
                clean.includes('script') && (clean = clean.replace(/script/g, ''));
                clean.includes('http://') && (clean = clean.replace(/http:\/\//g, 'https://'));
                clean.includes('&lt;') && (clean = clean.replace(/&lt;/g, '<'));
                clean.includes('&gt;') && (clean = clean.replace(/&gt;/g, '>'));
                clean.includes('&amp;') && (clean = clean.replace(/&amp;/g, '&'));
                clean.includes('&quot;') && (clean = clean.replace(/&quot;/g, '"'));
                clean.includes('&apos;') && (clean = clean.replace(/&apos;/g, "'"));
                clean.includes('allowfullscreen') && (clean = clean.replace(/allowfullscreen/g, ''));
                return <Box key={i} dangerouslySetInnerHTML={{ __html: clean }} />;
              case 'text/plain':
                if (data['text/html']) return null;
                return <Ansi key={i}>{value}</Ansi>;
              case 'image/png':
                return <Image key={i} src={`data:image/png;base64,${value}`} width={ww} height={hh} />;
              case 'image/jpeg':
                return <Image key={i} src={`data:image/jpeg;base64,${value}`} width={ww} height={hh} />;
              case 'image/svg+xml':
                return <Box key={i} dangerouslySetInnerHTML={{ __html: value }} />;
              case 'text/markdown':
                return <Markdown key={i} data={value} openInWebview={openInWebview} />;
              case 'application/vnd.vegalite.v4+json':
                return <VegaLite key={i} spec={value} actions={false} renderer="svg" />;
              case 'application/vnd.vegalite.v3+json':
                return <VegaLite spec={value} actions={false} renderer="svg" />;
              case 'application/vnd.vegalite.v2+json':
                return <VegaLite key={i} spec={value} actions={false} renderer="svg" />;
              case 'application/vnd.vega.v5+json':
                return <Vega spec={value} actions={false} renderer="svg" />;
              case 'application/vnd.vega.v4+json':
                return <Vega spec={value} actions={false} renderer="svg" />;
              case 'application/vnd.vega.v3+json':
                return <Vega key={i} spec={value} actions={false} renderer="svg" />;
              case 'application/vnd.vega.v2+json':
                return <Vega key={i} spec={value} actions={false} renderer="svg" />;
              case 'application/vnd.vega.v1+json':
                return <Vega key={i} spec={value} actions={false} renderer="svg" />;
              case 'application/vnd.plotly.v1+json':
                // openInPlotly(value);
                const config = value.config || {};
                const layout = value.layout || {};
                config.displaylogo = false;
                config.displayModeBar = false;
                config.scrollZoom = true;
                layout.dragmode = 'pan';
                layout.hovermode = 'closest';
                layout.margin = { l: 0, r: 0, b: 0, t: 0, pad: 0 };
                layout.font = { size: s.fontSize };
                layout.hoverlabel = {
                  font: { size: s.fontSize },
                  bgcolor: '#ffffff',
                  bordercolor: '#000000',
                  fontFamily: 'sans-serif',
                };
                layout.width = 'auto';
                layout.height = 'auto';
                return <Plot key={i} data={value.data} layout={layout} config={config} />;
              case 'application/pdf':
                return <PdfViewer data={value} />;
              case 'application/json':
                return <pre>{JSON.stringify(value, null, 2)}</pre>;
              case 'application/javascript':
                return <pre>{JSON.stringify(value, null, 2)}</pre>;
              default:
                return (
                  <Box>
                    <Accordion allowToggle>
                      <AccordionItem>
                        <AccordionButton>
                          <Box flex="1" textAlign="left">
                            <Text color="red" fontSize={s.fontSize}>
                              Error: {key} is not supported in this version of SAGECell.
                            </Text>
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel pb={4}>
                          <pre>{JSON.stringify(value, null, 2)}</pre>
                        </AccordionPanel>
                      </AccordionItem>
                    </Accordion>
                  </Box>
                );
            }
          })}
      {!error ? null : (
        <Box>
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
          {Object(error.traceback).map((line: string) => (
            <Ansi>{line}</Ansi>
          ))}
        </Box>
      )}
    </Box>
  );
}
