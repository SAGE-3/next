/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppProps } from '@sage3/shared/types';

export const meta = {
  name: 'Notes',
  description: 'Notes',
  showInMenu: false,
  initialSize: {
    width: 400,
    height: 340,
  },
  data: {
    text: ['code'],
  },
  state: {},
} as const;

export type StickyNoteProps = AppProps<typeof meta>;
