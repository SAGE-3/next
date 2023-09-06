/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useEffect, useState } from 'react';
import { ToastId, useToast } from '@chakra-ui/react';

// File information
import {
  getMime,
  isValid,
  isImage,
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
  isPythonNotebook,
} from '@sage3/shared';

// Upload with axios and progress event
import axios, { AxiosProgressEvent, AxiosError } from 'axios';

import { useAssetStore, useAppStore } from '../stores';
import { useUser } from './useUser';
import { AppName, AppSchema, AppState } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';
import { ExtraImageType, ExtraPDFType } from '@sage3/shared/types';
import { GetConfiguration, apiUrls } from '../config';

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
  };
}

type UseFiles = {
  uploadFiles: (input: File[], dx: number, dy: number, roomId: string, boardId: string) => void;
  openAppForFile: (fileID: string, fileType: string, xDrop: number, yDrop: number, roomId: string, boardId: string) => Promise<AppSchema | null>;
};

/**
 * Hook to oberve window resize event
 * @returns (width, height) of the window
 */
export function useFiles(): UseFiles {
  // display some notifications
  const toast = useToast();
  // Handle to a toast
  const toastIdRef = useRef<ToastId>();
  // User store
  const { user } = useUser();
  // Assets store
  const assets = useAssetStore((state) => state.assets);
  // App store
  const createBatch = useAppStore((state) => state.createBatch);
  // Upload success
  const [uploadSuccess, setUploadSuccess] = useState<string[]>([]);
  // Save the drop position
  const [configDrop, setConfigDrop] = useState({ xDrop: 0, yDrop: 0, roomId: '', boardId: '' });

  // When uplaod is done, open the apps
  useEffect(() => {
    async function openApps() {
      if (uploadSuccess.length > 0) {
        const batch: AppSchema[] = [];
        let xpos = configDrop.xDrop;
        for await (const up of uploadSuccess) {
          for (const a of assets) {
            if (a._id === up) {
              const res = await openAppForFile(a._id, a.data.mimetype, xpos, configDrop.yDrop, configDrop.roomId, configDrop.boardId);
              if (res) {
                batch.push(res);
                xpos += res.size.width + 10;
              }
            }
          }
        }
        createBatch(batch);
        setUploadSuccess([])
      }
    }
    openApps();
  }, [uploadSuccess, assets, configDrop]);

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
        if (isValid(filetype)) {
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
            fd.append('files', input[i]);
            if (filenames) filenames += ', ' + input[i].name;
            else filenames = input[i].name;
          }
        } else {
          toast({
            title: 'Invalid file type',
            description: `Type not recognized: ${input[i].type} for file ${input[i].name}`,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      }

      // Add fields to the upload form
      fd.append('room', roomId);

      toastIdRef.current = toast({
        title: 'Upload',
        description: 'Starting upload of ' + filenames,
        status: 'info',
        // no duration, so it doesn't disappear
        duration: null,
        isClosable: true,
      });

      // Save the drop position
      setConfigDrop({ xDrop: dx, yDrop: dy, roomId: roomId, boardId: boardId });

      // Upload with a POST request
      const response = await axios({
        method: 'post',
        url: '/api/assets/upload',
        data: fd,
        onUploadProgress: (p: AxiosProgressEvent) => {
          if (toastIdRef.current && p.progress) {
            const progress = (p.progress * 100).toFixed(0);
            toast.update(toastIdRef.current, {
              title: 'Upload',
              description: 'Progress: ' + progress + '%',
              isClosable: true,
            });
          }
        },
      }).finally(() => {
        // Some errors with the files
        if (!filenames) {
          toast({
            title: 'Upload with Errors',
            status: 'warning',
            duration: 4000,
            isClosable: true,
          });
        }
      }).catch((error: AxiosError) => {
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
      });
      if (response) {
        // Save the list of uploaded files
        setUploadSuccess(response.data.map((a: any) => a.id));
        // Show a success message
        if (toastIdRef.current) {
          toast.update(toastIdRef.current, {
            title: 'Upload',
            description: 'Upload complete',
            duration: 4000,
            isClosable: true,
          });
        }
      }
    }
  }

  // Create an app for a file
  async function openAppForFile(fileID: string, fileType: string, xDrop: number, yDrop: number, roomId: string, boardId: string): Promise<AppSchema | null> {
    if (!user) return null;
    const w = 400;
    if (isGIF(fileType)) {
      // Look for the file in the asset store
      for (const a of assets) {
        if (a._id === fileID) {
          return setupApp(
            a.data.originalfilename,
            'ImageViewer',
            xDrop,
            yDrop,
            roomId,
            boardId,
            { w: w, h: w },
            { assetid: '/api/assets/static/' + a.data.file }
          );
        }
      }
    } else if (isImage(fileType)) {
      // Look for the file in the asset store
      for (const a of assets) {
        if (a._id === fileID) {
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
        }
      }
    } else if (isVideo(fileType)) {
      // Look for the file in the asset store
      for (const a of assets) {
        if (a._id === fileID) {
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
        }
      }
    } else if (isCSV(fileType)) {
      return setupApp('', 'CSVViewer', xDrop, yDrop, roomId, boardId, { w: 800, h: 400 }, { assetid: fileID });
    } else if (isDZI(fileType)) {
      return setupApp('', 'DeepZoomImage', xDrop, yDrop, roomId, boardId, { w: 800, h: 400 }, { assetid: fileID });
    } else if (isGLTF(fileType)) {
      return setupApp('', 'GLTFViewer', xDrop, yDrop, roomId, boardId, { w: 600, h: 600 }, { assetid: fileID });
    } else if (isGeoJSON(fileType)) {
      return setupApp('', 'MapGL', xDrop, yDrop, roomId, boardId, { w: 800, h: 400 }, { assetid: fileID });
    } else if (isMD(fileType)) {
      // Look for the file in the asset store
      for (const a of assets) {
        if (a._id === fileID) {
          const localurl = '/api/assets/static/' + a.data.file;
          // Get the content of the file
          const response = await fetch(localurl, {
            headers: {
              'Content-Type': 'text/plain',
              Accept: 'text/plain',
            },
          });
          const text = await response.text();
          // Create a note from the text
          return setupApp(user.data.name, 'Stickie', xDrop, yDrop, roomId, boardId, { w: 400, h: 420 }, { text: text });
        }
      }
    } else if (isPython(fileType)) {
      // Look for the file in the asset store
      for (const a of assets) {
        if (a._id === fileID) {
          const localurl = '/api/assets/static/' + a.data.file;
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
        }
      }
    } else if (isPythonNotebook(fileType)) {
      // Look for the file in the asset store
      for (const a of assets) {
        if (a._id === fileID) {
          const localurl = '/api/assets/static/' + a.data.file;
          // Get the content of the file
          const response = await fetch(localurl, {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          });
          const json = await response.json();
          // Create a notebook file in Jupyter with the content of the file
          const conf = await GetConfiguration();
          if (conf.token) {
            // Create a new notebook
            const base = `http://${window.location.hostname}:8888`;
            // Talk to the jupyter server API
            const j_url = base + apiUrls.assets.getNotebookByName(a.data.originalfilename);
            const payload = { type: 'notebook', path: '/notebooks', format: 'json', content: json };
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
            // Create a note from the json
            return setupApp(
              '',
              'JupyterLab',
              xDrop,
              yDrop,
              roomId,
              boardId,
              { w: 700, h: 700 },
              { notebook: a.data.originalfilename }
            );
          }
        }
      }
    } else if (isJSON(fileType)) {
      // Look for the file in the asset store
      for (const a of assets) {
        if (a._id === fileID) {
          const localurl = '/api/assets/static/' + a.data.file;
          // Get the content of the file
          const response = await fetch(localurl, {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          });
          const spec = await response.json();
          // Create a vis from the json spec
          return setupApp('', 'VegaLite', xDrop, yDrop, roomId, boardId, { w: 500, h: 600 }, { spec: JSON.stringify(spec, null, 2) });
        }
      }
    } else if (isPDF(fileType)) {
      // Look for the file in the asset store
      for (const a of assets) {
        if (a._id === fileID) {
          const pages = a.data.derived as ExtraPDFType;
          let aspectRatio = 1;
          if (pages) {
            // First page
            const page = pages[0];
            // First image of the page
            aspectRatio = page[0].width / page[0].height;
          }
          return setupApp('', 'PDFViewer', xDrop, yDrop, roomId, boardId, { w: 400, h: 400 / aspectRatio }, { assetid: fileID });
        }
      }
    }
    return null;
  }

  return { uploadFiles, openAppForFile };
}
