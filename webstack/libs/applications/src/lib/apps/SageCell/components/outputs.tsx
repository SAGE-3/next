/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';

import { Box, Image, Text, useColorModeValue } from '@chakra-ui/react';

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

import { v4 as getUUID } from 'uuid';

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
  // Application state
  const [ownerColor, setOwnerColor] = useState<string>('#000000');
  const [count, setCount] = useState<number | null>(null);
  const [prevId, setPrevId] = useState<string>(); // used to track the request id
  const [output, setOutput] = useState<JSX.Element[]>([]);

  // const errorColor = useColorModeValue('rgb(250, 223, 222)', 'rgb(075, 036, 029)');

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

  // Get the color of the kernel owner --- move this above and pass it down
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
    // if (!p) return;
    if (p.execute_result) {
      setCount(p.execute_result.execution_count);
    }
    if (p.stream) {
      let streamOutput: JSX.Element;
      if (p.stream.name === 'stdout') {
        streamOutput = <Ansi>{p.stream.text}</Ansi>;
      } else {
        streamOutput = (
          <Text as={'mark'} bg={'rgb(250, 223, 222)'}>
            <Box bgColor={'#0C0'}>
              <Ansi>{p.stream.text}</Ansi>
            </Box>
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
          {traceback.map((line, idx) => (
            <Ansi key={idx}>{line}</Ansi>
          ))}
        </Box>
      );
      setOutput((prev) => [...prev, errorOutput]);
    }

    if (p.execute_result || p.display_data) {
      const metadata = p.execute_result?.metadata || p.display_data?.metadata;
      const data = p.execute_result?.data || p.display_data?.data;
      if (data) {
        for (const [key, value] of Object.entries(data)) {
          const width = metadata[key] ? metadata[key]['width'] : 'auto';
          const height = metadata[key] ? metadata[key]['height'] : 'auto';
          const uuid = getUUID();
          switch (key) {
            case 'text/html':
            case 'image/svg+xml':
              let html_template = `<!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <script src="https://unpkg.com/jupyter-js-widgets@2.0.*/dist/embed.js"></script>
                  <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.1.10/require.min.js"></script>
                  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.0.3/jquery.min.js"></script>
                </head>
                <body>
                  <div tabindex="-1" id="notebook" className="border-box-sizing">
                    <div className="container" id="notebook-container">
                      ${value}
                    </div>
                  </div>
                </body>
              </html>`;
              setOutput((prev) => [...prev, <Markdown key={uuid} markdown={`${value}`} openInWebview={openInWebview} />]);

              // setOutput((prev) => [...prev, <Box key={uuid} dangerouslySetInnerHTML={{ __html: value }} width={width} height={height} />]);
              break;
            case 'text/plain':
              /**
               * We hide text/plain if there is another output type
               */
              if (Object.keys(data).length > 1) break;
              setOutput((prev) => [...prev, <Ansi key={uuid}>{value}</Ansi>]);
              break;
            case 'image/png':
              setOutput((prev) => [...prev, <Image key={uuid} src={`data:image/png;base64,${value}`} width={width} height={height} />]);
              break;
            case 'image/jpeg':
              setOutput((prev) => [...prev, <Image key={uuid} src={`data:image/jpeg;base64,${value}`} width={width} height={height} />]);
              break;
            case 'application/pdf':
              setOutput((prev) => [...prev, <PdfViewer key={uuid} data={value} />]);
              break;
            case 'text/markdown':
              setOutput((prev) => [...prev, <Markdown key={uuid} markdown={`${value}`} openInWebview={openInWebview} />]);
              break;
            case 'application/vnd.vegalite.v4+json':
            case 'application/vnd.vegalite.v3+json':
            case 'application/vnd.vegalite.v2+json':
              setOutput((prev) => [...prev, <VegaLite key={uuid} spec={value} actions={false} renderer="svg" />]);
              break;
            case 'application/vnd.vega.v5+json':
            case 'application/vnd.vega.v4+json':
            case 'application/vnd.vega.v3+json':
            case 'application/vnd.vega.v2+json':
            case 'application/vnd.vega.v1+json':
              setOutput((prev) => [...prev, <Vega key={uuid} spec={value} actions={false} renderer="svg" />]);
              break;
            case 'application/vnd.plotly.v1+json':
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
              setOutput((prev) => [...prev, <Plot key={uuid} data={value.data} layout={layout} config={config} />]);
              break;
            default:
              const jsxElement = <Text color="red">SAGECell does not currently support the ${key} mime-type</Text>;
              setOutput((prev) => [...prev, jsxElement]);
              break;
          }
        }
      }
    }
  }, [p.msg_count]);

  return (
    <>
      <Box
        m={1}
        className={'output ' + useColorModeValue('output-area-light', 'output-area-dark')}
        background={useColorModeValue(`#fff`, `#171717`)}
        borderLeft={`0.2em solid ${useHexColor(ownerColor)}`}
        fontSize={s.fontSize + 'px'}
      >
        {count && (
          <Text color={'red'} fontSize="sm">
            Out[{count}]:
          </Text>
        )}
        {!output ? null : output}
      </Box>
    </>
  );
}
