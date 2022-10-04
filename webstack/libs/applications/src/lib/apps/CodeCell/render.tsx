/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import React from 'react';
import {
  Box, HStack, useColorModeValue, Alert, AlertIcon, AlertTitle, Text, Image,
} from '@chakra-ui/react';

import Ansi from 'ansi-to-react';

import './components/styles.css';

/**
 * What does it do?
 * @param output
 * @returns
 */
export const ProcessedOutput = (output: string) => {
  try {
    const parsed = JSON.parse(output);
    return (
      <Box
        p={4}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          overflowX: 'auto',
          backgroundColor: useColorModeValue('#F0F2F6', '#111111'),
          boxShadow: '0 0 0 2px ' + useColorModeValue('rgba(0,0,0,0.4)', 'rgba(0, 128, 128, 0.5)'),
          borderRadius: '4px',
        }}
      >
        <HStack>
          <pre>
            {parsed.execute_result && RenderExecutionCount(parsed.execute_result.execution_count)}
            <Box>
              {parsed.stream && parsed.stream.name === 'stdout' && RenderStdOut(parsed.stream.text)}
              {parsed.stream && parsed.stream.name === 'stderr' && RenderStdErr(parsed.stream.text)}
              {parsed.execute_result &&
                parsed.execute_result.data['text/plain'] &&
                !parsed.execute_result.data['text/html'] &&
                RenderPlainText(parsed.execute_result.data['text/plain'])}
              {parsed.execute_result && parsed.execute_result.data['text/html'] && RenderHTML(parsed.execute_result.data['text/html'])}
              {parsed.display_data && parsed.display_data.data['image/png'] && RenderPNG(parsed.display_data.data['image/png'])}
              {parsed.display_data && parsed.display_data.data['image/jpeg'] && RenderJPEG(parsed.display_data.data['image/jpeg'])}
              {parsed.display_data && parsed.display_data.data['image/svg+xml'] && RenderSVG(parsed.display_data.data['image/svg+xml'])}
              {parsed.display_data && parsed.display_data.data['text/plain'] && RenderPlainText(parsed.display_data.data['text/plain'])}
              {parsed.display_data && parsed.display_data.data['text/html'] && RenderHTML(parsed.display_data.data['text/html'])}
              {parsed.error && Array.isArray(parsed.error) && parsed.error.map((line: string) => RenderTraceBack(line))}
              {parsed.error && parsed.error.evalue && RenderError(parsed.error.evalue)}
            </Box>
          </pre>
        </HStack>
      </Box>
    );
  } catch (e) {
    return ('')
  }
};

const RenderHTML = (html: string): JSX.Element => {
  return (
    <Box
      dangerouslySetInnerHTML={{ __html: html }}
      className={'rendered_html'}
    />
  );
};

const RenderTraceBack = (line: string): JSX.Element => {
  return (
    <>
      <Alert status="error" variant="left-accent">
        <Ansi>{line}</Ansi>
      </Alert>
    </>
  );
};

const RenderError = (msg: string | string[]): JSX.Element => {
  return (
    <>
      <Alert status="error" variant="left-accent">
        <AlertIcon />
        <AlertTitle mr={2}>{JSON.stringify(msg)}</AlertTitle>
      </Alert>
    </>
  );
};

const RenderPNG = (encoding: string, ww?: number | string, hh?: number | string): JSX.Element => {
  // base64 encoded image
  const url = 'data:image/png;base64,' + encoding;
  return <Image src={url} maxWidth="100%" display={'block'} width={ww ? ww : 'auto'} height={hh ? hh : 'auto'} alt="" />;
};

const RenderJPEG = (encoding: string, ww?: number | string, hh?: number | string): JSX.Element => {
  // base64 encoded image
  const url = 'data:image/jpeg;base64,' + encoding;
  return <Image src={url} maxWidth="100%" display={'block'} width={ww ? ww : 'auto'} height={hh ? hh : 'auto'} alt="" />;
};

const RenderSVG = (svg: string): JSX.Element => {
  return <Box dangerouslySetInnerHTML={{ __html: svg }} />;
};

const RenderStdErr = (stderr: string): JSX.Element => {
  return <Text color={'red'}>{stderr}</Text>;
};

const RenderStdOut = (stdout: string): JSX.Element => {
  return <Text color={'gray'}>{stdout}</Text>;
};

const RenderExecutionCount = (executionCount: number, color?: string): JSX.Element => {
  return (
    <Text fontFamily={'mono'} fontSize={'sm'} color={color ? color : 'gray'}>
      Out [{executionCount}]:
    </Text>
  );
};

const RenderPlainText = (plaintext: string | string[]): JSX.Element => {
  return (
    <Text fontFamily={'mono'} fontSize="xs" fontWeight={'normal'} wordBreak={'break-word'}>
      {plaintext}
    </Text>
  );
};
