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

import { useAppStore, useHexColor, useUsersStore } from '@sage3/frontend';

import { App, AppSchema } from '../../../schema';
import { state as AppState } from '../index';

export interface Result {
  request_id: string;
  execute_result?: ExecuteResult;
  display_data?: DisplayData;
  stream?: Stream;
  error?: Error;
}

export interface ExecuteResult {
  data?: Record<string, any>;
  metadata?: Metadata;
  execution_count: number;
}

export interface DisplayData {
  data?: Record<string, any>;
  metadata?: Metadata;
  transient?: {};
}

export interface Metadata {
  metadata?: Record<string, any>;
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

interface UserState {
  users: User[];
}

interface User {
  _id: string;
  _createdAt: number;
  _createdBy: string;
  _updatedAt: number;
  _updatedBy: string;
  data: UserData;
}

interface UserData {
  name: string;
  email: string;
  color: string;
  userRole: string;
  userType: string;
  profilePicture: string;
}

type OutputBoxProps = {
  output: string;
  app: App;
};

export function Outputs(props: OutputBoxProps): JSX.Element {
  if (!props.output) return <></>;
  const s = props.app.data.state as AppState;
  const users = useUsersStore((state: UserState) => state.users);
  const createApp = useAppStore((state: { create: (app: AppSchema) => void }) => state.create);
  const [ownerColor, setOwnerColor] = useState<string>('#000000');
  const [data, setData] = useState<Record<string, any>>(); // execute_result.data or display_data.data is unknown type
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
  }, [props.output]);

  // Get the color of the kernel owner
  useEffect(() => {
    if (s.kernel && users) {
      const kernels = s.availableKernels;
      const owner = kernels.find((el) => el.key === s.kernel)?.value.owner_uuid;
      const ownerColor = users.find((el) => el._id === owner)?.data.color;
      setOwnerColor(ownerColor || '#000000');
    }
  }, [s.kernel, users]);

  return (
    <Box
      // Interactive styling
      className={'output ' + useColorModeValue('output-area-light', 'output-area-dark')}
      background={useColorModeValue(`#f4f4f4`, `#1b1b1b`)}
      borderLeft={`0.2em solid ${useHexColor(ownerColor)}`}
      fontSize={s.fontSize + 'px'}
    >
      {!executionCount ? null : (
        <Text color="red" fontSize={s.fontSize + 'px'}>
          {`Out[${executionCount}]:`}
        </Text>
      )}
      {!stream ? null : <Ansi>{stream.text}</Ansi>}
      {!data
        ? null
        : Object.keys(data).map((key, i) => {
            const value = data[key];
            switch (key) {
              case 'text/html':
                if (!data[key]) return null; // hides other outputs if html is present
                return <Box key={i} dangerouslySetInnerHTML={{ __html: value }} />;
              case 'text/plain':
                if (data['text/html']) return null;
                return <Ansi key={i}>{value}</Ansi>;
              case 'image/png':
                return <Image key={i} src={`data:image/png;base64,${value}`} />;
              case 'image/jpeg':
                return <Image key={i} src={`data:image/jpeg;base64,${value}`} />;
              case 'image/svg+xml':
                return <Box key={i} dangerouslySetInnerHTML={{ __html: value }} />;
              case 'text/markdown':
                return <Markdown key={i} data={value} openInWebview={openInWebview} />;
              case 'application/vnd.vegalite.v4+json':
              case 'application/vnd.vegalite.v3+json':
              case 'application/vnd.vegalite.v2+json':
                return <VegaLite key={i} spec={value} actions={false} renderer="svg" />;
              case 'application/vnd.vega.v5+json':
              case 'application/vnd.vega.v4+json':
              case 'application/vnd.vega.v3+json':
              case 'application/vnd.vega.v2+json':
              case 'application/vnd.vega.v1+json':
                return <Vega key={i} spec={value} actions={false} renderer="svg" />;
              case 'application/vnd.plotly.v1+json': {
                // Configure plotly
                const config = value.config || {};
                const layout = value.layout || {};
                config.displaylogo = false;
                config.displayModeBar = false;
                config.scrollZoom = true;
                layout.dragmode = 'pan';
                layout.hovermode = 'closest';
                layout.font = { size: s.fontSize };
                layout.hoverlabel = {
                  font: { size: s.fontSize },
                  bgcolor: '#ffffff',
                  bordercolor: '#000000',
                  fontFamily: 'sans-serif',
                };
                layout.width = 'auto';
                layout.height = 'auto';
                // Rebuild the plotly plot
                return <Plot key={i} data={value.data} layout={layout} config={config} />;
              }
              case 'application/pdf':
                // Open a iframe with the pdf
                return <PdfViewer key={i} data={value} />;
              case 'application/json':
                // Render the json as string into a PRE tag
                return <pre key={i}>{JSON.stringify(value, null, 2)}</pre>;
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
            <Ansi>{line}</Ansi>
          ))}
        </>
      )}
    </Box>
  );
}
