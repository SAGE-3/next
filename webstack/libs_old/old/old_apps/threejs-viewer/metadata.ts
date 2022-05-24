/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppProps } from '@sage3/shared/types';

export type threePos = { x: number; y: number; z: number };
export type threeState = { cameraPosition: threePos };
export type file = { url: string };

export const meta = {
  name: 'Three JS',
  description: 'Three.js Demo',
  showInMenu: false,
  initialSize: {
    width: 350,
    height: 300,
  },
  data: {
    file: '.obj',
  },
  state: {
    state: {
      type: 'atom',
      initialState: {
        cameraPosition: { x: 0, y: 0, z: 150 } as threePos,
      } as threeState,
    },
    object: {
      type: 'atom',
      initialState: { value: '' },
    },
  },
} as const;

export type ThreejsViewerProps = AppProps<typeof meta>;
