/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Import react and modules
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Date manipulation functions for file manager
import { format as formatDate } from 'date-fns';
// React component for efficiently rendering large lists and tabular data
import { FixedSizeList } from 'react-window';

// Import Chakra UI elements
import {
  Box, Input, InputLeftAddon, InputGroup, Button, Flex, ModalBody, ModalFooter,
  Divider, Spacer,
  useEventListener, useDisclosure, Portal, useColorMode, useColorModeValue,
  useToast,
} from '@chakra-ui/react';

// Import SAGE libraries
import { PanZoomState } from '@sage3/shared/types';
import { getDataTypes, findMatchingApps, createDataMapping } from '@sage3/shared/data-matcher';
import * as AppMetadata from '@sage3/app-metadata';

// Icons for file types
import { MdOutlinePictureAsPdf, MdOutlineImage, MdOutlineFilePresent, MdOndemandVideo, MdOutlineStickyNote2 } from 'react-icons/md';

// Ace editor
import AceEditor from 'react-ace';
import 'ace-builds/src-min-noconflict/mode-json.js';
// Dark mode
import 'ace-builds/src-min-noconflict/theme-monokai.js';
// Light mode
import 'ace-builds/src-min-noconflict/theme-github.js';

// SAGE3 components
import { S3Modal, textColor } from '@sage3/frontend/ui';
import { useUser } from '@sage3/frontend/services';
import { humanFileSize, downloadFile } from '@sage3/frontend/utils/misc';
import { useSocket } from '@sage3/frontend/utils/misc/socket';
import "./menu.scss";

type Point = {
  x: number;
  y: number;
};

/**
 * One row per file
 */
type FileEntry = {
  id: string;
  filename: string;
  originalfilename: string;
  owner: string;
  date: number;
  dateAdded: number;
  boardId: string;
  size: number;
  type: string;
  exif: any;
  selected: boolean;
};

type RowFileProps = {
  file: FileEntry;
  clickCB: (p: FileEntry) => void;
  dbclickCB: (p: FileEntry) => void;
  style: React.CSSProperties;
};

/**
 * Component diplaying one file in a row
 * Can be selected with a click
 * Change background color on hover
 * @param p FileEntry
 * @returns
 */
function RowFile({ file, clickCB, dbclickCB, style }: RowFileProps) {
  // check if user is a guest
  const { userRole } = useUser();
  const toast = useToast()
  // Store if the file is selected or not
  const [selected, setSelected] = useState(file.selected);
  const buttonRef = useRef<HTMLDivElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 });
  // show the context menu
  const [showMenu, setShowMenu] = useState(false);
  // Modal showing file information
  const { isOpen, onOpen, onClose } = useDisclosure({ id: 'exif' });
  // Reference to the text area showing the exif information
  const aceEditorRef = React.useRef<AceEditor>(null);
  // dark/light modes
  const { colorMode } = useColorMode();

  // Select the file when clicked
  const onSingleClick = (e: MouseEvent): void => {
    // Flip the value
    setSelected((s) => !s);
    clickCB(file);
    if (showMenu) setShowMenu(false);
  };
  // Select the file when double-clicked
  const onDoubleClick = (e: MouseEvent): void => {
    dbclickCB(file);
  };

  // Context menu selection handler
  const actionClick = (e: React.MouseEvent<HTMLLIElement>): void => {
    const id = e.currentTarget.id;
    if (id === 'down') {
      // download a file
      downloadFile('api/assets/' + file.filename, file.originalfilename);
    } else if (id === 'del') {
      if (userRole !== 'guest') {
        // Delete a file
        axios.get('/api/content/asset/delete/' + file.id, { withCredentials: true });
      } else {
        toast({
          title: 'Guests cannot delete assets',
          status: 'warning',
          duration: 4000,
          isClosable: true,
        });
      }
    } else if (id === 'info') {
      // open a panel showing EXIF data
      onOpen();
    }
    // deselect file selection
    setSelected(false);
    // hide context menu
    setShowMenu(false);
  };

  useEffect(() => {
    divRef.current?.addEventListener('click', onSingleClick);
  }, [divRef]);
  useEffect(() => {
    buttonRef.current?.addEventListener('dblclick', onDoubleClick);
  }, [buttonRef]);

  // Context menu handler (right click)
  useEventListener('contextmenu', e => {
    // deselect file selection
    setSelected(false);
    // hide context menu
    setShowMenu(false);
    if (divRef.current?.contains(e.target as any)) {
      // capture the cursor position to show the menu
      setAnchorPoint({ x: e.pageX, y: e.pageY });
      // show context menu
      setShowMenu(true);
      setSelected(true);
    }
    e.preventDefault();
  });

  // pick an icon based on file type (extension string)
  const whichIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return <MdOutlinePictureAsPdf style={{ color: 'tomato' }} size={'20px'} />;
      case 'JPEG':
        return <MdOutlineImage style={{ color: 'lightblue' }} size={'20px'} />;
      case 'MP4':
        return <MdOndemandVideo style={{ color: 'lightgreen' }} size={'20px'} />;
      case 'JSON':
        return <MdOutlineStickyNote2 style={{ color: 'darkgray' }} size={'20px'} />;
      default:
        return <MdOutlineFilePresent size={'20px'} />;
    }
  };

  // Generate a human readable string from date
  const modif = formatDate(new Date(file.date), 'MM/dd/yyyy');
  const added = formatDate(new Date(file.dateAdded), 'MM/dd/yyyy');
  // Select the color when item is selected
  const highlight = selected ? 'teal.600' : 'inherit';
  const colorHover = useColorModeValue('gray.400', 'gray.600');
  const hover = selected ? highlight : colorHover;
  const bgColor = useColorModeValue('#EDF2F7', '#4A5568');
  const border = useColorModeValue('1px solid #4A5568', '1px solid #E2E8F0');

  return (
    <div ref={divRef} style={{ ...style }}>
      <Flex textColor={textColor()} bg={highlight} _hover={{ background: hover }} ref={buttonRef} fontFamily="mono" alignItems="center">
        <Box w="30px">{whichIcon(file.type)}</Box>
        <Box flex="1" overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
          {file.originalfilename}
        </Box>
        <Box w="120px" textAlign="right">
          {file.owner.substring(0, 12)}
        </Box>
        <Box w="110px" textAlign="center">
          {file.type}
        </Box>
        <Box w="110px" textAlign="right">
          {modif}
        </Box>
        <Box w="110px" textAlign="right">
          {added}
        </Box>
        <Box w="110px" textAlign="right" pr={2}>
          {humanFileSize(file.size)}
        </Box>
      </Flex>
      {showMenu ? (
        <Portal>
          <ul className='s3contextmenu'
            style={{
              top: anchorPoint.y, left: anchorPoint.x,
              background: bgColor, border: border,
            }}
          >
            <li className='s3contextmenuitem' id={'del'} onClick={actionClick}>Delete</li>
            <li className='s3contextmenuitem' id={'down'} onClick={actionClick}>Download</li>
            <hr className='divider' />
            <li className='s3contextmenuitem' id={'info'} onClick={actionClick}>Info</li>
          </ul>
        </Portal>
      ) : (
        <> </>
      )}

      {/* EXIF info */}
      <S3Modal isOpen={isOpen} onClose={onClose} title={'File Metadata'} size={'3xl'}>
        <ModalBody>
          <AceEditor
            mode={'json'}
            theme={colorMode === 'light' ? "github" : "monokai"}
            name="ace-editor"
            value={JSON.stringify(file.exif, null, 2)}
            readOnly={true}
            ref={aceEditorRef}
            focus={true}
            setOptions={{
              fontSize: 12, wrap: true,
              hasCssTransforms: true, useWorker: false,
              showLineNumbers: false, showGutter: false,
              showPrintMargin: false, highlightActiveLine: true,
            }}
            height={'200px'}
            width={'100%'}
          />
        </ModalBody>

        <ModalFooter>
          <Button colorScheme='blue' mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </S3Modal>

    </div>
  );
}

/**
 * Props for the file manager modal behavior
 * from Chakra UI Modal dialog
 */
type FileManagerProps = {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
  zoomState: PanZoomState;
  canvasSize: { width: number; height: number };
};

/**
 * React component to get and display the asset list
 */
const FileManager = ({ boardId, isOpen, onClose, zoomState, canvasSize }: FileManagerProps): JSX.Element => {
  // The data list
  const [filesList, setList] = useState([] as FileEntry[]);
  const serverData = useRef<FileEntry[]>();
  const [sorted, setSorted] = useState<string>('file');
  // when the file list needs to be refreshed
  const [needUpdate, setNeedUpdate] = useState(false);
  // Element to set the focus to when opening the dialog
  const initialRef = React.useRef<HTMLInputElement>(null);
  // socket mesage to get asset updates
  const socket = useSocket();

  // Listens to updates for assets
  useEffect(() => {
    function assetUpdate(update: any) {
      // check if it's for this board
      if (boardId === update.boardId) {
        setNeedUpdate(true);
      }
    }
    // socket handler for asset updates
    socket.on('assets-update', assetUpdate);
    return () => {
      // remove the socket handler
      socket.off('assets-update', assetUpdate);
    }
  }, [socket, boardId]);

  // Initial setup when modal is opened
  useEffect(() => {
    if (isOpen) {
      // flip the update switch
      setNeedUpdate(false);
      // do the network request
      axios.get('/api/content/assets').then((res) => {
        const assets = res.data;
        // Filter the asset keys for this board
        const keys = Object.keys(assets).filter((k) => assets[k].boardId === boardId);
        // Create entries
        serverData.current = keys.map((k) => {
          const item = assets[k];
          let entry: FileEntry;
          if (item.exif) {
            // Select one of the date available
            let realDate;
            if (!isNaN(Date.parse(item.exif.CreateDate))) {
              realDate = new Date(item.exif.CreateDate);
            } else if (!isNaN(Date.parse(item.exif.DateTimeOriginal))) {
              realDate = new Date(item.exif.DateTimeOriginal);
            } else if (!isNaN(Date.parse(item.exif.ModifyDate))) {
              realDate = new Date(item.exif.ModifyDate);
            } else if (!isNaN(Date.parse(item.exif.FileModifyDate))) {
              realDate = new Date(item.exif.FileModifyDate);
            } else {
              realDate = new Date();
            }
            // Select the first element of the mime type, nicer to display
            const fileType = item.exif.FileType.split('/')[0];
            // build an FileEntry object
            entry = {
              id: item.id,
              owner: item.owner,
              filename: item.file,
              originalfilename: item.originalfilename,
              date: realDate.getTime(),
              dateAdded: new Date(item.dateAdded).getTime(),
              boardId: item.boardId,
              size: item.exif.FileSize,
              type: fileType.toUpperCase(),
              // Add a few info in the exif object
              exif: { id: item.id, originalfilename: item.originalfilename, owner: item.owner, url: 'api/assets/' + item.file, ...item.exif },
              selected: false,
            };
          } else {
            // build an FileEntry object
            entry = {
              id: item.id,
              owner: '-',
              filename: item.file,
              originalfilename: item.originalfilename,
              date: new Date().getTime(),
              dateAdded: new Date(item.dateAdded).getTime(),
              boardId: "-",
              size: 1,
              type: '-',
              exif: null,
              selected: false,
            };
          }
          return entry;
        });
        // Store the list into the state after sorting by filename
        setList(
          serverData.current.sort((a, b) => {
            // compare filenames case independent
            const namea = a.originalfilename.toLowerCase();
            const nameb = b.originalfilename.toLowerCase();
            if (namea < nameb) return -1;
            if (namea > nameb) return 1;
            return 0;
          })
        );
      })
        .catch((error) => {
          if (!error.response.data.authentication) document.location.href = '/';
        });
    }
  }, [isOpen, needUpdate]);

  // Select the file when clicked
  const handleSearch = (event: React.FormEvent<HTMLInputElement>) => {
    event.preventDefault();
    const term = event.currentTarget.value;
    if (serverData.current) {
      if (term) {
        // If something to search
        setList(
          serverData.current.filter((item) => {
            // if term is in the filename
            return (
              item.originalfilename.toUpperCase().indexOf(term.toUpperCase()) !== -1 ||
              item.owner.toUpperCase().indexOf(term.toUpperCase()) !== -1
            );
          })
        );
      } else {
        // Full list if no search term
        setList(serverData.current);
      }
    }
  };

  // Select the file when clicked
  const onClick = (p: FileEntry) => {
    if (serverData.current) {
      setList(
        filesList.map((k, idx) => {
          if (p.id === k.id) {
            // Flip the value
            k.selected = !k.selected;
          }
          return k;
        })
      );
    }
  };

  // Open one file and return the width of the application window
  const openOneFile = (p: FileEntry, c: Point): number => {
    const fileArray = [{ filename: p.filename }];
    const dataTypes = getDataTypes(fileArray);
    const matchingApps = findMatchingApps(dataTypes);
    const selectedApp = matchingApps.map((appSig) => ({
      appName: appSig.name,
      data: createDataMapping(fileArray, dataTypes, appSig),
    }));
    const appName = selectedApp[0].appName;

    // Build the payload with all the information
    const payload: {
      targetX?: number;
      targetY?: number;
      targetWidth?: number;
      targetHeight?: number;
      appName?: string;
      boardId: string;
      files: { originalname: string; filename: string; mimetype: string; id: string }[];
    } = {
      files: [{ filename: p.filename, originalname: p.originalfilename, id: p.id, mimetype: p.type }],
      boardId,
    };

    // Set the drop position
    payload.targetX = -c.x;
    payload.targetY = -c.y;
    // Put the name of the selected application
    payload.appName = appName;

    // Set a better aspect ratio based on EXIF metadata
    let realWidth = AppMetadata[appName as keyof typeof AppMetadata].initialSize.width as number;
    if (appName === 'imageViewer') {
      const ratio = p.exif.ImageWidth / p.exif.ImageHeight;
      if (ratio) {
        payload.targetWidth = 600;
        payload.targetHeight = payload.targetWidth / ratio;
        realWidth = payload.targetWidth;
      }
    }

    // Ask to open
    axios
      .post('/api/boards/open-files', payload)
      .then(() => {
        // Close the file manager
        onClose();
      })
      .catch((error) => {
        console.log('Error', error);
      });

    // Return the width of the application window
    return realWidth;
  };

  // Open file when double-clicked
  const onDBClick = (p: FileEntry) => {
    // Calculate center of the board
    const screenCenter = {
      x: zoomState.motionX.get() - window.innerWidth / zoomState.motionScale.get() / 2,
      y: zoomState.motionY.get() - window.innerHeight / zoomState.motionScale.get() / 2,
    };
    // Open the file
    openOneFile(p, screenCenter);
  };

  // Open the selected files
  const onOpenFiles = () => {
    // Calculate center of the board
    const c: Point = {
      x: zoomState.motionX.get() - window.innerWidth / zoomState.motionScale.get() / 2,
      y: zoomState.motionY.get() - window.innerHeight / zoomState.motionScale.get() / 2,
    };
    const xdrop = c.x;
    let ydrop = c.y;
    // Iterate over the selected files
    const files = filesList.filter((p) => p.selected);
    let offset = 0;
    let maxheight = 0;
    for (const p of files) {
      // Add the width of the previous app and a little more
      // Problem: no check if going outside the board...
      offset += openOneFile(p, { x: xdrop - offset, y: ydrop }) + 15;
      const fileHeight = p.exif.ImageHeight || 600;
      if (fileHeight && fileHeight > maxheight) {
        maxheight = fileHeight;
      }
      if ((xdrop - offset) < -canvasSize.width) {
        // reset the drop position below
        offset = 0;
        ydrop -= 400;
      }
    }


  };

  const headerClick = (order: 'name' | 'owner' | 'type' | 'modified' | 'added' | 'size') => {
    if (order === 'name' && serverData.current) {
      // Store the list into the state after sorting by filename
      const newlist = filesList.sort((a, b) => {
        // compare filenames case independent
        const namea = a.originalfilename.toLowerCase();
        const nameb = b.originalfilename.toLowerCase();
        if (namea < nameb) return -1;
        if (namea > nameb) return 1;
        return 0;
      });
      if (sorted === 'file') {
        newlist.reverse();
        setList(newlist);
        setSorted('file_r');
      } else {
        setList(newlist);
        setSorted('file');
      }
    } else if (order === 'owner' && serverData.current) {
      // Store the list into the state after sorting by type
      const newlist = filesList.sort((a, b) => {
        // compare names case independent
        const namea = a.owner.toLowerCase();
        const nameb = b.owner.toLowerCase();
        if (namea < nameb) return -1;
        if (namea > nameb) return 1;
        return 0;
      });
      if (sorted === 'owner') {
        newlist.reverse();
        setList(newlist);
        setSorted('owner_r');
      } else {
        setList(newlist);
        setSorted('owner');
      }
    } else if (order === 'type' && serverData.current) {
      // Store the list into the state after sorting by type
      const newlist = filesList.sort((a, b) => {
        // compare type names case independent
        const namea = a.type.toLowerCase();
        const nameb = b.type.toLowerCase();
        if (namea < nameb) return -1;
        if (namea > nameb) return 1;
        return 0;
      });
      if (sorted === 'type') {
        newlist.reverse();
        setList(newlist);
        setSorted('type_r');
      } else {
        setList(newlist);
        setSorted('type');
      }
    } else if (order === 'modified' && serverData.current) {
      // Store the list into the state after sorting by date
      const newlist = filesList.sort((a, b) => {
        // compare dates (number)
        return a.date - b.date;
      });
      if (sorted === 'modified') {
        newlist.reverse();
        setList(newlist);
        setSorted('modified_r');
      } else {
        setList(newlist);
        setSorted('modified');
      }
    } else if (order === 'added' && serverData.current) {
      // Store the list into the state after sorting by date
      const newlist = filesList.sort((a, b) => {
        // compare dates (number)
        return a.dateAdded - b.dateAdded;
      });
      if (sorted === 'added') {
        newlist.reverse();
        setList(newlist);
        setSorted('added_r');
      } else {
        setList(newlist);
        setSorted('added');
      }
    } else if (order === 'size' && serverData.current) {
      // Store the list into the state after sorting by file size
      const newlist = filesList.sort((a, b) => {
        // compare sizes
        return a.size - b.size;
      });
      if (sorted === 'size') {
        newlist.reverse();
        setList(newlist);
        setSorted('size_r');
      } else {
        setList(newlist);
        setSorted('size');
      }
    }
  };

  // Create the column headers. Add arrows indicating sorting.
  let headerFile, headerType, headerModified, headerAdded, headerSize, headerOwner;
  headerFile = (
    <Flex>
      <Box flex="1">Filename</Box> <Box w="1rem"></Box>
    </Flex>
  );
  headerOwner = (
    <Flex>
      <Spacer /> <Box>Owner</Box> <Spacer /> <Box w="1rem"></Box>
    </Flex>
  );
  headerType = (
    <Flex>
      <Spacer /> <Box>Type</Box> <Spacer /> <Box w="1rem"></Box>
    </Flex>
  );
  headerModified = (
    <Flex>
      <Spacer /> <Box>Modified</Box> <Spacer /> <Box w="1rem"></Box>
    </Flex>
  );
  headerAdded = (
    <Flex>
      <Spacer /> <Box>Added</Box> <Spacer /> <Box w="1rem"></Box>
    </Flex>
  );
  headerSize = (
    <Flex>
      <Spacer /> <Box>Size</Box> <Spacer /> <Box w="1rem"></Box>{' '}
    </Flex>
  );
  switch (sorted) {
    case 'file':
      headerFile = (
        <Flex>
          <Box flex="1">Filename</Box> <Box>⬆︎</Box>
        </Flex>
      );
      break;
    case 'file_r':
      headerFile = (
        <Flex>
          <Box flex="1">Filename</Box> <Box>⬇︎</Box>
        </Flex>
      );
      break;
    case 'owner':
      headerOwner = (
        <Flex>
          <Spacer />
          <Box>Owner</Box>
          <Spacer />
          <Box>⬆︎</Box>
        </Flex>
      );
      break;
    case 'owner_r':
      headerOwner = (
        <Flex>
          <Spacer />
          <Box>Owner</Box>
          <Spacer />
          <Box>⬇︎</Box>
        </Flex>
      );
      break;
    case 'type':
      headerType = (
        <Flex>
          <Spacer />
          <Box>Type</Box>
          <Spacer />
          <Box>⬆︎</Box>
        </Flex>
      );
      break;
    case 'type_r':
      headerType = (
        <Flex>
          <Spacer />
          <Box>Type</Box>
          <Spacer />
          <Box>⬇︎</Box>
        </Flex>
      );
      break;
    case 'modified':
      headerModified = (
        <Flex>
          <Spacer />
          <Box>Modified</Box>
          <Spacer />
          <Box>⬆︎</Box>
        </Flex>
      );
      break;
    case 'modified_r':
      headerModified = (
        <Flex>
          <Spacer />
          <Box>Modified</Box>
          <Spacer />
          <Box>⬇︎</Box>
        </Flex>
      );
      break;
    case 'added':
      headerAdded = (
        <Flex>
          <Spacer />
          <Box>Added</Box>
          <Spacer />
          <Box>⬆︎</Box>
        </Flex>
      );
      break;
    case 'added_r':
      headerAdded = (
        <Flex>
          <Spacer />
          <Box>Added</Box>
          <Spacer />
          <Box>⬇︎</Box>
        </Flex>
      );
      break;
    case 'size':
      headerSize = (
        <Flex>
          <Spacer />
          <Box>Size</Box>
          <Spacer />
          <Box>⬆︎</Box>
        </Flex>
      );
      break;
    case 'size_r':
      headerSize = (
        <Flex>
          <Spacer />
          <Box>Size</Box>
          <Spacer />
          <Box>⬇︎</Box>
        </Flex>
      );
      break;
  }

  return (
    <S3Modal isOpen={isOpen} onClose={onClose} title={'Asset Browser'} size={'6xl'}>
      <ModalBody userSelect={'none'}>
        {/* Search box */}
        <InputGroup>
          <InputLeftAddon children="Search" />
          <Input ref={initialRef} placeholder="filename..." mb={2} focusBorderColor="gray.500" onChange={handleSearch} />
        </InputGroup>

        {/* Headers */}
        <Flex textColor={textColor()} fontFamily="mono" alignItems="center">
          <Box flex="1" onClick={() => headerClick('name')} pr={4}>
            {headerFile}
          </Box>
          <Box w="120px" onClick={() => headerClick('owner')}>
            {headerOwner}
          </Box>
          <Box w="110px" onClick={() => headerClick('type')}>
            {headerType}
          </Box>
          <Box w="110px" onClick={() => headerClick('modified')}>
            {headerModified}
          </Box>
          <Box w="110px" onClick={() => headerClick('added')}>
            {headerAdded}
          </Box>
          <Box w="110px" onClick={() => headerClick('size')} pr={4}>
            {headerSize}
          </Box>
        </Flex>

        <Divider mb={1} />

        {/* React-window element: sorted forces a redraw after sort */}
        <FixedSizeList
          {...sorted}
          height={150}
          width="100%"
          itemCount={filesList.length}
          itemSize={22}
          itemData={filesList}
          itemKey={(i, d) => d[i].id}
        >
          {/* Iterate over the file list */}
          {({ index, style, data }) => <RowFile file={data[index]} clickCB={onClick} dbclickCB={onDBClick} style={style} />}
        </FixedSizeList>
      </ModalBody>

      <ModalFooter>
        <Button colorScheme="blue" mr={3} onClick={onOpenFiles}>
          Open File(s)
        </Button>
        <Button mr={3} onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </S3Modal>
  );
};

export default FileManager;
