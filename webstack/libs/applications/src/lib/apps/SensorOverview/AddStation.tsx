/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React from 'react';
import { Box, Button, Text } from '@chakra-ui/react';

function AddStation() {
  return (
    <>
      <Box p="1rem" w="21rem" h="12rem" border="solid white 1px">
        <Button>+ Add Station</Button>
      </Box>
    </>
  );
}

export default AddStation;
