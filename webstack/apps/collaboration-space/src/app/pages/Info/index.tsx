/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';

import { Box } from '@chakra-ui/react';

import { PageLayout } from '@sage3/frontend/components';
import { Information } from './information';

export function Info(): JSX.Element {
  return (
    <PageLayout title="Information">
      <Box>
        <Information />
      </Box>
    </PageLayout>
  );
}
