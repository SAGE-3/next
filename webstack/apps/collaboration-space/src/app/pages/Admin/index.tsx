/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useState, useEffect } from 'react';

import { Tabs, TabList, TabPanels, Tab, TabPanel, Divider, Box } from '@chakra-ui/react';

import { FaLink, FaFile } from 'react-icons/fa';

import { PageLayout } from '@sage3/frontend/components';

import { Logs } from './Logs';
import { Configuration } from './Configuration';
import { useSocket } from '@sage3/frontend/utils/misc/socket';

export function Admin() {
  // const socket = useSocket();

  // // Initialize the logs state with an sample array
  // const [logs, addLogs] = useState(['# LOGS #']);

  // useEffect(() => {
  //   function newLogs(someLogs: string[]) {
  //     addLogs([...logs, ...someLogs]);
  //   }
  //   // When new messages arrive, add them to the logs
  //   socket.on('logs', newLogs);
  //   return () => {
  //     socket.off('logs', newLogs);
  //   };
  // }, []);

  return (
    <PageLayout title="Information">
      <Box>
        <Configuration />
        <Divider />
        {/* <Logs logs={logs} /> */}
      </Box>
    </PageLayout>
  );
}
