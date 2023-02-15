/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {useEffect, useRef, useState} from 'react';
import {Box, useColorModeValue, useToast, ToastId, ModalCloseButton} from '@chakra-ui/react';

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure
} from '@chakra-ui/react';

// To do upload with progress bar
import axios, {AxiosProgressEvent} from 'axios';

import {
  useUIStore,
  useAppStore,
  useUser,
  useAssetStore,
  useHexColor,
  GetConfiguration,
  useMessageStore,
  processContentURL,
  useHotkeys,
  useCursorBoardPosition,
  useKeyPress,
  useAuth, AssetHTTPService,
} from '@sage3/frontend';
import {AppName} from '@sage3/applications/schema';

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
import {ExtraImageType, ExtraPDFType} from '@sage3/shared/types';
import {setupApp} from './Drops';

import imageHelp from './sage3-help.jpg';
import {setupAppForFile} from "../../ui/components/Panels/Asset/CreateApp";

type HelpProps = {
  onClose: () => void;
  isOpen: boolean;
};

export function HelpModal(props: HelpProps) {
  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false} isCentered={true} size="5xl">
      <ModalOverlay/>
      <ModalContent>
        <ModalHeader>SAGE3 Help</ModalHeader>
        <ModalBody>
          <img src={imageHelp} alt="SAGE3 Help"/>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="green" size="sm" mr={3} onClick={props.onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

type NotebookModalProps = {
  onNotebookModalClose: () => void;
  // onNotebookModalOpen: (fileID: string, fileType: string, xDrop: number, yDrop: number) => void;
  isNotebookModalOpen: boolean;
  roomId: string;
  boardId: string;
  // fileID: string;
  // fileType: string;
  // xDrop: number;
  // yDrop: number;
};

// TODO Figure out how to pass file information to NotebookModal
export function NotebookModal(props: NotebookModalProps) {

  // Assets
  const assets = useAssetStore((state) => state.assets);
  // How to create some applications
  const createApp = useAppStore((state) => state.create);

  function notebookAsCells(fileID: string, fileType: string, xDrop: number, yDrop: number) {
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
          .then(async function (json) {
            // create a sagecell app for each cell in the cells array
            const cells = json.cells;
            let y = yDrop;
            let columnCount = 0;
            const columnHeight = 5;
            let x = xDrop;
            const height = 400;
            const width = 500;
            const spacing = 40;
            cells.forEach((cell: any) => {
              if (cell.cell_type === 'code') {
                const sourceCode = (cell.source as []).join(' ');
                createApp(setupApp('', 'SageCell', x, y, props.roomId, props.boardId, {
                  w: width,
                  h: height
                }, {code: sourceCode}));
              }
              if (cell.cell_type === 'markdown') {
                createApp(
                  setupApp('', 'Stickie', x, y, props.roomId, props.boardId, {
                    w: width,
                    h: height
                  }, {text: `markdown ${cell.source}`})
                );
              }
              if (cell.cell_type === 'raw') {
                createApp(
                  setupApp('', 'Stickie', x, y, props.roomId, props.boardId, {
                    w: width,
                    h: height
                  }, {text: `markdown ${cell.source}`})
                );
              }
              if (cell.cell_type === 'display_data') {
                createApp(
                  setupApp(
                    '',
                    'SageCell',
                    x,
                    y,
                    props.roomId,
                    props.boardId,
                    {w: width, h: height},
                    {output: JSON.stringify(cell.data)}
                  )
                );
              }
              y = y + height + spacing;
              columnCount++;
              if (columnCount >= columnHeight) {
                columnCount = 0;
                x = x + width + spacing;
                y = yDrop;
              }
            });
          });
      }
    });
  }

  function notebookInLab(fileID: string, fileType: string, xDrop: number, yDrop: number) {
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
          .then(async function (json) {
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
                const j_url = base + '/api/contents/notebooks/' + a.data.originalfilename;
                const payload = {type: 'notebook', path: '/notebooks', format: 'json', content: json};
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
                    // Create a note from the json
                    createApp(
                      setupApp(
                        '',
                        'JupyterLab',
                        xDrop,
                        yDrop,
                        props.roomId,
                        props.boardId,

                        {w: 700, h: 700},
                        {notebook: a.data.originalfilename}
                      )
                    );
                  });
              }
            });
          });
      }
    });
  }

  return (
    <Modal isCentered isOpen={props.isNotebookModalOpen} onClose={props.onNotebookModalClose} size={'2xl'}
           blockScrollOnMount={false}>
      <ModalOverlay/>
      <ModalContent>
        <ModalHeader>Open a Jupyter Notebook</ModalHeader>
        <ModalCloseButton/>
        <ModalBody>Would you like to open your notebook in JupyterLab or as SageCells? ?</ModalBody>
        <ModalFooter>
          <Button colorScheme="green" size="sm" onClick={() => {
            console.log("Open in Lab")
            // notebookInLab()
            props.onNotebookModalClose()
          }}>
            JupyterLab
          </Button>
          <Button colorScheme="orange" size="sm" mr={3} onClick={() => {
            console.log("Open in cells")
            // notebookAsCells()
            props.onNotebookModalClose()
          }}>
            SageCells
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}


type BackgroundProps = {
  roomId: string;
  boardId: string;
};

export function Background(props: BackgroundProps) {
  // display some notifications
  const toast = useToast();
  // Handle to a toast
  const toastIdRef = useRef<ToastId>();
  // Help modal
  const {isOpen: helpIsOpen, onOpen: helpOnOpen, onClose: helpOnClose} = useDisclosure();
  // Modal for choosing to open jupyter notebooks in jupyterlab or as sage cells
  const {isOpen: isNotebookModalOpen, onOpen: onNotebookModalOpen, onClose: onNotebookModalClose} = useDisclosure({id: 'notebook'});

  // Assets
  const assets = useAssetStore((state) => state.assets);
  // Messages
  const subMessage = useMessageStore((state) => state.subscribe);
  const unsubMessage = useMessageStore((state) => state.unsubscribe);
  const message = useMessageStore((state) => state.lastone);

  // How to create some applications
  const createApp = useAppStore((state) => state.create);
  // User
  const {user} = useUser();
  const {auth} = useAuth();
  const {position: cursorPosition, mouse: mousePosition} = useCursorBoardPosition();

  // UI Store
  const zoomInDelta = useUIStore((state) => state.zoomInDelta);
  const zoomOutDelta = useUIStore((state) => state.zoomOutDelta);
  const scale = useUIStore((state) => state.scale);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const setLassoMode = useUIStore((state) => state.setLassoMode);

  // Chakra Color Mode for grid color
  const gc = useColorModeValue('gray.100', 'gray.800');
  const gridColor = useHexColor(gc);

  // For Lasso
  const isShiftPressed = useKeyPress('Shift');

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
      fd.append('room', props.roomId);
      fd.append('board', props.boardId);

      // Position to open the asset
      fd.append('targetX', dx.toString());
      fd.append('targetY', dy.toString());

      toastIdRef.current = toast({
        title: 'Upload',
        description: 'Starting upload of ' + filenames,
        status: 'info',
        // no duration, so it doesn't disappear
        duration: null,
        isClosable: true,
      });

      // Upload with a POST request
      axios({
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
      })
        .catch((error: Error) => {
          console.log('Upload> Error: ', error);
        })
        .finally(() => {
          // Close the modal UI
          // props.onClose();

          if (!filenames) {
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

  // Subscribe to messages
  useEffect(() => {
    subMessage();
    return () => {
      unsubMessage();
    };
  }, []);

  // Get the last new message
  useEffect(() => {
    if (!user) return;
    if (message && message._createdBy === user._id) {
      const title = message.data.type.charAt(0).toUpperCase() + message.data.type.slice(1);
      // Update the toast if we can
      if (toastIdRef.current) {
        toast.update(toastIdRef.current, {
          title: title,
          description: message.data.payload,
          duration: 5000,
          isClosable: true,
        });
      } else {
        // or create a new one
        toastIdRef.current = toast({
          title: title,
          description: message.data.payload,
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  }, [message]);

  // Start dragging
  function OnDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  const newApp = (type: AppName, x: number, y: number) => {
    if (!user) return;
    createApp(setupApp('', type, x, y, props.roomId, props.boardId));
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
              a.data.originalfilename,
              'ImageViewer',
              xDrop,
              yDrop,
              props.roomId,
              props.boardId,
              {w: w, h: w},
              {assetid: '/api/assets/static/' + a.data.file}
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
              a.data.originalfilename,
              'ImageViewer',
              xDrop,
              yDrop,
              props.roomId,
              props.boardId,
              {w: w, h: w / (extras.aspectRatio || 1)},
              {assetid: fileID}
            )
          );
        }
      });
    } else if (isVideo(fileType)) {
      // Look for the file in the asset store
      assets.forEach((a) => {
        if (a._id === fileID) {
          const extras = a.data.derived as ExtraImageType;
          const vw = 800;
          const vh = vw / (extras.aspectRatio || 1);
          createApp(setupApp('', 'VideoViewer', xDrop, yDrop, props.roomId, props.boardId, {
            w: vw,
            h: vh
          }, {assetid: fileID}));
        }
      });
    } else if (isCSV(fileType)) {
      createApp(setupApp('', 'CSVViewer', xDrop, yDrop, props.roomId, props.boardId, {
        w: 800,
        h: 400
      }, {assetid: fileID}));
    } else if (isDZI(fileType)) {
      createApp(setupApp('', 'DeepZoomImage', xDrop, yDrop, props.roomId, props.boardId, {
        w: 800,
        h: 400
      }, {assetid: fileID}));
    } else if (isGLTF(fileType)) {
      createApp(setupApp('', 'GLTFViewer', xDrop, yDrop, props.roomId, props.boardId, {
        w: 600,
        h: 600
      }, {assetid: fileID}));
    } else if (isGeoJSON(fileType)) {
      createApp(setupApp('', 'LeafLet', xDrop, yDrop, props.roomId, props.boardId, {
        w: 800,
        h: 400
      }, {assetid: fileID}));
    } else if (isMD(fileType)) {
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
              createApp(setupApp(user.data.name, 'Stickie', xDrop, yDrop, props.roomId, props.boardId, {
                w: 400,
                h: 400
              }, {text: text}));
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
              createApp(setupApp('', 'SageCell', xDrop, yDrop, props.roomId, props.boardId, {
                w: 400,
                h: 400
              }, {code: text}));
            });
        }
      });
    } else if (isPythonNotebook(fileType)) {
      // onNotebookModalOpen();
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
          .then(async function (json) {
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
                const j_url = base + '/api/contents/notebooks/' + a.data.originalfilename;
                const payload = {type: 'notebook', path: '/notebooks', format: 'json', content: json};
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
                    // Create a note from the json
                    createApp(
                      setupApp(
                        '',
                        'JupyterLab',
                        xDrop,
                        yDrop,
                        props.roomId,
                        props.boardId,

                        {w: 700, h: 700},
                        {notebook: a.data.originalfilename}
                      )
                    );
                  });
              }
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
                  '',
                  'VegaLite',
                  xDrop,
                  yDrop,
                  props.roomId,
                  props.boardId,
                  {w: 500, h: 600},
                  {spec: JSON.stringify(spec, null, 2)}
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
            setupApp('', 'PDFViewer', xDrop, yDrop, props.roomId, props.boardId, {
              w: 400,
              h: 400 / aspectRatio
            }, {assetid: fileID})
          );
        }
      });
    }
  }

  // Drop event
  function OnDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!user) return;

    // Get the position of the drop
    const xdrop = event.nativeEvent.offsetX;
    const ydrop = event.nativeEvent.offsetY;

    if (event.dataTransfer.types.includes('Files') && event.dataTransfer.files.length > 0) {
      event.preventDefault();
      event.stopPropagation();

      // Block guests from uploading assets
      if (auth?.provider === 'guest') {
        toast({
          title: 'Guests cannot upload assets',
          status: 'warning',
          duration: 4000,
          isClosable: true,
        });
        return;
      }

      // Collect all the files dropped into an array
      collectFiles(event.dataTransfer).then((files) => {
        // do the actual upload
        uploadFunction(Array.from(files), xdrop, ydrop);
      });
    } else {
      // Drag/Drop a URL
      if (event.dataTransfer.types.includes('text/uri-list')) {
        event.preventDefault();
        event.stopPropagation();

        // Block guests from uploading assets
        if (auth?.provider === 'guest') {
          toast({
            title: 'Guests cannot upload assets',
            status: 'warning',
            duration: 4000,
            isClosable: true,
          });
          return;
        }

        const pastedText = event.dataTransfer.getData('Url');
        if (pastedText) {
          if (pastedText.startsWith('data:image/png;base64')) {
            // it's a base64 image
            createApp(setupApp('', 'ImageViewer', xdrop, ydrop, props.roomId, props.boardId, {
              w: 800,
              h: 600
            }, {assetid: pastedText}));
          } else {
            const final_url = processContentURL(pastedText);
            let w, h;
            if (final_url !== pastedText) {
              // it must be a video
              w = 1280;
              h = 720;
            } else {
              w = 800;
              h = 800;
            }
            createApp(setupApp('', 'Webview', xdrop, ydrop, props.roomId, props.boardId, {
              w,
              h
            }, {webviewurl: final_url}));
          }
        }
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
            // if (isPythonNotebook(fileTypes[i])) {
            //   onNotebookModalOpen();
            //   // openNotebookFiles(fileIDs[i], fileTypes[i], xdrop + i * 415, ydrop)
            //   // secondFunction(fileIDs[i], fileTypes[i], xdrop + i * 415, ydrop);
            // } else {
            //   OpenFile(fileIDs[i], fileTypes[i], xdrop + i * 415, ydrop);
            // }
          }
        }
      }
    }
  }

  // async function handleNotebookModalOpen() {
  //   return new Promise((resolve) => {
  //     onNotebookModalOpen();
  //     setTimeout(() => {
  //       resolve('resolved');
  //     }, 2000);
  //   })
  // }
  //
  // async function secondFunction(fileID: string, fileType: string, xDrop: number, yDrop: number) {
  //
  //   await handleNotebookModalOpen();
  //   // Look for the file in the asset store
  //   assets.forEach((a) => {
  //     if (a._id === fileID) {
  //       const localurl = '/api/assets/static/' + a.data.file;
  //       // Get the content of the file
  //       fetch(localurl, {
  //         headers: {
  //           'Content-Type': 'application/json',
  //           Accept: 'application/json',
  //         },
  //       })
  //         .then(function (response) {
  //           return response.json();
  //         })
  //         .then(async function (json) {
  //
  //           if (explodeCells == true) {
  //             // create a sagecell app for each cell in the cells array
  //             const cells = json.cells;
  //             let y = yDrop;
  //             let columnCount = 0;
  //             const columnHeight = 5;
  //             let x = xDrop;
  //             const height = 400;
  //             const width = 500;
  //             const spacing = 40;
  //             cells.forEach((cell: any) => {
  //               if (cell.cell_type === 'code') {
  //                 const sourceCode = (cell.source as []).join(' ');
  //                 createApp(setupApp('', 'SageCell', x, y, props.roomId, props.boardId, {
  //                   w: width,
  //                   h: height
  //                 }, {code: sourceCode}));
  //               }
  //               if (cell.cell_type === 'markdown') {
  //                 createApp(
  //                   setupApp('', 'Stickie', x, y, props.roomId, props.boardId, {
  //                     w: width,
  //                     h: height
  //                   }, {text: `markdown ${cell.source}`})
  //                 );
  //               }
  //               if (cell.cell_type === 'raw') {
  //                 createApp(
  //                   setupApp('', 'Stickie', x, y, props.roomId, props.boardId, {
  //                     w: width,
  //                     h: height
  //                   }, {text: `markdown ${cell.source}`})
  //                 );
  //               }
  //               if (cell.cell_type === 'display_data') {
  //                 createApp(
  //                   setupApp(
  //                     '',
  //                     'SageCell',
  //                     x,
  //                     y,
  //                     props.roomId,
  //                     props.boardId,
  //                     {w: width, h: height},
  //                     {output: JSON.stringify(cell.data)}
  //                   )
  //                 );
  //               }
  //               y = y + height + spacing;
  //               columnCount++;
  //               if (columnCount >= columnHeight) {
  //                 columnCount = 0;
  //                 x = x + width + spacing;
  //                 y = yDrop;
  //               }
  //             });
  //           } else {
  //             // Create a notebook file in Jupyter with the content of the file
  //             GetConfiguration().then((conf) => {
  //               if (conf.token) {
  //                 // Create a new notebook
  //                 let base: string;
  //                 if (conf.production) {
  //                   base = `https://${window.location.hostname}:4443`;
  //                 } else {
  //                   base = `http://${window.location.hostname}`;
  //                 }
  //                 // Talk to the jupyter server API
  //                 const j_url = base + '/api/contents/notebooks/' + a.data.originalfilename;
  //                 const payload = {type: 'notebook', path: '/notebooks', format: 'json', content: json};
  //                 // Create a new notebook
  //                 fetch(j_url, {
  //                   method: 'PUT',
  //                   headers: {
  //                     'Content-Type': 'application/json',
  //                     Authorization: 'Token ' + conf.token,
  //                   },
  //                   body: JSON.stringify(payload),
  //                 })
  //                   .then((response) => response.json())
  //                   .then((res) => {
  //                     console.log('Jupyter> notebook created', res);
  //                     // Create a note from the json
  //                     createApp(
  //                       setupApp(
  //                         '',
  //                         'JupyterLab',
  //                         xDrop,
  //                         yDrop,
  //                         props.roomId,
  //                         props.boardId,
  //
  //                         {w: 700, h: 700},
  //                         {notebook: a.data.originalfilename}
  //                       )
  //                     );
  //                   });
  //               }
  //             });
  //           }
  //
  //         });
  //     }
  //   });
  //
  // }


  // Question mark character for help
  useHotkeys(
    'shift+/',
    (event: KeyboardEvent): void | boolean => {
      if (!user) return;
      const x = cursorPosition.x;
      const y = cursorPosition.y;

      helpOnOpen();

      // show image or open doc
      // const doc = 'https://sage3.sagecommons.org/wp-content/uploads/2022/11/SAGE3-2022.pdf';
      // window.open(doc, '_blank');

      // Returning false stops the event and prevents default browser events
      return false;
    },
    // Depends on the cursor to get the correct position
    {dependencies: [cursorPosition.x, cursorPosition.y]}
  );

  // Move the board with the arrow keys
  useHotkeys(
    'up, down, left, right',
    (event: KeyboardEvent): void | boolean => {
      if (selectedAppId !== '') return;
      const shiftAmount = 50 / scale; // Grid size adjusted for scale factor
      if (event.key === 'ArrowUp') {
        setBoardPosition({x: boardPosition.x, y: boardPosition.y + shiftAmount});
      } else if (event.key === 'ArrowDown') {
        setBoardPosition({x: boardPosition.x, y: boardPosition.y - shiftAmount});
      } else if (event.key === 'ArrowLeft') {
        setBoardPosition({x: boardPosition.x + shiftAmount, y: boardPosition.y});
      } else if (event.key === 'ArrowRight') {
        setBoardPosition({x: boardPosition.x - shiftAmount, y: boardPosition.y});
      }
      // Returning false stops the event and prevents default browser events
      return false;
    },
    // Depends on the cursor to get the correct position
    {dependencies: [cursorPosition.x, cursorPosition.y, selectedAppId, boardPosition.x, boardPosition.y]}
  );

  // Zoom in/out of the board with the -/+ keys
  useHotkeys(
    '-, =',
    (event: KeyboardEvent): void | boolean => {
      if (selectedAppId !== '') return;
      if (event.key === '-') {
        zoomOutDelta(-10, mousePosition);
      } else if (event.key === '=') {
        zoomInDelta(10, mousePosition);
      }
      // Returning false stops the event and prevents default browser events
      return false;
    },
    // Depends on the cursor to get the correct position
    {dependencies: [mousePosition.x, mousePosition.y, selectedAppId]}
  );

  // Stickies Shortcut
  useHotkeys(
    'shift+s',
    (event: KeyboardEvent): void | boolean => {
      if (!user) return;
      const x = cursorPosition.x;
      const y = cursorPosition.y;
      createApp(
        setupApp(user.data.name, 'Stickie', x, y, props.roomId, props.boardId, {
          w: 400,
          h: 400
        }, {color: user.data.color || 'yellow'})
      );

      // Returning false stops the event and prevents default browser events
      return false;
    },
    // Depends on the cursor to get the correct position
    {dependencies: [cursorPosition.x, cursorPosition.y]}
  );

  useEffect(() => {
    // if app selected, don't allow lasso, othwerwise it consumes the event away from the app
    if (selectedAppId !== '') return;
    if (isShiftPressed) {
      document.onselectstart = function () {
        return false;
      };
    }
    setLassoMode(isShiftPressed);
  }, [isShiftPressed]);

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
      onScroll={(evt) => {
        evt.stopPropagation();
      }}
      onWheel={(evt: any) => {
        evt.stopPropagation();
        const cursor = {x: evt.clientX, y: evt.clientY};
        if (evt.deltaY < 0) {
          zoomInDelta(evt.deltaY, cursor);
        } else if (evt.deltaY > 0) {
          zoomOutDelta(evt.deltaY, cursor);
        }
      }}
    >
      <Modal isCentered isOpen={helpIsOpen} onClose={helpOnClose}>
        <HelpModal onClose={helpOnClose} isOpen={helpIsOpen}></HelpModal>
      </Modal>

      <Modal isCentered isOpen={isNotebookModalOpen} onClose={onNotebookModalClose}>
        <NotebookModal onNotebookModalClose={onNotebookModalClose} isNotebookModalOpen={isNotebookModalOpen}
                       roomId={props.roomId} boardId={props.boardId}></NotebookModal>
      </Modal>
    </Box>
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
