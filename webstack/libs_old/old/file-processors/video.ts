/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { FileLoader } from '../util/types';
import { getStaticAssetUrl } from '../util/path-util';

// Event system to add the new asset
import {  EventNames,  SAGE3Events, } from '@sage3/backend/events';

const videoLoader: FileLoader = (filename, register, metadata) => {
  // Send a message to add the file into the asset manager
  SAGE3Events.emit(EventNames.AssetInfo, {
    action: 'add',
    owner: metadata?.ownerName || 'sage',
    boardId: metadata?.boardId || "-",
    id: filename,
    originalfilename: metadata?.filename,
  });

  return register.static('video', { source: getStaticAssetUrl(filename) }, { filename, asset: getStaticAssetUrl(filename), ...metadata });
};

export default videoLoader;
