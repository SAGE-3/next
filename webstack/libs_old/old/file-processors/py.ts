/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { getFullFilePath } from '../util/path-util';
import { FileLoader } from '../util/types';

import * as fsModule from 'fs';
const fs = fsModule.promises;

// Event system to add the new asset
import { EventNames, SAGE3Events } from '@sage3/backend/events';

const pyLoader: FileLoader = (filename, register, metadata) => {
  // Send a message to add the file into the asset manager
  SAGE3Events.emit(EventNames.AssetInfo, {
    action: 'add',
    owner: metadata?.ownerName || 'sage',
    boardId: metadata?.boardId || '-',
    id: filename,
    originalfilename: metadata?.filename,
  });

  return register.loadable(
    'text',
    () =>
      fs
        .readFile(getFullFilePath(filename))
        .then((buffer) => buffer.toString())
        .then((text) => {
          return { source: text };
        }),
    {}
  );
};

export default pyLoader;
