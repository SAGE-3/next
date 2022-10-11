/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, useColorModeValue, useToast } from '@chakra-ui/react';

import { useUIStore, useAppStore, useUser, useAssetStore, truncateWithEllipsis, useHexColor } from '@sage3/frontend';
import { AppName } from '@sage3/applications/schema';

// File information
import { getMime, isValid, isImage, isPDF, isCSV, isText, isJSON, isDZI, isGeoJSON, isVideo, isPython, isGLTF, isGIF } from '@sage3/shared';
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
  const zoomInDelta = useUIStore((state) => state.zoomInDelta);
  const zoomOutDelta = useUIStore((state) => state.zoomOutDelta);
  const scale = useUIStore((state) => state.scale);

  // Chakra Color Mode for grid color
  const gc = useColorModeValue('gray.100', 'gray.800');
  const gridColor = useHexColor(gc);

  // Perform the actual upload
  const uploadFunction = (input: File[], dx: number, dy: number) => {
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
          fd.append('files', input[i]);
          if (filenames) filenames += ', ' + input[i].name;
          else filenames = input[i].name;
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

          if (filenames) {
            toast({
              title: 'Upload Done:' + truncateWithEllipsis(filenames, 50),
              status: 'success',
              duration: 2000,
              isClosable: true,
            });

            // TODO: make the toast disapear when the asset is done
            for (let i = 0; i < fileListLength; i++) {
              // check the mime type we got from the browser, and check with mime lib. if needed
              const filetype = input[i].type || getMime(input[i].name) || 'application/octet-stream';
              if (isValid(filetype)) {
                toast({
                  title: 'Processing asset "' + input[i].name + '"',
                  status: 'info',
                  variant: 'subtle',
                  duration: 4000,
                  isClosable: true,
                });
              }
            }

          } else {
            toast({
              title: 'Upload with Errors',
              status: 'warning',
              duration: 4000,
              isClosable: true,
            });
          }
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
    if (isGIF(fileType)) {
      // Look for the file in the asset store
      assets.forEach((a) => {
        if (a._id === fileID) {
          createApp(
            setupApp(
              'ImageViewer',
              xDrop,
              yDrop,
              props.roomId,
              props.boardId,
              user._id,
              { w: w, h: w },
              { assetid: '/api/assets/static/' + a.data.file }
            )
          );
        }
      });
    } else if (isImage(fileType)) {
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
              { assetid: fileID }
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
                setupApp('VideoViewer', xDrop, yDrop, props.roomId, props.boardId, user._id, { w: 500, h: 400 / ar }, { assetid: fileID })
              );
            });
        }
      });
    } else if (isCSV(fileType)) {
      createApp(setupApp('CSVViewer', xDrop, yDrop, props.roomId, props.boardId, user._id, { w: 800, h: 400 }, { assetid: fileID }));
    } else if (isDZI(fileType)) {
      createApp(setupApp('DeepZoomImage', xDrop, yDrop, props.roomId, props.boardId, user._id, { w: 800, h: 400 }, { assetid: fileID }));
    } else if (isGLTF(fileType)) {
      createApp(setupApp('GLTFViewer', xDrop, yDrop, props.roomId, props.boardId, user._id, { w: 600, h: 600 }, { assetid: fileID }));
    } else if (isGeoJSON(fileType)) {
      createApp(setupApp('LeafLet', xDrop, yDrop, props.roomId, props.boardId, user._id, { w: 800, h: 400 }, { assetid: fileID }));
    } else if (isText(fileType)) {
      // Look for the file in the asset store
      assets.forEach((a) => {
        if (a._id === fileID) {
          const localurl = '/api/assets/static/' + a.data.file;
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
            .then(async function (text) {
              // Create a note from the text
              createApp(setupApp('Stickie', xDrop, yDrop, props.roomId, props.boardId, user._id, { w: 400, h: 400 }, { text: text }));
            });
        }
      });
    } else if (isPython(fileType)) {
      // Look for the file in the asset store
      assets.forEach((a) => {
        if (a._id === fileID) {
          const localurl = '/api/assets/static/' + a.data.file;
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
            .then(async function (text) {
              // Create a note from the text
              createApp(setupApp('CodeCell', xDrop, yDrop, props.roomId, props.boardId, user._id, { w: 400, h: 400 }, { code: text }));
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
            setupApp(
              'PDFViewer',
              xDrop,
              yDrop,
              props.roomId,
              props.boardId,
              user._id,
              { w: 400, h: 400 / aspectRatio },
              { assetid: fileID }
            )
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
      bgImage={`linear-gradient(to right, ${gridColor} ${1 / scale}px, transparent ${1 / scale}px),
               linear-gradient(to bottom, ${gridColor} ${1 / scale}px, transparent ${1 / scale}px);`}
      id="board"
      // Drag and drop event handlers
      onDrop={OnDrop}
      onDragOver={OnDragOver}
      onScroll={(evt => {
        console.log('onScroll> event', evt);
      })}
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
