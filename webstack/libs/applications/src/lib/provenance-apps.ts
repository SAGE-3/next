/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { AppName } from './types';

// If app is not in list, it will not be eligable to start the provence link via the linker interaction mode
export type PROVENANCE_CONSTRAINTS_TYPE = {
  name: AppName;
  relationship: 'one->app->one' | 'many->app->many' | 'one->app->many' | 'many->app->one' // this can definately get confusing with multiple types of apps
  // relationshipInboundRule: 'one->app' | 'many->app'
  allowCylic: boolean
  allowSources?: AppName[]
  blockSources?: AppName[]
}

// Provenance Constraints
export const PROVENANCE_CONSTRAINTS: PROVENANCE_CONSTRAINTS_TYPE[] = [
    {
      name: 'SageCell' as AppName,
      relationship: 'one->app->many',
      // relationshipInboundRule: 'one->app',
      allowCylic: false,
      allowSources: ['SageCell', 'Stickie'] as AppName[],
    },
  ];