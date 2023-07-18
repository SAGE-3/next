/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';

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

import { v4 } from 'uuid';

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

import { useAppStore, useHexColor, useUsersStore } from '@sage3/frontend';

import { App } from '../../../schema';
import { state as AppState } from '../index';

interface Result {
  request_id: string;
  execute_result?: ExecuteResult;
  display_data?: DisplayData;
  stream?: Stream;
  error?: Error;
}

interface ExecuteResult {
  data?: Record<
    string,
    {
      [key: string]: unknown;
    }
  >;
  metadata?: Metadata;
  execution_count: number;
}

interface DisplayData {
  data?: Record<string, unknown>;
  metadata?: Metadata;
  transient?: unknown;
}

interface Metadata {
  metadata?: Record<string, unknown>;
}

interface Stream {
  name: 'stdout' | 'stderr';
  text: string;
}

interface Error {
  ename: string;
  evalue: string;
  traceback: string[];
}

type OutputBoxProps = {
  output: string;
  app: App;
};

export function Outputs(props: OutputBoxProps): JSX.Element {
  const s = props.app.data.state as AppState;
  // Data stores
  const users = useUsersStore((state) => state.users);
  const createApp = useAppStore((state) => state.create);
  // Application state
  const [ownerColor, setOwnerColor] = useState<string>('#000000');
  const [data, setData] = useState<Record<string, unknown>>();
  const [executionCount, setExecutionCount] = useState<number>();
  const [error, setError] = useState<Error>();
  const [stream, setStream] = useState<Stream>();
  const [msgId, setMsgId] = useState<string>();

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

  /**
   * UseEffect hook to update the state of the output box
   * based on the output received from the kernel. This
   * is triggered when the output prop changes.
   *
   * Set the data, execution count, and metadata based on the output type
   */
  useEffect(() => {
    // Parse the output received from the kernel
    const p = JSON.parse(props.output) as Result;
    const requestId = p.request_id;
    if (p.execute_result) {
      setData(p.execute_result.data);
      setExecutionCount(p.execute_result.execution_count);
    } else if (p.display_data) {
      setData(p.display_data.data);
    } else if (p.stream) {
      let incoming = p.stream.text;
      if (requestId === msgId && stream && stream.text !== p.stream.text) {
        incoming = stream.text + incoming;
      }
      setStream({ name: p.stream.name, text: incoming });
    } else if (p.error) {
      setError(p.error);
    } else {
      console.log('SAGECell> unknown output', p);
    }
    setMsgId(requestId);
    return () => {
      // Cleanup
      setData(undefined);
      setExecutionCount(undefined);
      setError(undefined);
      setStream(undefined);
    };
  }, [props.output]);

  // Get the color of the kernel owner
  useEffect(() => {
    if (s.kernel && users) {
      const kernels = s.availableKernels;
      const owner = kernels.find((el) => el.key === s.kernel)?.value.owner_uuid;
      const ownerColor = users.find((el) => el._id === owner)?.data.color;
      setOwnerColor(ownerColor || '#000000');
    }
    return () => {
      // Cleanup
      setOwnerColor('#000000');
    };
  }, [s.kernel, users]);

  return (
    <Box
      borderLeft={`.4rem solid ${useHexColor(ownerColor)}`}
      p={1}
      className={'output ' + useColorModeValue('output-area-light', 'output-area-dark')}
    >
      {!executionCount ? null : <Text fontSize={'.8rem'} color="red">{`[${executionCount}]:`}</Text>}
      {!stream ? null : <Ansi>{stream.text}</Ansi>}
      {!data
        ? null
        : Object.keys(data).map((key, i) => {
            const value = data[key];
            // console.log(key);
            switch (key) {
              case 'text/html':
                if (!value) return null; // hides other outputs if html is present
                return <Box key={key} dangerouslySetInnerHTML={{ __html: value as TrustedHTML }} />;
              case 'text/plain':
                if (data['text/html']) return null;
                return <Ansi key={key}>{value as string}</Ansi>;
              case 'image/png':
                return <Image key={key} src={`data:image/png;base64,${value as string}`} />;
              case 'image/jpeg':
                return <Image key={key} src={`data:image/jpeg;base64,${value as string}`} />;
              case 'image/svg+xml':
                return <Box key={key} dangerouslySetInnerHTML={{ __html: value as TrustedHTML }} />;
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
                const value = data[key] as PlotParams;
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
                    <Plot key={i} data={value.data} layout={layout} config={config} />
                  </>
                );
              }
              case 'application/pdf':
                // Open a iframe with the pdf
                return <PdfViewer key={i} data={value as string} />;
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
                            <Text color="red" fontSize={s.fontSize}>
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
          })}
      {!error ? null : (
        <>
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
            <Ansi key={line}>{line}</Ansi>
          ))}
        </>
      )}
    </Box>
  );
}
