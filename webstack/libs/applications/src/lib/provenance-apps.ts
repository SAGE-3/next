/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { AppName } from './types';

// If app is not in list, it will not be eligable to start the provence link via the linker interaction mode

// Provenance Constraints
interface InboundRelationships {
  [key: string]: {
    relationship: 'one->app' | 'many->app';
    cyclic: boolean
  };
}

export type PROVENANCE_CONSTRAINTS_TYPE = {
  name: AppName;
  outboundRelationship: 'app->many' | 'app->one';
  inboundRelationships: InboundRelationships
}

export const PROVENANCE_CONSTRAINTS: PROVENANCE_CONSTRAINTS_TYPE[] = [
  {
    name: 'SageCell' as AppName,
    outboundRelationship: 'app->many',
    inboundRelationships: {
      ['SageCell' as AppName]: {
        relationship: 'one->app',
        cyclic: false,
      },
      ['Stickie' as AppName]: {
        relationship: 'many->app',
        cyclic: true,
      },
    },
  },
  {
    name: 'Stickie' as AppName,
    outboundRelationship: 'app->many',
    inboundRelationships: {
      ['SageCell' as AppName]: {
        relationship: 'one->app',
        cyclic: true,
      },
      ['Stickie' as AppName]: {
        relationship: 'many->app',
        cyclic: true,
      },
    },
  },
];

