/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { setupApp, useAppStore, useUIStore } from '@sage3/frontend';
import { AppSchema } from '@sage3/applications/schema';
import { randomSAGEColor } from '@sage3/shared';

export function useNotebookUtils(): {
  explodeNotebook: (file: string, boardPosition: { x: number; y: number }, roomId: string, boardId: string) => void;
} {
  // Appstore create app
  const createApp = useAppStore((state) => state.create);
  // UI Store fitapps
  const fitApps = useUIStore((state) => state.fitApps);

  async function explodeNotebook(filename: string, boardPosition: { x: number; y: number }, roomId: string, boardId: string) {
    // calculate the size required for the notebook
    const appWidth = 800;
    const appHeight = 300;
    const appSize = { w: appWidth, h: appHeight };
    const spacing = 40;
    const xDrop = -boardPosition.x + 40;
    const yDrop = -boardPosition.y + 1400;
    // list to store apps to create
    const appsToCreate: AppSchema[] = [];

    // Look for the file in the asset store
    const localurl = '/api/assets/static/' + filename;
    const randomColor: string = randomSAGEColor();

    //   // Get the content of the file
    const response = await fetch(localurl, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    const rjson = await response.json();

    const cells = rjson.cells;
    let columnCount = 0;
    const columnHeight = 5;
    let x = xDrop;
    let y = yDrop;

    cells.forEach((cell: any) => {
      let output: any = null;
      let source: string = '';
      if (cell.cell_type === 'code') {
        source = (cell.source as []).join('');
        const outputs = cell.outputs[0];
        if (outputs) {
          output = { [outputs['output_type']]: outputs };
          // need to convert all the arrays to strings
          Object.keys(output).forEach((key) => {
            if (key === 'stream' && output[key].text instanceof Array) {
              output[key].text = output[key].text.join('');
            }
            if (key === 'execute_result' || key === 'display_data') {
              Object.keys(output[key].data).forEach((dataKey) => {
                if (output[key].data[dataKey] instanceof Array) {
                  output[key].data[dataKey] = output[key].data[dataKey].join('');
                }
              });
            }
            if (key === 'error') {
              output[key].traceback = output[key].traceback.join('');
            }
          });
        }
      } else if (cell.cell_type === 'markdown') {
        output = { display_data: { data: { 'text/markdown': cell.source.join('') } } };
      }
      const appToCreate = setupApp('', 'SageCell', x, y, roomId, boardId, appSize, {
        code: source ? source : '',
        output: output ? JSON.stringify(output) : '',
        groupColor: randomColor,
      });
      appsToCreate.push(appToCreate);
      y = y + appHeight + spacing;
      columnCount++;
      if (columnCount >= columnHeight) {
        columnCount = 0;
        x = x + appWidth + spacing;
        y = yDrop;
      }
    });

    const appPromises = appsToCreate.map((app) => createApp(app));
    const results = await Promise.all(appPromises);
    const filteredResults = results.filter((result: any) => result.success === true);
    const appsToFit = filteredResults.map((result: any) => result.data);
    console.log('appsToFit', appsToFit);
    fitApps(appsToFit);
  }
  return { explodeNotebook };
}
