/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { Tree } from './data';

/**
 * SAGE3 application: DocuSAGE
 * created by: Ben
 */

export const schema = z.object({
  selectedTopic: z.string().nullable().optional(),
  filteredData: z.custom<Tree>().nullable().optional(),
  visualizationType: z.enum(['treemap', 'tsne', 'linegraph']),
  depth: z.number().optional(),
  data: z.custom<Tree>().optional(),
});

export type state = z.infer<typeof schema>;

export const initialState: state = {
  visualizationType: 'treemap',
  selectedTopic: null,
  filteredData: null,
  depth: 1,  // Set to 1 for initial view
  data: undefined,
};

export const name = 'DocuSAGE';

// Export the init state for the app registry
export const init = initialState;
