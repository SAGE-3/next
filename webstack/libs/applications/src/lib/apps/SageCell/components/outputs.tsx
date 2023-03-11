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
      const dataOutput = Object.keys(data).map((key, i): JSX.Element => {
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
            // Open a iframe with the pdf
            return <PdfViewer key={i} data={value} />;
          case 'application/json':
            // Render the json as string into a PRE tag
            return <pre key={i}>{JSON.stringify(value, null, 2)}</pre>;
          default:
            return <></>;
        }
      });
      setOutput((prev) => [...prev, ...dataOutput]);
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
      {p.execute_result && (
        <Text key={p.execute_result.execution_count} color={'red'} fontSize="sm">
          Out[{p.execute_result.execution_count}]:
        </Text>
      )}
      {output}
    </Box>
  );
}

//   useEffect(() => {
//     let output: JSX.Element;
//     if (stream && stream.name === 'stdout') {
//       output = <Ansi>{stream.text}</Ansi>;
//     }
//     if (stream && stream.name === 'stderr') {
//       output = (
//         // highlight the stderr output in red
//         <Text as={'mark'} bg={'#0C0'}>
//           <Ansi>{stream.text}</Ansi>
//         </Text>
//       );
//     }
//     setOutput((prev) => [...prev, output]);
//     if (error) {
//       output = (
//         <Box key={executionCount}>
//           {error.traceback.map((el, idx) => (
//             <>
//               <Ansi key={idx}>{el}</Ansi>
//               <br />
//             </>
//           ))}
//         </Box>
//       );
//       setOutput((prev) => [...prev, output]);
//     }
//     if (p.display_data || p.execute_result) {
//       if (data && Object.keys(data).length > 0) {
//         const outputData = Object.keys(data).map((key, i) => {
//           const value = data[key];
//           switch (key) {
//             case 'text/html':
//               return <Box key={i} dangerouslySetInnerHTML={{ __html: value as string }} />;
//             case 'text/plain':
//               if (data!['text/html']) return null;
//               return <Ansi key={i}>{value as string}</Ansi>;
//             case 'image/png':
//               return <Image key={i} src={`data:image/png;base64,${value}`} />;
//             case 'image/jpeg':
//               return <Image key={i} src={`data:image/jpeg;base64,${value}`} />;
//             case 'image/svg+xml':
//               return <Box key={i} dangerouslySetInnerHTML={{ __html: value as string }} />;
//             case 'text/markdown':
//               return <Markdown key={i} data={value} openInWebview={openInWebview} />;
//             case 'application/vnd.vegalite.v4+json':
//             case 'application/vnd.vegalite.v3+json':
//             case 'application/vnd.vegalite.v2+json':
//               return <VegaLite key={i} spec={JSON.parse(value)} actions={false} renderer="svg" />;
//             case 'application/vnd.vega.v5+json':
//             case 'application/vnd.vega.v4+json':
//             case 'application/vnd.vega.v3+json':
//             case 'application/vnd.vega.v2+json':
//             case 'application/vnd.vega.v1+json':
//               return <Vega key={i} spec={value} actions={false} renderer="svg" />;
//             case 'application/vnd.plotly.v1+json': {
//               // Configure plotly
//               const config = value.config || {};
//               const layout = value.layout || {};
//               config.displaylogo = false;
//               config.displayModeBar = false;
//               config.scrollZoom = true;
//               layout.dragmode = 'pan';
//               layout.hovermode = 'closest';
//               layout.font = { size: s.fontSize };
//               layout.hoverlabel = {
//                 font: { size: s.fontSize },
//                 bgcolor: '#ffffff',
//                 bordercolor: '#000000',
//                 fontFamily: 'sans-serif',
//               };
//               layout.width = 'auto';
//               layout.height = 'auto';
//               // Rebuild the plotly plot
//               return <Plot key={i} data={value.data} layout={layout} config={config} />;
//             }
//             case 'application/pdf':
//               // Open a iframe with the pdf
//               return <PdfViewer key={i} data={value} />;
//             case 'application/json':
//               // Render the json as string into a PRE tag
//               return <pre key={i}>{JSON.stringify(value, null, 2)}</pre>;
//             default:
//               return (
//                 <Box>
//                   <Accordion allowToggle>
//                     <AccordionItem>
//                       <AccordionButton>
//                         <Box flex="1" textAlign="left">
//                           <Text color="red" fontSize={s.fontSize}>
//                             Error: {key} is not supported in this version of SAGECell.
//                           </Text>
//                         </Box>
//                         <AccordionIcon />
//                       </AccordionButton>
//                       <AccordionPanel pb={4}>
//                         <pre>{JSON.stringify(value, null, 2)}</pre>
//                       </AccordionPanel>
//                     </AccordionItem>
//                   </Accordion>
//                 </Box>
//               );

//       }
//     }, [p.msg_count]);

//   return (
//     <Box
//       m={1}
//       // Interactive styling
//       className={'output ' + useColorModeValue('output-area-light', 'output-area-dark')}
//       background={useColorModeValue(`#f4f4f4`, `#1b1b1b`)}
//       borderLeft={`0.2em solid ${useHexColor(ownerColor)}`}
//       fontSize={s.fontSize + 'px'}
//     >
//       {executionCount && (
//         <Text key={executionCount} color={'red'} fontSize="sm">
//           Out[{executionCount}]:
//         </Text>
//       )}
//       {output}
//     </Box>
//   );
// }

//   if (data) {
//     const outputData = Object.keys(data).map((key, i) => {
//           const value = data![key];
//           switch (key) {
//             case 'text/html':
//               return <Box key={i} dangerouslySetInnerHTML={{ __html: value }} />;
//             case 'text/plain':
//               if (data!['text/html']) return null;
//               return <Ansi key={i}>{value}</Ansi>;
//             case 'image/png':
//               return <Image key={i} src={`data:image/png;base64,${value}`} />;
//             case 'image/jpeg':
//               return <Image key={i} src={`data:image/jpeg;base64,${value}`} />;
//             case 'image/svg+xml':
//               return <Box key={i} dangerouslySetInnerHTML={{ __html: value }} />;
//             case 'text/markdown':
//               return <Markdown key={i} data={value} openInWebview={openInWebview} />;
//             case 'application/vnd.vegalite.v4+json':
//             case 'application/vnd.vegalite.v3+json':
//             case 'application/vnd.vegalite.v2+json':
//               return <VegaLite key={i} spec={value} actions={false} renderer="svg" />;
//             case 'application/vnd.vega.v5+json':
//             case 'application/vnd.vega.v4+json':
//             case 'application/vnd.vega.v3+json':
//             case 'application/vnd.vega.v2+json':
//             case 'application/vnd.vega.v1+json':
//               return <Vega key={i} spec={value} actions={false} renderer="svg" />;
//             case 'application/vnd.plotly.v1+json': {
//               // Configure plotly
//               const config = value.config || {};
//               const layout = value.layout || {};
//               config.displaylogo = false;
//               config.displayModeBar = false;
//               config.scrollZoom = true;
//               layout.dragmode = 'pan';
//               layout.hovermode = 'closest';
//               layout.font = { size: s.fontSize };
//               layout.hoverlabel = {
//                 font: { size: s.fontSize },
//                 bgcolor: '#ffffff',
//                 bordercolor: '#000000',
//                 fontFamily: 'sans-serif',
//               };
//               layout.width = 'auto';
//               layout.height = 'auto';
//               // Rebuild the plotly plot
//               return <Plot key={i} data={value.data} layout={layout} config={config} />;
//             }
//             case 'application/pdf':
//               // Open a iframe with the pdf
//               return <PdfViewer key={i} data={value} />;
//             case 'application/json':
//               // Render the json as string into a PRE tag
//               return <pre key={i}>{JSON.stringify(value, null, 2)}</pre>;
//             default:
//               return (
//                 <Box>
//                   <Accordion allowToggle>
//                     <AccordionItem>
//                       <AccordionButton>
//                         <Box flex="1" textAlign="left">
//                           <Text color="red" fontSize={s.fontSize}>
//                             Error: {key} is not supported in this version of SAGECell.
//                           </Text>
//                         </Box>
//                         <AccordionIcon />
//                       </AccordionButton>
//                       <AccordionPanel pb={4}>
//                         <pre>{JSON.stringify(value, null, 2)}</pre>
//                       </AccordionPanel>
//                     </AccordionItem>
//                   </Accordion>
//                 </Box>
//               );
//           }
//         })}
//     setOutput(output.concat(outputData));
//   } else if (stream) {
//     const outputData = (
//       <Box key={stream.name} p={2} bg={useColorModeValue('gray.100', 'gray.700')} borderRadius="md">
//         <Ansi>{stream.text}</Ansi>
//       </Box>
//     );
//     setOutput(output.concat(outputData));
//   } else if (error) {
//     const outputData = (
//       <Box key={error.ename} p={2} bg={useColorModeValue('gray.100', 'gray.700')} borderRadius="md">
//         <Ansi>{error.evalue}</Ansi>
//       </Box>
//     );
//     setOutput(output.concat(outputData));
//   }
// }

// if (s.kernel) {
//   s.kernel.sendInputReply(requestId);
// }

// const [data, setData] = useState<Record<string, any>>(); // execute_result.data or display_data.data is unknown type
// const [executionCount, setExecutionCount] = useState<number>();
// const [error, setError] = useState<Error>();
// const [stream, setStream] = useState<Stream>();
// const [requestId, setRequestId] = useState<string>(props.requestId ? props.requestId : ''); // used to track the request id
// const [output, setOutput] = useState<JSX.Element[]>([]);

// const openInWebview = (url: string): void => {
//   createApp({
//     title: 'Webview',
//     roomId: props.app.data.roomId,
//     boardId: props.app.data.boardId,
//     position: { x: props.app.data.position.x + props.app.data.size.width + 20, y: props.app.data.position.y, z: 0 },
//     size: { width: 600, height: props.app.data.size.height, depth: 0 },
//     rotation: { x: 0, y: 0, z: 0 },
//     type: 'Webview',
//     state: { webviewurl: url },
//     raised: true,
//   });
// };

/**
 * UseEffect hook to update the state of the output box
 * based on the output received from the kernel. This
 * is triggered when the output prop changes.
 *
 * Set the data, execution count, and metadata based on the output type
 */
// useEffect(() => {
//   // Parse the output received from the kernel
//   const p = JSON.parse(props.output) as Result;
//   const requestId = p.request_id;
//   if (p.execute_result) {
//     setData(p.execute_result.data);
//     setExecutionCount(p.execute_result.execution_count);
//   } else if (p.display_data) {
//     setData(p.display_data.data);
//   } else if (p.stream) {
//     let incoming = p.stream.text;
//     if (requestId === msgId && stream && stream.text !== p.stream.text) {
//       incoming = stream.text + incoming;
//     }
//     setStream({ name: p.stream.name, text: incoming });
//   } else if (p.error) {
//     setError(p.error);
//   } else {
//     console.log('SAGECell> unknown output', p);
//   }
//   setMsgId(requestId);
// }, [props.output]);

// Get the color of the kernel owner
//   useEffect(() => {
//     if (s.kernel && users) {
//       const kernels = s.availableKernels;
//       const owner = kernels.find((el) => el.key === s.kernel)?.value.owner_uuid;
//       const ownerColor = users.find((el) => el._id === owner)?.data.color;
//       setOwnerColor(ownerColor || '#000000');
//     }
//   }, [s.kernel, users]);

//   return (
//     <Box
//       // Interactive styling
//       className={'output ' + useColorModeValue('output-area-light', 'output-area-dark')}
//       background={useColorModeValue(`#f4f4f4`, `#1b1b1b`)}
//       borderLeft={`0.2em solid ${useHexColor(ownerColor)}`}
//       fontSize={s.fontSize + 'px'}
//     >
//       {!executionCount ? null : (
//         <Text color="red" fontSize={s.fontSize + 'px'}>
//           {`Out[${executionCount}]:`}
//         </Text>
//       )}
//       {!stream ? null : <Ansi>{stream.text}</Ansi>}
//       {!data
//         ? null
//         : Object.keys(data).map((key, i) => {
//             const value = data[key];
//             switch (key) {
//               case 'text/html':
//                 if (!data[key]) return null; // hides other outputs if html is present
//                 return <Box key={i} dangerouslySetInnerHTML={{ __html: value }} />;
//               case 'text/plain':
//                 if (data['text/html']) return null;
//                 return <Ansi key={i}>{value}</Ansi>;
//               case 'image/png':
//                 return <Image key={i} src={`data:image/png;base64,${value}`} />;
//               case 'image/jpeg':
//                 return <Image key={i} src={`data:image/jpeg;base64,${value}`} />;
//               case 'image/svg+xml':
//                 return <Box key={i} dangerouslySetInnerHTML={{ __html: value }} />;
//               case 'text/markdown':
//                 return <Markdown key={i} data={value} openInWebview={openInWebview} />;
//               case 'application/vnd.vegalite.v4+json':
//               case 'application/vnd.vegalite.v3+json':
//               case 'application/vnd.vegalite.v2+json':
//                 return <VegaLite key={i} spec={value} actions={false} renderer="svg" />;
//               case 'application/vnd.vega.v5+json':
//               case 'application/vnd.vega.v4+json':
//               case 'application/vnd.vega.v3+json':
//               case 'application/vnd.vega.v2+json':
//               case 'application/vnd.vega.v1+json':
//                 return <Vega key={i} spec={value} actions={false} renderer="svg" />;
//               case 'application/vnd.plotly.v1+json': {
//                 // Configure plotly
//                 const config = value.config || {};
//                 const layout = value.layout || {};
//                 config.displaylogo = false;
//                 config.displayModeBar = false;
//                 config.scrollZoom = true;
//                 layout.dragmode = 'pan';
//                 layout.hovermode = 'closest';
//                 layout.font = { size: s.fontSize };
//                 layout.hoverlabel = {
//                   font: { size: s.fontSize },
//                   bgcolor: '#ffffff',
//                   bordercolor: '#000000',
//                   fontFamily: 'sans-serif',
//                 };
//                 layout.width = 'auto';
//                 layout.height = 'auto';
//                 // Rebuild the plotly plot
//                 return <Plot key={i} data={value.data} layout={layout} config={config} />;
//               }
//               case 'application/pdf':
//                 // Open a iframe with the pdf
//                 return <PdfViewer key={i} data={value} />;
//               case 'application/json':
//                 // Render the json as string into a PRE tag
//                 return <pre key={i}>{JSON.stringify(value, null, 2)}</pre>;
//               default:
//                 return (
//                   <Box>
//                     <Accordion allowToggle>
//                       <AccordionItem>
//                         <AccordionButton>
//                           <Box flex="1" textAlign="left">
//                             <Text color="red" fontSize={s.fontSize}>
//                               Error: {key} is not supported in this version of SAGECell.
//                             </Text>
//                           </Box>
//                           <AccordionIcon />
//                         </AccordionButton>
//                         <AccordionPanel pb={4}>
//                           <pre>{JSON.stringify(value, null, 2)}</pre>
//                         </AccordionPanel>
//                       </AccordionItem>
//                     </Accordion>
//                   </Box>
//                 );
//             }
//           })}
//       {!error ? null : (
//         <>
//           <Alert status="error">
//             <Icon as={MdError} />
//             <Code
//               style={{
//                 fontFamily: 'monospace',
//                 display: 'inline-block',
//                 marginLeft: '0.5em',
//                 marginRight: '0.5em',
//                 fontWeight: 'bold',
//                 background: 'transparent',
//                 fontSize: s.fontSize,
//               }}
//             >
//               {error.ename}: <Ansi>{error.evalue}</Ansi>
//             </Code>
//           </Alert>
//           {Object(error.traceback).map((line: string) => (
//             <Ansi>{line}</Ansi>
//           ))}
//         </>
//       )}
//     </Box>
//   );
// }
