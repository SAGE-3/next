/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppProps } from '@sage3/shared/types';

export const meta = {
  name: 'Video Viewer',
  description: 'Video Viewer',
  showInMenu: false,
  data: {
    file: 'video',
  },
  initialSize: {
    width: 720,
    height: 405,
  },
  state: {
    state: {
      type: 'atom',
      initialState: {
        loop: false,
        paused: true,
        currentTime: 0,
        syncTime: -1,
        who: '',
      } as VideoState,
    },
  },
} as const;

export type VideoViewerProps = AppProps<typeof meta>;

export interface VideoState {
  loop: boolean;
  paused: boolean;
  currentTime: number;
  syncTime: number;
  who: string;
}
