/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// File information
import { FileEntry } from './types';
import { isImage, isPDF, isCSV, isMD, isJSON, isVideo, isDZI, isGeoJSON, isPython, isGLTF, isGIF, isPythonNotebook } from '@sage3/shared';

import { GetConfiguration } from '@sage3/frontend';
import { ExtraImageType, ExtraPDFType, User } from '@sage3/shared/types';
import { initialValues } from '@sage3/applications/initialValues';
import { AppState, AppSchema } from '@sage3/applications/schema';

/**
 * Setup an application for a given file type
 *
 * @export
 * @param {FileEntry} file
 * @param {number} xDrop
 * @param {number} yDrop
 * @param {string} roomId
 * @param {string} boardId
 * @param {string} userId
 * @returns {Promise<AppSchema>}
 */
export async function setupAppForFile(
  file: FileEntry,
  xDrop: number,
  yDrop: number,
  roomId: string,
  boardId: string,
  user: User
): Promise<AppSchema> {
  return new Promise((resolve) => {
    const w = 400;
    if (isGIF(file.type)) {
      resolve({
        title: file.originalfilename,
        roomId: roomId,
        boardId: boardId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: w, height: w, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'ImageViewer',
        state: { ...initialValues['ImageViewer'], assetid: '/api/assets/static/' + file.filename },
        raised: true,
      });
    } else if (isImage(file.type)) {
      // Look for the file in the asset store
      const extras = file.derived as ExtraImageType;
      resolve({
        title: file.originalfilename,
        roomId: roomId,
        boardId: boardId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: w, height: w / (extras.aspectRatio || 1), depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'ImageViewer',
        state: { ...initialValues['ImageViewer'], assetid: file.id },
        raised: true,
      });
    } else if (isVideo(file.type)) {
      resolve({
        title: file.originalfilename,
        roomId: roomId,
        boardId: boardId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 800, height: 450, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'VideoViewer',
        state: { ...(initialValues['VideoViewer'] as AppState), assetid: file.id },
        raised: true,
      });
    } else if (isCSV(file.type)) {
      resolve({
        title: file.originalfilename,
        roomId: roomId,
        boardId: boardId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 800, height: 400, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'CSVViewer',
        state: { ...initialValues['CSVViewer'], assetid: file.id },
        raised: true,
      });
    } else if (isGLTF(file.type)) {
      resolve({
        title: file.originalfilename,
        roomId: roomId,
        boardId: boardId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 600, height: 600, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'GLTFViewer',
        state: { ...initialValues['GLTFViewer'], assetid: file.id },
        raised: true,
      });
    } else if (isDZI(file.type)) {
      resolve({
        title: file.originalfilename,
        roomId: roomId,
        boardId: boardId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 800, height: 400, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'DeepZoomImage',
        state: { ...(initialValues['DeepZoomImage'] as AppState), assetid: file.id },
        raised: true,
      });
    } else if (isGeoJSON(file.type)) {
      resolve({
        title: file.originalfilename,
        roomId: roomId,
        boardId: boardId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 800, height: 400, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'LeafLet',
        state: { ...(initialValues['LeafLet'] as AppState), assetid: file.id },
        raised: true,
      });
    } else if (isMD(file.type)) {
      // Look for the file in the asset store
      const localurl = '/api/assets/static/' + file.filename;
      // Get the content of the file
      fetch(localurl, {
        headers: {
          'Content-Type': 'text/plain',
          Accept: 'text/plain',
        },
      })
        .then(function (response) {
          return response.text();
        })
        .then(function (text) {
          // Create a note from the text
          resolve({
            title: user.data.name,
            roomId: roomId,
            boardId: boardId,
            position: { x: xDrop, y: yDrop, z: 0 },
            size: { width: 400, height: 400, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'Stickie',
            state: { ...(initialValues['Stickie'] as AppState), text: text },
            raised: true,
          });
        });
    } else if (isPython(file.type)) {
      // Look for the file in the asset store
      const localurl = '/api/assets/static/' + file.filename;
      // Get the content of the file
      fetch(localurl, {
        headers: {
          'Content-Type': 'text/plain',
          Accept: 'text/plain',
        },
      })
        .then(function (response) {
          return response.text();
        })
        .then(function (text) {
          // Create a note from the text
          resolve({
            title: file.originalfilename,
            roomId: roomId,
            boardId: boardId,
            position: { x: xDrop, y: yDrop, z: 0 },
            size: { width: 400, height: 400, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'CodeCell',
            state: { ...(initialValues['CodeCell'] as AppState), code: text },
            raised: true,
          });
        });
    } else if (isJSON(file.type)) {
      // Look for the file in the asset store
      const localurl = '/api/assets/static/' + file.filename;
      // Get the content of the file
      fetch(localurl, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })
        .then(function (response) {
          return response.json();
        })
        .then(function (spec) {
          // Create a note from the text
          resolve({
            title: file.originalfilename,
            roomId: roomId,
            boardId: boardId,
            position: { x: xDrop, y: yDrop, z: 0 },
            size: { width: 500, height: 600, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'VegaLite',
            state: { ...initialValues['VegaLite'], spec: JSON.stringify(spec, null, 2) },
            raised: true,
          });
        });
    } else if (isPythonNotebook(file.type)) {
      // Look for the file in the asset store
      const localurl = '/api/assets/static/' + file.filename;
      // Get the content of the file
      fetch(localurl, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })
        .then(function (response) {
          return response.json();
        })
        .then(function (spec) {
          // Create a notebook file in Jupyter with the content of the file
          GetConfiguration().then((conf) => {
            if (conf.token) {
              // Create a new notebook
              let base: string;
              if (conf.production) {
                base = `https://${window.location.hostname}:4443`;
              } else {
                base = `http://${window.location.hostname}`;
              }
              // Talk to the jupyter server API
              const j_url = base + '/api/contents/notebooks/' + file.originalfilename;
              const payload = { type: 'notebook', path: '/notebooks', format: 'json', content: spec };
              // Create a new notebook
              fetch(j_url, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: 'Token ' + conf.token,
                },
                body: JSON.stringify(payload),
              })
                .then((response) => response.json())
                .then((res) => {
                  console.log('Jupyter> notebook created', res);

                  resolve({
                    title: file.originalfilename,
                    roomId: roomId,
                    boardId: boardId,
                    position: { x: xDrop, y: yDrop, z: 0 },
                    size: { width: 700, height: 700, depth: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    type: 'JupyterLab',
                    state: { ...(initialValues['JupyterLab'] as any), notebook: file.originalfilename },
                    raised: true,
                  });
                });
            }
          });
        });
    } else if (isPDF(file.type)) {
      // Look for the file in the asset store
      const pages = file.derived as ExtraPDFType;
      let aspectRatio = 1;
      if (pages) {
        // First page
        const page = pages[0];
        // First image of the page
        aspectRatio = page[0].width / page[0].height;
      }
      resolve({
        title: file.originalfilename,
        roomId: roomId,
        boardId: boardId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 400, height: 400 / aspectRatio, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'PDFViewer',
        state: { ...initialValues['PDFViewer'], assetid: file.id },
        raised: true,
      });
    }
  });
}
