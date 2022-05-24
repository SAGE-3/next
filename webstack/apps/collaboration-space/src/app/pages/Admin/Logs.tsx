/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';

import { Heading, Box } from '@chakra-ui/react';
// Shows a list of logs, an array passed as props

export function Logs({ logs }: { logs: string[] }): JSX.Element {
  // Build a list of the log elements
  const listLines = logs.map((line, i) => (
    <p style={{ marginBottom: 0 }} key={i}>
      <code>{JSON.stringify(line, null, 2)}</code>
    </p>
  ));

  // Simple div
  return (
    <Box p={6} textAlign="left">
      <Heading as="h2" size="lg">
        Fluentd Logs
      </Heading>
      <div>{listLines}</div>
    </Box>
  );
}
