/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, useColorModeValue, useToast } from '@chakra-ui/react';

import { useUIStore, useAppStore, useUser, useAssetStore } from '@sage3/frontend';
import { initialValues } from '@sage3/applications/apps';
import { AppName, AppState } from '@sage3/applications/schema';

// File information
import { isImage, isPDF, isCSV, isText, isJSON } from '@sage3/shared';
import { ExtraImageType, ExtraPDFType } from '@sage3/shared/types';

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
  const zoomInDelta = useUIStore((state) => state.zoomInDelta);
  const zoomOutDelta = useUIStore((state) => state.zoomOutDelta);

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

  const newApplication = (appName: AppName, x: number, y: number) => {
    if (!user) return;
    createApp({
      name: appName,
      description: appName + '>',
      roomId: props.roomId,
      boardId: props.boardId,
      position: { x: x - 200, y: y - 200, z: 0 },
      size: { width: 400, height: 400, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: appName,
      state: { ...(initialValues[appName] as any) },
      ownerId: user._id || '',
      minimized: false,
      raised: true,
    });
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
          createApp({
            name: 'ImageViewer',
            description: 'Image Description',
            roomId: props.roomId,
            boardId: props.boardId,
            ownerId: user._id,
            position: { x: xDrop, y: yDrop, z: 0 },
            size: { width: w, height: w / (extras.aspectRatio || 1), depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'ImageViewer',
            state: { ...initialValues['ImageViewer'], id: fileID },
            minimized: false,
            raised: true
          });
        }
      });
    } else if (isCSV(fileType)) {
      createApp({
        name: 'CVSViewer',
        description: 'CSV Description',
        roomId: props.roomId,
        boardId: props.boardId,
        ownerId: user._id,
        position: { x: xDrop, y: yDrop, z: 0 },
        size: { width: 800, height: 400, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'CSVViewer',
        state: { ...initialValues['CSVViewer'], id: fileID },
        minimized: false,
        raised: true
      });
    } else if (isText(fileType)) {
      // Look for the file in the asset store
      assets.forEach((a) => {
        if (a._id === fileID) {
          const localurl = '/api/assets/static/' + a.data.file;
          // Get the content of the file
          fetch(localurl, {
            headers: {
              'Content-Type': 'text/csv',
              Accept: 'text/csv'
            },
          }).then(function (response) {
            return response.text();
          }).then(async function (text) {
            // Create a note from the text
            createApp({
              name: 'Stickie',
              description: 'Stickie',
              roomId: props.roomId,
              boardId: props.boardId,
              ownerId: user._id,
              position: { x: xDrop, y: yDrop, z: 0 },
              size: { width: 400, height: 400, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'Stickie',
              state: { ...initialValues['Stickie'] as AppState, text },
              minimized: false,
              raised: true
            });
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
              Accept: 'application/json'
            },
          }).then(function (response) {
            return response.json();
          }).then(async function (spec) {
            // Create a note from the text
            createApp({
              name: 'VegaLite',
              description: 'VegaLite> ' + a.data.originalfilename,
              roomId: props.roomId,
              boardId: props.boardId,
              ownerId: user._id,
              position: { x: xDrop, y: yDrop, z: 0 },
              size: { width: 500, height: 600, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'VegaLite',
              state: { ...initialValues['VegaLite'], spec: JSON.stringify(spec, null, 2) },
              minimized: false,
              raised: true
            });
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
          createApp({
            name: 'PDFViewer',
            description: 'PDF Description',
            roomId: props.roomId,
            boardId: props.boardId,
            ownerId: user._id,
            position: { x: xDrop, y: yDrop, z: 0 },
            size: { width: 400, height: 400 / aspectRatio, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'PDFViewer',
            state: { ...initialValues['PDFViewer'], id: fileID },
            minimized: false,
            raised: true
          });
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
        newApplication(appName, xdrop, ydrop);
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
    <>
      <Box
        className="board-handle"
        // width={5000}
        // height={5000}
        width="100%"
        height="100%"
        backgroundSize={`50px 50px`}
        // backgroundSize={`${gridSize}px ${gridSize}px`}
        backgroundImage={`linear-gradient(to right, ${gridColor} 1px, transparent 1px),
               linear-gradient(to bottom, ${gridColor} 1px, transparent 1px);`}
        id="board"
        // Drag and drop event handlers
        onDrop={OnDrop}
        onDragOver={OnDragOver}
        onWheel={(evt: any) => {
          evt.stopPropagation();
          if ((evt.altKey || evt.ctrlKey || evt.metaKey) && evt.buttons === 0) {
            // Alt + wheel : Zoom
          } else {
            // const cursor = { x: evt.clientX, y: evt.clientY, };
            if (evt.deltaY < 0) {
              zoomInDelta(evt.deltaY);
            } else if (evt.deltaY > 0) {
              zoomOutDelta(evt.deltaY);
            }
          }
        }}
      />
    </>
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
