/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useEffect, useState } from 'react';
import { ToastId, useToast } from '@chakra-ui/react';
// Upload with axios and progress event
import axios, { AxiosProgressEvent, AxiosError } from 'axios';
// Date manipulation (for filename)
import { format as dateFormat } from 'date-fns/format';

// File information
import {
  getMime,
  isValid,
  isImage,
  isGeoTiff,
  isPDF,
  isCSV,
  isMD,
  isJSON,
  isDZI,
  isGeoJSON,
  isVideo,
  isPython,
  isGLTF,
  isGIF,
  isFileURL,
  isTiff,
  isSessionFile,
  isCode,
  mimeToCode,
} from '@sage3/shared';
import { App, AppName, AppSchema, AppState } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';
import { Asset, ExtraImageType, ExtraPDFType } from '@sage3/shared/types';

import { apiUrls } from '../config';
import { useUser } from '../providers';
import { useAssetStore, useAppStore, useUIStore } from '../stores';

/**
 * Setup data structure to open an application
 *
 * @export
 * @param {AppName} appName
 * @param {number} x
 * @param {number} y
 * @param {string} roomId
 * @param {string} boardId
 * @param {string} userId
 */
export function setupApp(
  title: string,
  type: AppName,
  x: number,
  y: number,
  roomId: string,
  boardId: string,
  { w, h }: { w: number; h: number } = { w: 400, h: 400 },
  init: Partial<AppState> = {}
): AppSchema {
  return {
    title: title,
    roomId: roomId,
    boardId: boardId,
    position: { x: x, y: y, z: 0 },
    size: { width: w, height: h, depth: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    type: type,
    state: { ...(initialValues[type] as AppState), ...init },
    raised: true,
    dragging: false,
    pinned: false,
  };
}

// Functions to export
type UseFiles = {
  uploadFiles: (input: File[], dx: number, dy: number, roomId: string, boardId: string) => void;
  openAppForFile: (fileID: string, xDrop: number, yDrop: number, roomId: string, boardId: string) => Promise<AppSchema | null>;
  uploadInProgress: boolean;
};

/**
 * Open an application for a given asset
 *
 * @param {Asset} a - The asset to open
 * @param {number} xDrop - The x-coordinate where the file was dropped
 * @param {number} yDrop - The y-coordinate where the file was dropped
 * @param {string} roomId - The ID of the room
 * @param {string} boardId - The ID of the board
 * @returns {Promise<AppSchema | null>} - The schema of the created application or null
 */
async function openApplication(a: Asset, xDrop: number, yDrop: number, roomId: string, boardId: string): Promise<AppSchema | null> {
  const w = 400;
  const fileType = a.data.mimetype;
  const fileID = a._id;

  // Not a supported file type
  if (!isValid(fileType)) {
    // Create a generic asset link
    return setupApp('Asset', 'AssetLink', xDrop - 200, yDrop - 200, roomId, boardId, { w: 400, h: 375 }, { assetid: fileID });
  } else {
    // Check all the supported file types
    if (isGeoTiff(fileType)) {
      const initialLayer = {
        assetId: fileID,
        visible: true,
        color: 'red',
        colorScale: 'turbo',
        opacity: 1,
      } as NonNullable<(typeof initialValues)['Map']['layers']>[0];
      return setupApp(a.data.originalfilename, 'Map', xDrop, yDrop, roomId, boardId, { w: w, h: w }, { layers: [initialLayer] });
    } else if (isFileURL(fileType)) {
      const localurl = apiUrls.assets.getAssetById(a.data.file);
      // Get the content of the file
      const response = await fetch(localurl, {
        headers: {
          'Content-Type': 'text/plain',
          Accept: 'text/plain',
        },
      });
      // Get the content of the file
      const text = await response.text();
      const lines = text.split('\n');
      for (const line of lines) {
        // look for a line starting with URL=
        if (line.startsWith('URL')) {
          const words = line.split('=');
          // the URL
          const goto = words[1].trim();
          return setupApp(goto, 'WebpageLink', xDrop - 200, yDrop - 200, roomId, boardId, { w: w, h: w }, { url: goto });
        }
      }
      return null;
    } else if (isCode(fileType)) {
      const localurl = apiUrls.assets.getAssetById(a.data.file);
      // Get the content of the file
      const response = await fetch(localurl, {
        headers: {
          'Content-Type': 'text/plain',
          Accept: 'text/plain',
        },
      });
      // Get the content of the file
      const text = await response.text();
      // Get Language from mimetype
      const lang = mimeToCode(a.data.mimetype);
      // Create a note from the text
      return setupApp(
        'CodeEditor',
        'CodeEditor',
        xDrop,
        yDrop,
        roomId,
        boardId,
        { w: 850, h: 400 },
        { content: text, language: lang, filename: a.data.originalfilename }
      );
    } else if (isGIF(fileType)) {
      const extras = a.data.derived as ExtraImageType;
      const imw = w;
      const imh = w / (extras.aspectRatio || 1);
      return setupApp(a.data.originalfilename, 'ImageViewer', xDrop, yDrop, roomId, boardId, { w: imw, h: imh }, { assetid: fileID });
    } else if (isImage(fileType)) {
      // Check if it is a GeoTiff in disguise
      if (isTiff(fileType)) {
        // Look for the metadata, maybe it's a GeoTiff
        if (a.data.metadata) {
          const localurl = apiUrls.assets.getAssetById(a.data.metadata);
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
            const initialLayer = {
              assetId: fileID,
              visible: true,
              color: 'red',
              colorScale: 'turbo',
              opacity: 1,
            } as NonNullable<(typeof initialValues)['Map']['layers']>[0];
            return setupApp(a.data.originalfilename, 'Map', xDrop, yDrop, roomId, boardId, { w: w, h: w }, { layers: [initialLayer] });
          }
        }
      }
      // Look for the file in the asset store
      const extras = a.data.derived as ExtraImageType;
      return setupApp(
        a.data.originalfilename,
        'ImageViewer',
        xDrop,
        yDrop,
        roomId,
        boardId,
        { w: w, h: w / (extras.aspectRatio || 1) },
        { assetid: fileID }
      );
    } else if (isVideo(fileType)) {
      // Look for the file in the asset store
      const extras = a.data.derived as ExtraImageType;
      let vw = 800;
      let vh = 450;
      const ar = extras.aspectRatio || 1;
      if (ar > 1) {
        vh = Math.round(vw / ar);
      } else {
        vw = Math.round(vh * ar);
      }
      return setupApp('', 'VideoViewer', xDrop, yDrop, roomId, boardId, { w: vw, h: vh }, { assetid: fileID });
    } else if (isCSV(fileType)) {
      return setupApp('', 'CSVViewer', xDrop, yDrop, roomId, boardId, { w: 800, h: 400 }, { assetid: fileID });
    } else if (isDZI(fileType)) {
      return setupApp('', 'DeepZoomImage', xDrop, yDrop, roomId, boardId, { w: 800, h: 400 }, { assetid: fileID });
    } else if (isGLTF(fileType)) {
      return setupApp('', 'GLTFViewer', xDrop, yDrop, roomId, boardId, { w: 600, h: 600 }, { assetid: fileID });
    } else if (isGeoJSON(fileType)) {
      const initialLayer = {
        assetId: fileID,
        visible: true,
        color: 'red',
        colorScale: 'turbo',
        opacity: 1,
      } as NonNullable<(typeof initialValues)['Map']['layers']>[0];
      return setupApp('', 'Map', xDrop, yDrop, roomId, boardId, { w: 800, h: 400 }, { layers: [initialLayer] });
    } else if (isMD(fileType)) {
      const localurl = apiUrls.assets.getAssetById(a.data.file);
      // Get the content of the file
      const response = await fetch(localurl, {
        headers: {
          'Content-Type': 'text/plain',
          Accept: 'text/plain',
        },
      });
      const text = await response.text();
      // Create a note from the text
      return setupApp('Stickie', 'Stickie', xDrop, yDrop, roomId, boardId, { w: 400, h: 420 }, { text: text });
    } else if (isPython(fileType)) {
      const localurl = apiUrls.assets.getAssetById(a.data.file);
      // Get the content of the file
      const response = await fetch(localurl, {
        headers: {
          'Content-Type': 'text/plain',
          Accept: 'text/plain',
        },
      });
      const text = await response.text();
      // Create a note from the text
      return setupApp('SageCell', 'SageCell', xDrop, yDrop, roomId, boardId, { w: 400, h: 400 }, { code: text });
    } else if (isJSON(fileType)) {
      const localurl = apiUrls.assets.getAssetById(a.data.file);
      // Get the content of the file
      const response = await fetch(localurl, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      // Parse the JSON specification
      const spec = await response.json();
      // Create a visualization from the JSON spec using VegaLite
      return setupApp('', 'VegaLite', xDrop, yDrop, roomId, boardId, { w: 500, h: 600 }, { spec: JSON.stringify(spec, null, 2) });
    } else if (isPDF(fileType)) {
      // Get PDF metadata from derived data
      const pages = a.data.derived as ExtraPDFType;
      let aspectRatio = 1;
      if (pages) {
        // Get first page dimensions
        const page = pages[0];
        // Calculate aspect ratio from first page
        aspectRatio = page[0].width / page[0].height;
      }
      // Create PDF viewer app with proper dimensions
      return setupApp('', 'PDFViewer', xDrop, yDrop, roomId, boardId, { w: 400, h: 400 / aspectRatio }, { assetid: fileID });
    }
  }
  return null;
}

/**
 * Opens a saved session file and recreates all apps and assets
 *
 * @param a Asset containing the session file
 * @param xDrop X coordinate where to place the session
 * @param yDrop Y coordinate where to place the session
 * @param roomId Current room ID
 * @param boardId Current board ID
 * @returns Array of app schemas or null
 */
async function openSession(a: Asset, xDrop: number, yDrop: number, roomId: string, boardId: string): Promise<AppSchema[] | null> {
  const localurl = apiUrls.assets.getAssetById(a.data.file);
  // Get the session file content
  const response = await fetch(localurl, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
  // Parse the session data
  const session = await response.json();
  const apps = session.apps as App[];
  const newassets = session.assets as { id: string; url: string; filename: string }[];
  // Find top-left corner of all apps
  let xmin = useUIStore.getState().boardWidth;
  let ymin = useUIStore.getState().boardHeight;
  for (const app of apps) {
    const pos = app.data.position;
    if (pos.x < xmin) xmin = pos.x;
    if (pos.y < ymin) ymin = pos.y;
  }
  const batch: AppSchema[] = [];
  // Rebuild each app from the session
  for (const app of apps) {
    // Handle apps with associated assets
    if (app.data.state.assetid) {
      // Find the asset in the session
      const asset = newassets.find((a) => a.id === app.data.state.assetid);
      // download the old asset
      if (asset) {
        // Get the content of the file
        const response = await fetch(asset.url);
        const blob = await response.blob();
        // Create a form to upload the file
        const fd = new FormData();
        const codefile = new File([new Blob([blob])], asset.filename);
        fd.append('files', codefile);
        // Add fields to the upload form
        fd.append('room', roomId);
        // Upload with a POST request
        const up = await fetch(apiUrls.assets.upload, { method: 'POST', body: fd });
        const result = await up.json();
        const newasset = result[0];
        // Rebuild the app with the new asset
        app.data.state.assetid = newasset.id;
      }
    }
    // Create an application
    const newapp = {
      title: app.data.title,
      roomId: roomId,
      boardId: boardId,
      position: {
        x: app.data.position.x - xmin + xDrop,
        y: app.data.position.y - ymin + yDrop,
        z: 0,
      },
      size: app.data.size,
      rotation: app.data.rotation,
      type: app.data.type,
      state: app.data.state,
      raised: false,
      dragging: false,
      pinned: false,
    };
    batch.push(newapp);
  }
  return batch;
}

/**
 * Create an application after a file is uploaded
 *
 * @param {string} assetid - The ID of the uploaded asset
 * @param {number} xpos - The x-coordinate where the file was dropped
 * @param {number} ypos - The y-coordinate where the file was dropped
 * @param {string} roomId - The ID of the room
 * @param {string} boardId - The ID of the board
 * @returns {Promise<AppSchema[] | null>} - The schema of the created application(s) or null
 */
async function createApplicationAfterUpload(
  assetid: string,
  xpos: number,
  ypos: number,
  roomId: string,
  boardId: string
): Promise<AppSchema[] | null> {
  const assets = useAssetStore.getState().assets;
  for (const a of assets) {
    if (a._id === assetid) {
      if (isSessionFile(a.data.mimetype)) {
        const sess = await openSession(a, xpos, ypos, roomId, boardId);
        return sess;
      } else {
        const res = await openApplication(a, xpos, ypos, roomId, boardId);
        if (res) return [res];
        else return null;
      }
    }
  }
  return null;
}

export function useFiles(): UseFiles {
  // display some notifications
  const toast = useToast();
  // Handle to a toast
  const toastIdRef = useRef<ToastId>();
  // User store
  const { user } = useUser();
  // Assets store
  const assets = useAssetStore((state) => state.assets);
  // Upload success
  const [uploadSuccess, setUploadSuccess] = useState<string[]>([]);
  // Save the drop position
  const [configDrop, setConfigDrop] = useState({ xDrop: 0, yDrop: 0, roomId: '', boardId: '' });
  // Upload in progress
  const [uploadInProgress, setUploadInProgress] = useState(false);

  useEffect(() => {
    /**
     * Function to open applications after files are uploaded
     */
    async function openApps() {
      const createBatch = useAppStore.getState().createBatch;
      if (uploadSuccess.length > 0) {
        let xpos = configDrop.xDrop;
        const batch: AppSchema[] = [];
        for (const up of uploadSuccess) {
          const res = await createApplicationAfterUpload(up, xpos, configDrop.yDrop, configDrop.roomId, configDrop.boardId);
          if (res) {
            batch.push(...res);
            xpos += res[0].size.width + 10;
            console.log('Files> openApps - created app for asset', up);
          } else {
            console.log('Files> openApps - Could not find asset', up);
            toast({
              title: 'Error',
              description: 'Could not find asset ' + up,
              status: 'error',
              duration: 6000,
              isClosable: true,
            });
          }
        }
        createBatch(batch);
        setUploadSuccess([]);
      }
    }

    // When uplaod is done, open the apps
    openApps();
  }, [uploadSuccess, configDrop]);

  /**
   * Upload files and create applications for them
   *
   * @param {File[]} input - The list of files to upload
   * @param {number} dx - The x-coordinate where the files were dropped
   * @param {number} dy - The y-coordinate where the files were dropped
   * @param {string} roomId - The ID of the room
   * @param {string} boardId - The ID of the board
   */
  async function uploadFiles(input: File[], dx: number, dy: number, roomId: string, boardId: string) {
    if (input) {
      let filenames = '';
      // Uploaded with a Form object
      const fd = new FormData();
      // Add each file to the form
      const fileListLength = input.length;
      for (let i = 0; i < fileListLength; i++) {
        // check the mime type we got from the browser, and check with mime lib. if needed
        const filetype = input[i].type || getMime(input[i].name) || 'application/octet-stream';
        if (!isValid(filetype)) {
          toast({
            title: 'Unknown file type',
            description: `Limited support for type: ${input[i].type} for file ${input[i].name}`,
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        }
        if (isPDF(filetype) && input[i].size > 100 * 1024 * 1024) {
          // 100MB
          toast({
            title: 'File too large',
            description: 'PDF files must be smaller than 100MB - Flatten or Optimize your PDF',
            status: 'error',
            duration: 6000,
            isClosable: true,
          });
        } else {
          let item;
          // Rename file for called image.png coming from the clipboard
          if (input[i].name === 'image.png') {
            // Create a more meaningful name
            const dt = dateFormat(new Date(), 'yyyy-MM-dd-HH_mm_ss');
            const username = user?.data.name || 'user';
            const filename = username + '-' + dt + '.png';
            // Create a new file with the new name
            item = new File([input[i]], filename, { type: input[i].type });
          } else {
            item = input[i];
          }
          fd.append('files', item);
          if (filenames) filenames += ', ' + item.name;
          else filenames = item.name;
        }
      }

      // Add fields to the upload form
      fd.append('room', roomId);

      // Save the drop position
      setConfigDrop({ xDrop: dx, yDrop: dy, roomId: roomId, boardId: boardId });
      setUploadInProgress(true);

      // Upload with a POST request
      const response = await axios({
        method: 'post',
        url: apiUrls.assets.upload,
        data: fd,
        // onUploadProgress: (p: AxiosProgressEvent) => {
        // if (toastIdRef.current && p.progress) {
        //   const progress = (p.progress * 100).toFixed(0);
        //   if (p.progress < 1) {
        //     toast.update(toastIdRef.current, {
        //       title: 'Upload',
        //       description: 'Progress: ' + progress + '%',
        //       isClosable: true,
        //       duration: 5000,
        //     });
        //   }
        // }
        // },
      })
        .finally(() => {
          // Some errors with the files
          if (!filenames) {
            toast({
              title: 'Upload with Errors',
              status: 'warning',
              duration: 4000,
              isClosable: true,
            });
          }
          setUploadInProgress(false);
        })
        .catch((error: AxiosError) => {
          // Big error in file handling in backend
          if (toastIdRef.current) {
            toast.update(toastIdRef.current, {
              title: 'Upload',
              description: 'Upload failed: ' + (error.response?.data || error.code),
              status: 'error',
              duration: 4000,
              isClosable: true,
            });
          }
          setUploadInProgress(false);
        });
      if (response) {
        // Get the new asset IDs
        const newids = response.data as string[];
        // Refresh the asset store
        await useAssetStore.getState().update(roomId);
        // Show a success message
        // if (toastIdRef.current) {
        //   toast.update(toastIdRef.current, {
        //     title: 'Upload',
        //     description: 'Asset Processed',
        //     // duration: 4000,
        //     duration: null,
        //     isClosable: true,
        //   });
        // }
        setUploadInProgress(false);
        // Finish the upload by updating with the new asset IDs
        setUploadSuccess(newids);
      }
    }
  }

  /**
   * Open an application for a given asset ID
   *
   * @param {string} fileID - The ID of the asset
   * @param {number} xDrop - The x-coordinate where the file was dropped
   * @param {number} yDrop - The y-coordinate where the file was dropped
   * @param {string} roomId - The ID of the room
   * @param {string} boardId - The ID of the board
   * @returns {Promise<AppSchema | null>} - The schema of the created application or null
   */
  async function openAppForFile(fileID: string, xDrop: number, yDrop: number, roomId: string, boardId: string): Promise<AppSchema | null> {
    if (!user) return null;
    for (const a of assets) {
      if (a._id === fileID) {
        return openApplication(a, xDrop, yDrop, roomId, boardId);
      }
    }
    return null;
  }

  return { uploadFiles, openAppForFile, uploadInProgress };
}
