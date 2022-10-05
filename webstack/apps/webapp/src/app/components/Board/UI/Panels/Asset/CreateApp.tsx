/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// File information
import { FileEntry } from './types';
import { isImage, isPDF, isCSV, isText, isJSON, isVideo, isDZI, isGeoJSON, isPython, isGLTF, isGIF } from '@sage3/shared';

import { ExtraImageType, ExtraPDFType } from '@sage3/shared/types';
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
  userId: string
): Promise<AppSchema> {
  return new Promise((resolve) => {
    const w = 400;
    if (isGIF(file.type)) {
      resolve({
        name: 'ImageViewer',
        description: 'Image',
        roomId: roomId,
        boardId: boardId,
        ownerId: userId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: w, height: w, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'ImageViewer',
        state: { ...initialValues['ImageViewer'], assetid: '/api/assets/static/' + file.filename },
        minimized: false,
        raised: true,
      });
    } else if (isImage(file.type)) {
      // Look for the file in the asset store
      const extras = file.derived as ExtraImageType;
      resolve({
        name: 'ImageViewer',
        description: 'Image',
        roomId: roomId,
        boardId: boardId,
        ownerId: userId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: w, height: w / (extras.aspectRatio || 1), depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'ImageViewer',
        state: { ...initialValues['ImageViewer'], assetid: file.id },
        minimized: false,
        raised: true,
      });
    } else if (isVideo(file.type)) {
      resolve({
        name: 'VideoViewer',
        description: 'Video',
        roomId: roomId,
        boardId: boardId,
        ownerId: userId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 800, height: 450, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'VideoViewer',
        state: { ...(initialValues['VideoViewer'] as AppState), assetid: file.id },
        minimized: false,
        raised: true,
      });
    } else if (isCSV(file.type)) {
      resolve({
        name: 'CVSViewer',
        description: 'CSV',
        roomId: roomId,
        boardId: boardId,
        ownerId: userId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 800, height: 400, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'CSVViewer',
        state: { ...initialValues['CSVViewer'], assetid: file.id },
        minimized: false,
        raised: true,
      });
    } else if (isGLTF(file.type)) {
      resolve({
        name: 'GLTFViewer',
        description: 'GLTF',
        roomId: roomId,
        boardId: boardId,
        ownerId: userId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 600, height: 600, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'GLTFViewer',
        state: { ...initialValues['GLTFViewer'], assetid: file.id },
        minimized: false,
        raised: true,
      });
    } else if (isDZI(file.type)) {
      resolve({
        name: 'DeepZoomImage',
        description: 'DeepZoomImage',
        roomId: roomId,
        boardId: boardId,
        ownerId: userId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 800, height: 400, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'DeepZoomImage',
        state: { ...initialValues['DeepZoomImage'] as AppState, assetid: file.id },
        minimized: false,
        raised: true
      });
    } else if (isGeoJSON(file.type)) {
      resolve({
        name: 'LeafLet',
        description: 'LeafLet',
        roomId: roomId,
        boardId: boardId,
        ownerId: userId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 800, height: 400, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'LeafLet',
        state: { ...initialValues['LeafLet'] as AppState, assetid: file.id },
        minimized: false,
        raised: true
      });
    } else if (isText(file.type)) {
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
            name: 'Stickie',
            description: 'Stickie',
            roomId: roomId,
            boardId: boardId,
            ownerId: userId,
            position: { x: xDrop, y: yDrop, z: 0 },
            size: { width: 400, height: 400, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'Stickie',
            state: { ...(initialValues['Stickie'] as AppState), text: text },
            minimized: false,
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
            name: 'CodeCell',
            description: 'CodeCell',
            roomId: roomId,
            boardId: boardId,
            ownerId: userId,
            position: { x: xDrop, y: yDrop, z: 0 },
            size: { width: 400, height: 400, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'CodeCell',
            state: { ...(initialValues['CodeCell'] as AppState), code: text },
            minimized: false,
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
            name: 'VegaLite',
            description: file.originalfilename,
            roomId: roomId,
            boardId: boardId,
            ownerId: userId,
            position: { x: xDrop, y: yDrop, z: 0 },
            size: { width: 500, height: 600, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'VegaLite',
            state: { ...initialValues['VegaLite'], spec: JSON.stringify(spec, null, 2) },
            minimized: false,
            raised: true,
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
        name: 'PDFViewer',
        description: 'PDF',
        roomId: roomId,
        boardId: boardId,
        ownerId: userId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 400, height: 400 / aspectRatio, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'PDFViewer',
        state: { ...initialValues['PDFViewer'], assetid: file.id },
        minimized: false,
        raised: true,
      });
    }
  });
}
