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
  isPythonNotebook,
  mimeToCode,
} from '@sage3/shared';
import { App, AppName, AppSchema, AppState } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';
import { ExtraImageType, ExtraPDFType } from '@sage3/shared/types';

import { apiUrls } from '../config';
import { useUser } from '../providers';
import { useAssetStore, useAppStore, useUIStore, useConfigStore } from '../stores';

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

type UseFiles = {
  uploadFiles: (input: File[], dx: number, dy: number, roomId: string, boardId: string) => void;
  openAppForFile: (
    fileID: string,
    fileType: string,
    xDrop: number,
    yDrop: number,
    roomId: string,
    boardId: string
  ) => Promise<AppSchema | null>;
  uploadInProgress: boolean;
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
  const create = useAppStore((state) => state.create);
  // Upload success
  const [uploadSuccess, setUploadSuccess] = useState<string[]>([]);
  // Save the drop position
  const [configDrop, setConfigDrop] = useState({ xDrop: 0, yDrop: 0, roomId: '', boardId: '' });
  // Upload in progress
  const [uploadInProgress, setUploadInProgress] = useState(false);

  // When uplaod is done, open the apps
  useEffect(() => {
    async function openApps() {
      if (uploadSuccess.length > 0) {
        const batch: AppSchema[] = [];
        let xpos = configDrop.xDrop;
        for await (const up of uploadSuccess) {
          for (const a of assets) {
            if (a._id === up) {
              if (isSessionFile(a.data.mimetype)) {
                const localurl = apiUrls.assets.getAssetById(a.data.file);
                // Get the content of the file
                const response = await fetch(localurl, {
                  headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                  },
                });
                const session = await response.json();
                const apps = session.apps as App[];
                const newassets = session.assets as { id: string; url: string; filename: string }[];
                let xmin = useUIStore.getState().boardWidth;
                let ymin = useUIStore.getState().boardHeight;
                for (const app of apps) {
                  const pos = app.data.position;
                  if (pos.x < xmin) xmin = pos.x;
                  if (pos.y < ymin) ymin = pos.y;
                }
                for (const app of apps) {
                  // Select only the usefull values to rebuild the app
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
                      fd.append('room', configDrop.roomId);
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
                    roomId: configDrop.roomId,
                    boardId: configDrop.boardId,
                    position: {
                      x: app.data.position.x - xmin + configDrop.xDrop,
                      y: app.data.position.y - ymin + configDrop.yDrop,
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
                  create(newapp);
                }
              } else {
                const res = await openAppForFile(a._id, a.data.mimetype, xpos, configDrop.yDrop, configDrop.roomId, configDrop.boardId);
                if (res) {
                  batch.push(res);
                  xpos += res.size.width + 10;
                }
              }
            }
          }
        }
        createBatch(batch);
        setUploadSuccess([]);
      }
    }
    openApps();
  }, [uploadSuccess]);
  // }, [uploadSuccess, assets, configDrop]);

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
            let item;
            // Rename file for called image.png coming from the clipboard
            if (input[i].name === "image.png") {
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
      setUploadInProgress(true);

      // Upload with a POST request
      const response = await axios({
        method: 'post',
        url: apiUrls.assets.upload,
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
        setUploadInProgress(false);
      }
    }
  }

  // Create an app for a file
  async function openAppForFile(
    fileID: string,
    fileType: string,
    xDrop: number,
    yDrop: number,
    roomId: string,
    boardId: string
  ): Promise<AppSchema | null> {
    if (!user) return null;
    const w = 400;
    if (isGeoTiff(fileType)) {
      for (const a of assets) {
        if (a._id === fileID) {
          return setupApp(a.data.originalfilename, 'MapGL', xDrop, yDrop, roomId, boardId, { w: w, h: w }, { assetid: fileID });
        }
      }
    } else if (isFileURL(fileType)) {
      // Look for the file in the asset store
      for (const a of assets) {
        if (a._id === fileID) {
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
        }
      }
    } else if (isCode(fileType)) {
      // Look for the file in the asset store
      for (const a of assets) {
        if (a._id === fileID) {
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
          return setupApp('CodeEditor', 'CodeEditor', xDrop, yDrop, roomId, boardId, { w: 850, h: 400 },
            { content: text, language: lang, filename: a.data.originalfilename });
        }
      }
    } else if (isGIF(fileType)) {
      // Look for the file in the asset store
      for (const a of assets) {
        if (a._id === fileID) {
          const extras = a.data.derived as ExtraImageType;
          const imw = w;
          const imh = w / (extras.aspectRatio || 1);
          return setupApp(
            a.data.originalfilename,
            'ImageViewer',
            xDrop,
            yDrop,
            roomId,
            boardId,
            { w: imw, h: imh },
            { assetid: fileID }
          );
        }
      }
    } else if (isImage(fileType)) {
      // Check if it is a GeoTiff in disguise
      if (isTiff(fileType)) {
        for (const a of assets) {
          if (a._id === fileID) {
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
                return setupApp(a.data.originalfilename, 'MapGL', xDrop, yDrop, roomId, boardId, { w: w, h: w }, { assetid: fileID });
              }
            }
          }
        }
      }
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
          return setupApp(user.data.name, 'Stickie', xDrop, yDrop, roomId, boardId, { w: 400, h: 420 }, { text: text });
        }
      }
    } else if (isPython(fileType)) {
      // Look for the file in the asset store
      for (const a of assets) {
        if (a._id === fileID) {
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
        }
      }
    } else if (isPythonNotebook(fileType)) {
      console.log('Jupyter> drag notebook')
      // Look for the file in the asset store
      for (const a of assets) {
        if (a._id === fileID) {
          const localurl = apiUrls.assets.getAssetById(a.data.file);
          // Get the content of the file
          const response = await fetch(localurl, {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          });
          const json = await response.json();
          // Create a notebook file in Jupyter with the content of the file
          const conf = useConfigStore.getState().config;
          // const conf = await GetConfiguration();
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
            return setupApp('', 'JupyterLab', xDrop, yDrop, roomId, boardId, { w: 700, h: 700 }, { notebook: a.data.originalfilename });
          }
        }
      }
    } else if (isJSON(fileType)) {
      // Look for the file in the asset store
      for (const a of assets) {
        if (a._id === fileID) {
          const localurl = apiUrls.assets.getAssetById(a.data.file);
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

  return { uploadFiles, openAppForFile, uploadInProgress };
}
