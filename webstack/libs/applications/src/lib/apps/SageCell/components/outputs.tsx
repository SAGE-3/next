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

import { App } from '../../../schema';
import { Output, state as AppState } from '../index';

type OutputBoxProps = {
  output: string;
  app: App;
};

export function Outputs(props: OutputBoxProps): JSX.Element {
  if (!props.output) return <></>;
  const s = props.app.data.state as AppState;
  const p = JSON.parse(props.output) as Output;
  // Data stores
  const users = useUsersStore((state) => state.users);
  const createApp = useAppStore((state) => state.create);
  const updateState = useAppStore((state) => state.updateState);
  // Application state
  const [ownerColor, setOwnerColor] = useState<string>('#000000');
  const [count, setCount] = useState<number | null>(null);
  // const data = p.execute_result?.data || p.display_data?.data;
  // const stream = p.stream;
  // const error = p.error;
  const [prevId, setPrevId] = useState<string>(); // used to track the request id
  const [output, setOutput] = useState<JSX.Element[]>([]);

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

  // Get the color of the kernel owner
  useEffect(() => {
    if (s.kernel && users) {
      const kernels = s.availableKernels;
      const owner = kernels.find((el) => el.key === s.kernel)?.value.owner_uuid;
      const ownerColor = users.find((el) => el._id === owner)?.data.color;
      setOwnerColor(ownerColor || '#000000');
    }
  }, [s.kernel, users]);

  useEffect(() => {
    if (prevId !== p.request_id) {
      setPrevId(p.request_id);
      setOutput([]);
    }
  }, [p.request_id]);

  useEffect(() => {
    if (p.execute_result) {
      setCount(p.execute_result.execution_count);
    }
    if (p.stream) {
      let streamOutput: JSX.Element;
      if (p.stream.name === 'stdout') {
        streamOutput = <Ansi>{p.stream.text}</Ansi>;
      } else {
        streamOutput = (
          <Text as={'mark'} bg={'#0C0'}>
            <Ansi>{p.stream.text}</Ansi>
          </Text>
        );
      }
      setOutput((prev) => [...prev, streamOutput]);
    }

    if (p.error) {
      let errorOutput: JSX.Element;
      const traceback = p.error.traceback;
      errorOutput = (
        <Box key={p.error.ename}>
          {traceback.map((el, idx) => (
            <>
              <Ansi>{el}</Ansi>
            </>
          ))}
        </Box>
      );
      setOutput((prev) => [...prev, errorOutput]);
    }

    if (p.execute_result || p.display_data) {
      const metadata = p.execute_result?.metadata || p.display_data?.metadata;
      const data = p.execute_result?.data || p.display_data?.data;
      if (data) {
        const dataOutput = Object.keys(data).map((key, i): JSX.Element => {
          if (key === 'undefined') return <></>;
          const value = data[key];
          const width = metadata[key] ? metadata[key]['width'] : 'auto';
          const height = metadata[key] ? metadata[key]['height'] : 'auto';
          switch (key) {
            case 'text/html':
              return <Box key={i} dangerouslySetInnerHTML={{ __html: value }} />;
            case 'text/plain':
              if (data['text/html']) return <></>;
              if (data['text/markdown']) return <></>;
              return <Ansi key={i}>{value}</Ansi>;
            case 'image/png':
              const size = metadata[key];
              return <Image key={i} src={`data:image/png;base64,${value}`} width={width} height={height} />;
            case 'image/jpeg':
              return <Image key={i} src={`data:image/jpeg;base64,${value}`} width={width} height={height} />;
            case 'image/svg+xml':
              return <Box key={i} dangerouslySetInnerHTML={{ __html: value }} />;
            case 'text/markdown':
              return <Markdown key={i} markdown={`${value}`} openInWebview={openInWebview} />;
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
              return <PdfViewer key={i} data={value} />;
            default:
              return <></>;
          }
        });
        setOutput((prev) => [...prev, ...dataOutput]);
      }
    }
  }, [p.msg_count]);

  return (
    <Box
      m={1}
      // Interactive styling
      className={'output ' + useColorModeValue('output-area-light', 'output-area-dark')}
      background={useColorModeValue(`#f4f4f4`, `#1b1b1b`)}
      borderLeft={`0.2em solid ${useHexColor(ownerColor)}`}
      fontSize={s.fontSize + 'px'}
    >
      {count && (
        <Text key={count} color={'red'} fontSize="sm">
          Out[{count}]:
        </Text>
      )}
      {!output ? <Text>No results to display.</Text> : output}
    </Box>
  );
}
