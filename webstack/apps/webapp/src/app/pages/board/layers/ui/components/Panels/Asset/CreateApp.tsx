/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// File information
import { FileEntry } from './types';
import { isImage, isTiff, isGeoTiff, isPDF, isCSV, isMD, isJSON, isVideo, isDZI, isGeoJSON, isPython, isGLTF, isGIF, isPythonNotebook } from '@sage3/shared';
import { GetConfiguration, apiUrls } from '@sage3/frontend';
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
): Promise<AppSchema | null> {
  const w = 400;
  if (isGeoTiff(file.type)) {
    return {
      title: file.originalfilename,
      roomId: roomId,
      boardId: boardId,
      position: { x: xDrop, y: yDrop, z: 0 },
      size: { width: 400, height: 400, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'MapGL',
      state: { ...(initialValues['MapGL'] as AppState), assetid: file.id },
      raised: true,
      dragging: false,
    };
  } else if (isGIF(file.type)) {
    return {
      title: file.originalfilename,
      roomId: roomId,
      boardId: boardId,
      position: { x: xDrop, y: yDrop, z: 0 },
      size: { width: w, height: w, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'ImageViewer',
      state: { ...initialValues['ImageViewer'], assetid: apiUrls.assets.getAssetById(file.filename) },
      raised: true,
      dragging: false,
    };
  } else if (isImage(file.type)) {
    // Might be geotiff in disguise
    if (isTiff(file.type)) {
      // Look for the metadata, maybe it's a GeoTiff
      if (file.metadata) {
        const localurl = apiUrls.assets.getAssetById(file.metadata);
        // Get the content of the file
        const response = await fetch(localurl, {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });
        const metadata = await response.json();
        // Check if it is a GeoTiff
        if (metadata && metadata.GeoTiffVersion) {
          return {
            title: file.originalfilename,
            roomId: roomId,
            boardId: boardId,
            position: { x: xDrop, y: yDrop, z: 0 },
            size: { width: 400, height: 400, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'MapGL',
            state: { ...(initialValues['MapGL'] as AppState), assetid: file.id },
            raised: true,
            dragging: false,
          };
        }
      }
    }
    // Look for the file in the asset store
    const extras = file.derived as ExtraImageType;
    return {
      title: file.originalfilename,
      roomId: roomId,
      boardId: boardId,
      position: { x: xDrop, y: yDrop, z: 0 },
      size: { width: w, height: w / (extras.aspectRatio || 1), depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'ImageViewer',
      state: { ...initialValues['ImageViewer'], assetid: file.id },
      raised: true,
      dragging: false,
    };
  } else if (isVideo(file.type)) {
    const extras = file.derived as ExtraImageType;
    let vw = 800;
    let vh = 450;
    const ar = extras.aspectRatio || 1;
    if (ar > 1) {
      vh = Math.round(vw / ar);
    } else {
      vw = Math.round(vh * ar);
    }
    return {
      title: file.originalfilename,
      roomId: roomId,
      boardId: boardId,
      position: { x: xDrop, y: yDrop, z: 0 },
      size: { width: vw, height: vh, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'VideoViewer',
      state: { ...(initialValues['VideoViewer'] as AppState), assetid: file.id },
      raised: true,
      dragging: false,
    };
  } else if (isCSV(file.type)) {
    return {
      title: file.originalfilename,
      roomId: roomId,
      boardId: boardId,
      position: { x: xDrop, y: yDrop, z: 0 },
      size: { width: 800, height: 400, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'CSVViewer',
      state: { ...initialValues['CSVViewer'], assetid: file.id },
      raised: true,
      dragging: false,
    };
  } else if (isGLTF(file.type)) {
    return {
      title: file.originalfilename,
      roomId: roomId,
      boardId: boardId,
      position: { x: xDrop, y: yDrop, z: 0 },
      size: { width: 600, height: 600, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'GLTFViewer',
      state: { ...initialValues['GLTFViewer'], assetid: file.id },
      raised: true,
      dragging: false,
    };
  } else if (isDZI(file.type)) {
    return {
      title: file.originalfilename,
      roomId: roomId,
      boardId: boardId,
      position: { x: xDrop, y: yDrop, z: 0 },
      size: { width: 800, height: 400, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'DeepZoomImage',
      state: { ...(initialValues['DeepZoomImage'] as AppState), assetid: file.id },
      raised: true,
      dragging: false,
    };
  } else if (isGeoJSON(file.type)) {
    return {
      title: file.originalfilename,
      roomId: roomId,
      boardId: boardId,
      position: { x: xDrop, y: yDrop, z: 0 },
      size: { width: 400, height: 400, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'MapGL',
      state: { ...(initialValues['MapGL'] as AppState), assetid: file.id },
      raised: true,
      dragging: false,
    };
  } else if (isMD(file.type)) {
    // Look for the file in the asset store
    const localurl = apiUrls.assets.getAssetById(file.filename);
    // Get the content of the file
    const response = await fetch(localurl, {
      headers: {
        'Content-Type': 'text/plain',
        Accept: 'text/plain',
      },
    });
    const text = await response.text();
    // Create a note from the text
    return {
      title: user.data.name,
      roomId: roomId,
      boardId: boardId,
      position: { x: xDrop, y: yDrop, z: 0 },
      size: { width: 400, height: 400, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'Stickie',
      state: { ...(initialValues['Stickie'] as AppState), text: text },
      raised: true,
      dragging: false,
    };
  } else if (isPython(file.type)) {
    // Look for the file in the asset store
    const localurl = apiUrls.assets.getAssetById(file.filename);
    // Get the content of the file
    const response = await fetch(localurl, {
      headers: {
        'Content-Type': 'text/plain',
        Accept: 'text/plain',
      },
    });
    const text = await response.text();
    return {
      title: file.originalfilename,
      roomId: roomId,
      boardId: boardId,
      position: { x: xDrop, y: yDrop, z: 0 },
      size: { width: 400, height: 400, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'SageCell',
      state: { ...(initialValues['SageCell'] as AppState), code: text },
      raised: true,
      dragging: false,
    };
  } else if (isJSON(file.type)) {
    // Look for the file in the asset store
    const localurl = apiUrls.assets.getAssetById(file.filename);
    // Get the content of the file
    const response = await fetch(localurl, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    const spec = await response.json();
    // Create a note from the text
    return {
      title: file.originalfilename,
      roomId: roomId,
      boardId: boardId,
      position: { x: xDrop, y: yDrop, z: 0 },
      size: { width: 500, height: 600, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'VegaLite',
      state: { ...initialValues['VegaLite'], spec: JSON.stringify(spec, null, 2) },
      raised: true,
      dragging: false,
    };
  } else if (isPythonNotebook(file.type)) {
    // Look for the file in the asset store
    const localurl = apiUrls.assets.getAssetById(file.filename);
    // Get the content of the file
    const response = await fetch(localurl, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    const spec = await response.json();
    // Create a notebook file in Jupyter with the content of the file
    const conf = await GetConfiguration();
    if (conf.token) {
      // Create a new notebook
      const base = `http://${window.location.hostname}:8888`;
      // Talk to the jupyter server API
      const j_url = base + apiUrls.assets.getNotebookByName(file.originalfilename);
      const payload = { type: 'notebook', path: '/notebooks', format: 'json', content: spec };
      // Create a new notebook
      const response = await fetch(j_url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token ' + conf.token,
        },
        body: JSON.stringify(payload),
      });
      const res = await response.json();
      console.log('Jupyter> notebook created', res);
      return {
        title: file.originalfilename,
        roomId: roomId,
        boardId: boardId,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 700, height: 700, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'JupyterLab',
        state: { ...(initialValues['JupyterLab'] as any), notebook: file.originalfilename },
        raised: true,
        dragging: false,
      };
    }
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
    return {
      title: file.originalfilename,
      roomId: roomId,
      boardId: boardId,
      position: { x: xDrop, y: yDrop, z: 0 },
      size: { width: 400, height: 400 / aspectRatio, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'PDFViewer',
      state: { ...initialValues['PDFViewer'], assetid: file.id },
      raised: true,
      dragging: false,
    };
  }
  return null;
}
