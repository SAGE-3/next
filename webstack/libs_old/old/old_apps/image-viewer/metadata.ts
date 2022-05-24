/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppProps, smartFunctionsReducer, SmartFunctions } from '@sage3/shared/types';

export const meta = {
  name: 'Image Viewer',
  description: 'Image Viewer',
  showInMenu: false,
  initialSize: {
    width: 400,
    height: 400,
  },
  initialLayout: {
    type: 'carousel',
    state: 0,
  },
  data: {
    image: ['image'],
  },
  state: {
    smartFunctions: {
      type: 'reducer',
      initialState: { actions: {}, run: '' } as SmartFunctions,
      reducer: smartFunctionsReducer,
    },
  },
} as const;

export type ImageViewerProps = AppProps<typeof meta>;
