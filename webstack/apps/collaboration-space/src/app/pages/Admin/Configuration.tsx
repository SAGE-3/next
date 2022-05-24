/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect } from 'react';

import { Heading, Box } from '@chakra-ui/react';

import axios from 'axios';

export const Configuration: React.FC = () => {

  useEffect(() => {
    axios
      .get('/api/configuration')
      .then((res) => {
        const config = res.data;
        console.log('Config', config)
      })
      .catch((error) => {
        if (!error.response.data.authentication) document.location.href = '/';
      });
  }, []);

  return (
    <Box p={6} textAlign="left">
      <Heading as="h3">Configuration</Heading>
    </Box>
  );
};

