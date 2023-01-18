/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue, Alert, AlertIcon, Box, Text, Image } from '@chakra-ui/react';
import { App } from '@sage3/applications/schema';
import { useAppStore } from '@sage3/frontend';
import Ansi from 'ansi-to-react';
import { state as AppState } from '../index';

type OutputBoxProps = {
  app: App;
};

function isObject(obj: any) {
  return obj !== undefined && obj !== null && obj.constructor == Object;
}

export const OutputBox = (props: OutputBoxProps): JSX.Element => {
  // State
  const s = props.app.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  // Parsed Output
  if (!isObject(s.output)) return <>Empty Output</>;
  const parsedJSON = JSON.parse(s.output);

  console.log(parsedJSON);

  return (
    <Box
      hidden={!parsedJSON ? true : false}
      style={{
        overflow: 'auto',
        backgroundColor: useColorModeValue('#F0F2F6', '#111111'),
        boxShadow: '0 0 0 2px ' + useColorModeValue('rgba(0,0,0,0.4)', 'rgba(0, 128, 128, 0.5)'),
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: s.fontSize + 'px',
        color: useColorModeValue('#000000', '#FFFFFF'),
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
      }}
    >
      {!parsedJSON.execute_result || !parsedJSON.execute_result.execution_count ? null : (
        <Text
          fontSize="xs"
          color="gray.500"
          style={{
            fontFamily: 'monospace',
          }}
        >
          {`Out [${parsedJSON.execute_result.execution_count}]`}
        </Text>
      )}
      {parsedJSON.request_id ? null : null}
      {!parsedJSON.error ? null : !Array.isArray(parsedJSON.error) ? (
        <Alert status="error">{`${parsedJSON.error.ename}: ${parsedJSON.error.evalue}`}</Alert>
      ) : (
        <Alert status="error" variant="left-accent">
          <AlertIcon />
          <Ansi>{parsedJSON.error[parsedJSON.error.length - 1]}</Ansi>
        </Alert>
      )}

      {!parsedJSON.stream ? null : parsedJSON.stream.name === 'stdout' ? (
        <Text id="sc-stdout">{parsedJSON.stream.text}</Text>
      ) : (
        <Text id="sc-stderr" color="red">
          {parsedJSON.stream.text}
        </Text>
      )}

      {!parsedJSON.display_data
        ? null
        : Object.keys(parsedJSON.display_data).map((key) => {
            if (key === 'data') {
              return Object.keys(parsedJSON.display_data.data).map((key, i) => {
                switch (key) {
                  case 'text/plain':
                    return (
                      <Text key={i} id="sc-stdout">
                        {parsedJSON.display_data.data[key]}
                      </Text>
                    );
                  case 'text/html':
                    return <div key={i} dangerouslySetInnerHTML={{ __html: parsedJSON.display_data.data[key] }} />;
                  case 'image/png':
                    return <Image key={i} src={`data:image/png;base64,${parsedJSON.display_data.data[key]}`} />;
                  case 'image/jpeg':
                    return <Image key={i} src={`data:image/jpeg;base64,${parsedJSON.display_data.data[key]}`} />;
                  case 'image/svg+xml':
                    return <div key={i} dangerouslySetInnerHTML={{ __html: parsedJSON.display_data.data[key] }} />;
                  default:
                    return MapJSONObject(parsedJSON.display_data[key]);
                }
              });
            }
            return null;
          })}

      {!parsedJSON.execute_result
        ? null
        : Object.keys(parsedJSON.execute_result).map((key) => {
            if (key === 'data') {
              return Object.keys(parsedJSON.execute_result.data).map((key, i) => {
                switch (key) {
                  case 'text/plain':
                    if (parsedJSON.execute_result.data['text/html']) return null; // don't show plain text if there is html
                    return (
                      <Text key={i} id="sc-stdout">
                        {parsedJSON.execute_result.data[key]}
                      </Text>
                    );
                  case 'text/html':
                    return <div key={i} dangerouslySetInnerHTML={{ __html: parsedJSON.execute_result.data[key] }} />;
                  case 'image/png':
                    return <Image key={i} src={`data:image/png;base64,${parsedJSON.execute_result.data[key]}`} />;
                  case 'image/jpeg':
                    return <Image key={i} src={`data:image/jpeg;base64,${parsedJSON.execute_result.data[key]}`} />;
                  case 'image/svg+xml':
                    return <div key={i} dangerouslySetInnerHTML={{ __html: parsedJSON.execute_result.data[key] }} />;
                  default:
                    return null;
                }
              });
            }
            return null;
          })}
    </Box>
  );
};

const MapJSONObject = (obj: any): JSX.Element => {
  if (!obj) return <></>;
  if (typeof obj === 'object' && Object.keys(obj).length === 0) return <></>;
  return (
    <Box
      pl={2}
      ml={2}
      bg={useColorModeValue('#FFFFFF', '#000000')}
      boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.6)'}
      rounded={'md'}
      fontSize={'16px'}
      color={useColorModeValue('#000000', '#FFFFFF')}
    >
      {typeof obj === 'object'
        ? Object.keys(obj).map((key) => {
            if (typeof obj[key] === 'object') {
              return (
                <Box key={key}>
                  <Box as="span" fontWeight="bold">
                    {key}:
                  </Box>
                  <Box as="span" ml={2}>
                    {MapJSONObject(obj[key])}
                  </Box>
                </Box>
              );
            } else {
              return (
                <Box key={key}>
                  <Box as="span" fontWeight="bold">
                    {key}:
                  </Box>
                  <Box as="span" ml={2}>
                    {obj[key]}
                  </Box>
                </Box>
              );
            }
          })
        : null}
    </Box>
  );
};
