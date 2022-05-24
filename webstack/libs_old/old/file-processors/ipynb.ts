/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import * as fsModule from 'fs';
const fs = fsModule.promises;

import { getFullFilePath, getStaticAssetUrl } from '../util/path-util';
import { FileLoader } from '../util/types';

// Event system to add the new asset
import { EventNames, SAGE3Events } from '@sage3/backend/events';

const ipynbLoader: FileLoader = (filename, register, metadata) => {
  // Send a message to add the file into the asset manager
  SAGE3Events.emit(EventNames.AssetInfo, {
    action: 'add',
    owner: metadata?.ownerName || 'sage',
    boardId: metadata?.boardId || "-",
    id: filename,
    originalfilename: metadata?.filename,
  });

  return register.loadable(
    '.ipynb',
    (notebookId) =>
      fs
        .readFile(getFullFilePath(filename))
        .then((notebook) => JSON.parse(notebook.toString()))
        .then((parsed) => ({
          cells: parsed.cells.map(
            (cell: { cell_type: 'markdown' | 'code'; source: string | string[]; outputs: { data: Record<string, unknown> }[] }) => {
              let data: string;
              if (cell.cell_type === 'markdown') {
                data = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
              } else {
                if (cell.outputs && cell.outputs[0]) {
                  data = 'data:image/png;base64,' + (cell.outputs?.[0]?.data?.['image/png'] ?? '');
                }
              }

              return register.static(
                'notebook-cell',
                (cellId) => ({
                  source: register.static(
                    'code',
                    {
                      source: (cell.source as string[]).join(''),
                    },
                    {
                      language: cell.cell_type === 'markdown' ? 'markdown' : parsed.metadata.kernelspec.name,
                      createdFrom: cellId,
                    }
                  ),
                  output:
                    cell.outputs && cell.outputs[0]
                      ? register.static('image', { src: data, aspectRatio: 1 }, { createdFrom: cellId })
                      : register.static(
                          'code',
                          {
                            source: data,
                          },
                          {
                            language: 'markdown',
                            createdFrom: cellId,
                          }
                        ),
                }),
                {
                  createdFrom: notebookId,
                }
              );
            }
          ),
        })),
    { filename, asset: getStaticAssetUrl(filename), ...metadata }
  );
};

export default ipynbLoader;
