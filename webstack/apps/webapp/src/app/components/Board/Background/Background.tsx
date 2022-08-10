/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, useColorModeValue, useToast } from "@chakra-ui/react";
import { useUIStore } from "@sage3/frontend";

type BackgroundProps = {
  roomId: string,
  boardId: string
}

export function Background(props: BackgroundProps) {

  // display some notifications
  const toast = useToast();

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
  // Drop event
  function OnDrop(event: React.DragEvent<HTMLDivElement>) {
    if (event.dataTransfer.types.includes('Files') && event.dataTransfer.files.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      // Collect all the files dropped into an array
      collectFiles(event.dataTransfer).then((files) => {
        // Get the position of the drop
        const xdrop = event.nativeEvent.offsetX;
        const ydrop = event.nativeEvent.offsetY;
        // do the actual upload
        uploadFunction(Array.from(files), xdrop, ydrop);
      });
    } else {
      console.log('drop_handler: no files');
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
  )
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
