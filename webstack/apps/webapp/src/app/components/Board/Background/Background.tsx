/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, useColorModeValue, useToast } from '@chakra-ui/react';

import { useUIStore, useAppStore, useUser, useAssetStore } from '@sage3/frontend';
import { AppName } from '@sage3/applications/schema';

// File information
import { isImage, isPDF, isCSV, isText, isJSON, isDZI, isGeoJSON, isVideo } from '@sage3/shared';
import { ExtraImageType, ExtraPDFType } from '@sage3/shared/types';
import { setupApp } from './Drops';

type BackgroundProps = {
  roomId: string;
  boardId: string;
};

export function Background(props: BackgroundProps) {
  // display some notifications
  const toast = useToast();
  // Assets
  const assets = useAssetStore((state) => state.assets);
  // How to create some applications
  const createApp = useAppStore((state) => state.create);
  // User
  const { user } = useUser();

  // UI Store
  // const gridSize = useUIStore((state) => state.gridSize);
  const zoomInDelta = useUIStore((state) => state.zoomInDelta);
  const zoomOutDelta = useUIStore((state) => state.zoomOutDelta);
  const scale = useUIStore((state) => state.scale);

  // Chakra Color Mode for grid color
  const gridColor = useColorModeValue('#E2E8F0', '#2D3748');

  // Perform the actual upload
  const uploadFunction = (input: File[], dx: number, dy: number) => {
    if (input) {
      // Uploaded with a Form object
      const fd = new FormData();
      // Add each file to the form
      const fileListLength = input.length;
      for (let i = 0; i < fileListLength; i++) {
        fd.append('files', input[i]);
      }

      // Add fields to the upload form
      fd.append('room', props.roomId);
      fd.append('board', props.boardId);

      // Position to open the asset
      fd.append('targetX', dx.toString());
      fd.append('targetY', dy.toString());

      // Upload with a POST request
      fetch('/api/assets/upload', {
        method: 'POST',
        body: fd,
      })
        .catch((error: Error) => {
          console.log('Upload> Error: ', error);
        })
        .finally(() => {
          // Close the modal UI
          // props.onClose();
          console.log('Upload> Upload complete');
          // Display a message
          toast({
            title: 'Upload Done',
            status: 'info',
            duration: 4000,
            isClosable: true,
          });
        });
    }
  };

  // Start dragging
  function OnDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  const newApp = (appName: AppName, x: number, y: number) => {
    if (!user) return;
    createApp(setupApp(appName, x, y, props.roomId, props.boardId, user._id));
  };

  // Create an app for a file
  function OpenFile(fileID: string, fileType: string, xDrop: number, yDrop: number) {
    if (!user) return;
    const w = 400;
    if (isImage(fileType)) {
      // Look for the file in the asset store
      assets.forEach((a) => {
        if (a._id === fileID) {
          const extras = a.data.derived as ExtraImageType;
          createApp(
            setupApp(
              'ImageViewer',
              xDrop,
              yDrop,
              props.roomId,
              props.boardId,
              user._id,
              { w: w, h: w / (extras.aspectRatio || 1) },
              { id: fileID }
            )
          );
        }
      });
    } else if (isVideo(fileType)) {
      // Look for the file in the asset store
      assets.forEach((a) => {
        if (a._id === fileID) {
          //  Get the metadata file
          const localurl = '/api/assets/static/' + a.data.metadata;
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
            .then(async function (j) {
              const vw = j['ImageWidth'] || 800;
              const vh = j['ImageHeight'] || 450;
              const ar = vw / vh;
              createApp(
                setupApp('VideoViewer', xDrop, yDrop, props.roomId, props.boardId, user._id, { w: 500, h: 400 / ar }, { vid: fileID })
              );
            });
        }
      });
    } else if (isCSV(fileType)) {
      createApp(setupApp('CSVViewer', xDrop, yDrop, props.roomId, props.boardId, user._id, { w: 800, h: 400 }, { id: fileID }));
    } else if (isDZI(fileType)) {
      createApp(setupApp('Zoom', xDrop, yDrop, props.roomId, props.boardId, user._id, { w: 800, h: 400 }, { zid: fileID }));
    } else if (isGeoJSON(fileType)) {
      createApp(setupApp('LeafLet', xDrop, yDrop, props.roomId, props.boardId, user._id, { w: 800, h: 400 }, { geojson: fileID }));
    } else if (isText(fileType)) {
      // Look for the file in the asset store
      assets.forEach((a) => {
        if (a._id === fileID) {
          const localurl = '/api/assets/static/' + a.data.file;
          // Get the content of the file
          fetch(localurl, {
            headers: {
              'Content-Type': 'text/csv',
              Accept: 'text/csv',
            },
          })
            .then(function (response) {
              return response.text();
            })
            .then(async function (text) {
              // Create a note from the text
              createApp(setupApp('Stickie', xDrop, yDrop, props.roomId, props.boardId, user._id, { w: 400, h: 400 }, { text: text }));
            });
        }
      });
    } else if (isJSON(fileType)) {
      // Look for the file in the asset store
      assets.forEach((a) => {
        if (a._id === fileID) {
          const localurl = '/api/assets/static/' + a.data.file;
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
            .then(async function (spec) {
              // Create a vis from the json spec
              createApp(
                setupApp(
                  'VegaLite',
                  xDrop,
                  yDrop,
                  props.roomId,
                  props.boardId,
                  user._id,
                  { w: 500, h: 600 },
                  { spec: JSON.stringify(spec, null, 2) }
                )
              );
            });
        }
      });
    } else if (isPDF(fileType)) {
      // Look for the file in the asset store
      assets.forEach((a) => {
        if (a._id === fileID) {
          const pages = a.data.derived as ExtraPDFType;
          let aspectRatio = 1;
          if (pages) {
            // First page
            const page = pages[0];
            // First image of the page
            aspectRatio = page[0].width / page[0].height;
          }
          createApp(
            setupApp('PDFViewer', xDrop, yDrop, props.roomId, props.boardId, user._id, { w: 400, h: 400 / aspectRatio }, { id: fileID })
          );
        }
      });
    }
  }

  // Drop event
  function OnDrop(event: React.DragEvent<HTMLDivElement>) {
    // Get the position of the drop
    const xdrop = event.nativeEvent.offsetX;
    const ydrop = event.nativeEvent.offsetY;

    if (event.dataTransfer.types.includes('Files') && event.dataTransfer.files.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      // Collect all the files dropped into an array
      collectFiles(event.dataTransfer).then((files) => {
        // do the actual upload
        uploadFunction(Array.from(files), xdrop, ydrop);
      });
    } else {
      // if no files were dropped, create an application
      const appName = event.dataTransfer.getData('app') as AppName;
      if (appName) {
        newApp(appName, xdrop, ydrop);
      } else {
        // Get information from the drop
        const ids = event.dataTransfer.getData('file');
        const types = event.dataTransfer.getData('type');
        const fileIDs = JSON.parse(ids);
        const fileTypes = JSON.parse(types);
        // Open the file at the drop location
        const num = fileIDs.length;
        for (let i = 0; i < num; i++) {
          OpenFile(fileIDs[i], fileTypes[i], xdrop + i * 415, ydrop);
        }
      }
    }
  }

  return (
    <Box
      className="board-handle"
      width="100%"
      height="100%"
      backgroundSize={`50px 50px`}
      // backgroundSize={`${gridSize}px ${gridSize}px`}
      backgroundImage={`linear-gradient(to right, ${gridColor} ${2 / scale}px, transparent ${2 / scale}px),
               linear-gradient(to bottom, ${gridColor} ${2 / scale}px, transparent ${2 / scale}px);`}
      id="board"
      // Drag and drop event handlers
      onDrop={OnDrop}
      onDragOver={OnDragOver}
      onWheel={(evt: any) => {
        evt.stopPropagation();
        const cursor = { x: evt.clientX, y: evt.clientY };
        if (evt.deltaY < 0) {
          zoomInDelta(evt.deltaY, cursor);
        } else if (evt.deltaY > 0) {
          zoomOutDelta(evt.deltaY, cursor);
        }
      }}
    />
  );
}

/**
 * Collects files into an array, from a list of files or folders
 *
 * @export
 * @param {DataTransfer} evdt
 * @returns {Promise<File[]>}
 */
export async function collectFiles(evdt: DataTransfer): Promise<File[]> {
  return new Promise<File[]>((resolve, reject) => {
    const contents: File[] = [];
    let reading = 0;

    function handleFiles(file: File) {
      reading--;
      if (file.name !== '.DS_Store') contents.push(file);
      if (reading === 0) {
        resolve(contents);
      }
    }

    const dt = evdt;
    const length = evdt.items.length;
    for (let i = 0; i < length; i++) {
      const entry = dt.items[i].webkitGetAsEntry();
      if (entry?.isFile) {
        reading++;
        // @ts-ignore
        entry.file(handleFiles);
      } else if (entry?.isDirectory) {
        reading++;
        // @ts-ignore
        const reader = entry.createReader();
        reader.readEntries(function (entries: any) {
          // @ts-ignore
          reading--;
          entries.forEach(function (dir: any, key: any) {
            reading++;
            dir.file(handleFiles);
          });
        });
      }
    }
  });
}
