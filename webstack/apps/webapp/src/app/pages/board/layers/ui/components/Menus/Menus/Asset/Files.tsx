/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';

// React component for efficiently rendering large lists and tabular data
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

import {
  Box,
  Input,
  InputLeftAddon,
  InputGroup,
  Flex,
  Divider,
  Spacer,
  VStack,
  useDisclosure,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react';

import { getExtension } from '@sage3/shared';
import { FileEntry } from '@sage3/shared/types';
import { AppSchema } from '@sage3/applications/schema';
import { useUser, useUIStore, useAppStore, AssetHTTPService, setupAppForFile, useThrottleScale } from '@sage3/frontend';

import { RowFile } from './RowFile';

export interface FilesProps {
  files: FileEntry[];
  setSelection: (ids: string[]) => void;
}

type sortOrder = 'file' | 'owner' | 'type' | 'modified' | 'added' | 'size';
type sortType = {
  order: sortOrder;
  reverse: boolean;
};

export function Files(props: FilesProps): JSX.Element {
  const { user } = useUser();

  // The data list
  const [filesList, setList] = useState(props.files);
  const [updated, setUpdated] = useState(false);
  // Room and board
  const { boardId, roomId } = useParams();
  if (!boardId || !roomId) return <></>;

  // Modal for delete
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure({ id: 'delete' });
  // Modal for opening lots of files
  const { isOpen: lotsIsOpen, onOpen: lotsOnOpen, onClose: lotsOnClose } = useDisclosure();

  // The table object
  const virtuoso = useRef<VirtuosoHandle>(null);

  // Element to set the focus to when opening the dialog
  const initialRef = useRef<HTMLInputElement>(null);
  const [sorted, setSorted] = useState<sortType>({ order: 'added', reverse: false });
  const [searchTerm, setSearchTerm] = useState<string>('');
  // UI Store
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useThrottleScale(250);
  // How to create some applications
  const createBatch = useAppStore((state) => state.createBatch);

  // Update the file list to the list passed through props
  useEffect(() => {
    // reappy the sort
    const newList = sortFiles(props.files, sorted.order, sorted.reverse);
    setList(newList);
    // Clear the search
    setSearchTerm('');
    // Scroll to the top
    virtuoso.current?.scrollToIndex({ index: 0 });
  }, [props.files]);

  // Track the selection updates
  useEffect(() => {
    if (updated) {
      props.setSelection(filesList.filter((k) => k.selected).map((k) => k.id));
      setUpdated(false);
    }
  }, [updated]);

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
      <Spacer /> <Box>Size</Box> <Spacer /> <Box w="1rem"></Box>
    </Flex>
  );
  switch (sorted.order) {
    case 'file':
      if (sorted.reverse)
        headerFile = (
          <Flex>
            <Box>Filename</Box> <Box>⬇︎</Box>
            <Spacer />
          </Flex>
        );
      else
        headerFile = (
          <Flex>
            <Box>Filename</Box> <Box>⬆︎</Box>
            <Spacer />
          </Flex>
        );
      break;
    case 'owner':
      if (sorted.reverse)
        headerOwner = (
          <Flex>
            <Spacer />
            <Box>Owner</Box>
            <Box>⬇︎</Box>
            <Spacer />
          </Flex>
        );
      else
        headerOwner = (
          <Flex>
            <Spacer />
            <Box>Owner</Box>
            <Box>⬆︎</Box>
            <Spacer />
          </Flex>
        );
      break;
    case 'type':
      if (sorted.reverse)
        headerType = (
          <Flex>
            <Spacer />
            <Box>Type</Box>
            <Box>⬇︎</Box>
            <Spacer />
          </Flex>
        );
      else
        headerType = (
          <Flex>
            <Spacer />
            <Box>Type</Box>
            <Box>⬆︎</Box>
            <Spacer />
          </Flex>
        );
      break;
    case 'modified':
      if (sorted.reverse)
        headerModified = (
          <Flex>
            <Spacer />
            <Box>Modified</Box>
            <Box>⬇︎</Box>
            <Spacer />
          </Flex>
        );
      else
        headerModified = (
          <Flex>
            <Spacer />
            <Box>Modified</Box>
            <Box>⬆︎</Box>
            <Spacer />
          </Flex>
        );
      break;
    case 'added':
      if (sorted.reverse)
        headerAdded = (
          <Flex>
            <Spacer />
            <Box>Added</Box>
            <Box>⬇︎</Box>
            <Spacer />
          </Flex>
        );
      else
        headerAdded = (
          <Flex>
            <Spacer />
            <Box>Added</Box>
            <Box>⬆︎</Box>
            <Spacer />
          </Flex>
        );
      break;
    case 'size':
      if (sorted.reverse)
        headerSize = (
          <Flex>
            <Spacer />
            <Box>Size</Box>
            <Box>⬇︎</Box>
            <Spacer />
          </Flex>
        );
      else
        headerSize = (
          <Flex>
            <Spacer />
            <Box>Size</Box>
            <Box>⬆︎</Box>
            <Spacer />
          </Flex>
        );
      break;
  }

  const sortFiles = (aList: FileEntry[], order: sortOrder, reverse: boolean) => {
    if (order === 'file') {
      // Store the list into the state after sorting by filename
      aList.sort((a, b) => {
        // compare filenames case independent
        const namea = a.originalfilename.toLowerCase();
        const nameb = b.originalfilename.toLowerCase();
        if (namea < nameb) return -1;
        if (namea > nameb) return 1;
        return 0;
      });
    } else if (order === 'owner') {
      // Store the list into the state after sorting by type
      aList.sort((a, b) => {
        // compare names case independent
        const namea = a.ownerName.toLowerCase();
        const nameb = b.ownerName.toLowerCase();
        if (namea < nameb) return -1;
        if (namea > nameb) return 1;
        return 0;
      });
    } else if (order === 'type') {
      // Store the list into the state after sorting by type
      aList.sort((a, b) => {
        // compare type names case independent
        const namea = getExtension(a.type).toLowerCase();
        const nameb = getExtension(b.type).toLowerCase();
        if (namea < nameb) return -1;
        if (namea > nameb) return 1;
        return 0;
      });
    } else if (order === 'modified') {
      // Store the list into the state after sorting by date
      aList.sort((a, b) => {
        // compare dates (number)
        return a.date - b.date;
      });
    } else if (order === 'added') {
      // Store the list into the state after sorting by date
      aList.sort((a, b) => {
        // compare dates (number)
        return b.dateAdded - a.dateAdded;
      });
    } else if (order === 'size') {
      // Store the list into the state after sorting by file size
      aList.sort((a, b) => {
        // compare sizes
        return a.size - b.size;
      });
    }
    // if reverse order
    if (reverse) {
      aList.reverse();
    }
    return aList;
  };

  const headerClick = (order: sortOrder) => {
    setSorted({ order: order, reverse: !sorted.reverse });
    setList((prev) => {
      const newList = sortFiles(prev, order, !sorted.reverse);
      return newList;
    });
    // Scroll to the top
    virtuoso.current?.scrollToIndex({ index: 0 });
  };

  // Select the file when clicked
  const handleSearch = (event: React.FormEvent<HTMLInputElement>) => {
    event.preventDefault();
    const term = event.currentTarget.value;
    setSearchTerm(term);
    if (term) {
      // If something to search
      setList(
        props.files.filter((item) => {
          // if term is in the filename
          return (
            // search in the filename
            item.originalfilename.toUpperCase().indexOf(term.toUpperCase()) !== -1 ||
            // search in the type
            item.type.toUpperCase().indexOf(term.toUpperCase()) !== -1 ||
            // search in the owner name
            item.ownerName.toUpperCase().indexOf(term.toUpperCase()) !== -1
          );
        })
      );
    } else {
      // Full list if no search term
      setList(props.files);
    }
  };

  // Select the file when clicked
  // shift: extends the seelction to new position above or below
  // modifier: ctrl/cmd pick and extend selection
  const onClick = (p: FileEntry, shift: boolean, modif: boolean) => {
    setList((prev) => {
      let started = false;
      const newList = prev.map((k) => {
        if (shift && k.selected) started = !started;
        if (p.id === k.id) {
          started = !started;
          // Flip the selection
          return { ...k, selected: !k.selected };
        } else {
          if (!modif) {
            // Deselect any other
            if (shift && started) return { ...k, selected: true };
            else return { ...k, selected: k.selected && shift };
          } else return k;
        }
      });
      return newList;
    });
    setUpdated(true);
  };

  const dragCB = (e: React.DragEvent<HTMLDivElement>) => {
    const flist: string[] = []; // file id list
    const tlist: string[] = []; // file type list
    filesList.forEach((f) => {
      // add the file information in the lists
      if (f.selected) {
        flist.push(f.id);
        tlist.push(f.type);
      }
    });
    // storing the files id in the dataTransfer object
    e.dataTransfer.setData('file', JSON.stringify(flist));
    e.dataTransfer.setData('type', JSON.stringify(tlist));
  };

  // Perform the files opening
  const doOpenFiles = async () => {
    if (!user) return;
    const selected = filesList.filter((k) => k.selected);
    // Get around  the center of the board
    const xDrop = Math.floor(-boardPosition.x + window.innerWidth / scale / 2);
    const yDrop = Math.floor(-boardPosition.y + window.innerHeight / scale / 2);
    // Array for batch creation
    const setupArray: AppSchema[] = [];
    let xpos = xDrop;
    for (let k in selected) {
      // Create the apps, 400 pixels + 20 padding
      const setup = await setupAppForFile(selected[k], xpos, yDrop, roomId, boardId, user);
      if (setup) {
        setupArray.push(setup);
        xpos += setup.size.width + 10;
      }
    }
    // Create all the apps in batch
    createBatch(setupArray);
  };

  // Select the file when clicked
  const onKeyboard = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      setList((prev) => {
        if (e.key === 'ArrowDown') {
          const first = filesList.findIndex((k) => k.selected);
          if (first < prev.length - 1) {
            prev[first] = { ...prev[first], selected: false };
            prev[first + 1] = { ...prev[first + 1], selected: true };
          }
          virtuoso.current?.scrollIntoView({
            index: first + 1,
            behavior: 'auto',
          });
        } else if (e.key === 'ArrowUp') {
          // @ts-expect-error
          const last = filesList.findLastIndex((k) => k.selected);
          if (last > 0) {
            prev[last - 1] = { ...prev[last - 1], selected: true };
            prev[last] = { ...prev[last], selected: false };
            virtuoso.current?.scrollIntoView({
              index: last - 1,
              behavior: 'auto',
            });
          }
        }
        return [...prev];
      });
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      onDeleteOpen();
    } else if (e.key === 'Enter') {
      // Get the selected files
      const selected = filesList.filter((k) => k.selected);
      // If small number of files, do open the apps
      if (selected.length <= 20) {
        doOpenFiles();
      } else {
        // Otherwise a modal to check
        lotsOnOpen();
      }
    }
    setUpdated(true);
  };

  return (
    <>
      <VStack w={'100%'} fontSize={'xs'}>
        {/* Search box */}
        <InputGroup size={'xs'}>
          <InputLeftAddon children="Search" />
          <Input
            ref={initialRef}
            size={'xs'}
            mb={2}
            focusBorderColor="gray.500"
            placeholder="name, owner, extension..."
            _placeholder={{ opacity: 1, color: 'gray.400' }}
            value={searchTerm}
            onChange={handleSearch}
          />
        </InputGroup>

        {/* Headers */}
        <Flex w="100%" fontFamily="mono" alignItems="center" userSelect={'none'}>
          <Box flex="1" onClick={() => headerClick('file')} pr={4}>
            {headerFile}
          </Box>
          <Box w="80px" onClick={() => headerClick('owner')}>
            {headerOwner}
          </Box>
          <Box w="90px" onClick={() => headerClick('type')}>
            {headerType}
          </Box>
          <Box w="70px" onClick={() => headerClick('modified')}>
            {headerModified}
          </Box>
          <Box w="140px" onClick={() => headerClick('added')}>
            {headerAdded}
          </Box>
          <Box w="60px" onClick={() => headerClick('size')} pr={4}>
            {headerSize}
          </Box>
        </Flex>

        <Divider mb={1} />

        {/* Listing the files in a 'table' */}
        <Virtuoso
          style={{
            height: '140px',
            width: '100%',
            borderCollapse: 'collapse',
          }}
          ref={virtuoso}
          data={filesList}
          totalCount={filesList.length}
          onKeyDown={onKeyboard}
          // Content of the table
          itemContent={(idx) => <RowFile key={filesList[idx].id} file={filesList[idx]} clickCB={onClick} dragCB={dragCB} scale={scale} />}
        />
      </VStack>

      {/* Delete a file modal */}
      <Modal isCentered isOpen={isDeleteOpen} onClose={onDeleteClose} size={'2xl'} blockScrollOnMount={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete an Asset</ModalHeader>
          <ModalBody>Are you sure you want to delete the selected files ?</ModalBody>
          <ModalFooter>
            <Button colorScheme="green" size="sm" mr={3} onClick={onDeleteClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              size="sm"
              onClick={() => {
                const toDelete = filesList.filter((k) => k.selected);
                toDelete.forEach((k) => {
                  AssetHTTPService.del(k.id);
                });
                onDeleteClose();
              }}
            >
              Yes, Delete it
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isCentered isOpen={lotsIsOpen} onClose={lotsOnClose} size={'2xl'} blockScrollOnMount={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Opening Assets</ModalHeader>
          <ModalBody>Are you sure you want to open {filesList.filter((k) => k.selected).length} assets?</ModalBody>
          <ModalFooter>
            <Button colorScheme="red" size="sm" mr={3} onClick={lotsOnClose}>
              Cancel
            </Button>
            <Button
              colorScheme="green"
              size="sm"
              onClick={async () => {
                // Do open the files
                doOpenFiles();
                // Close the modal
                lotsOnClose();
              }}
            >
              Yes, Open all of them
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
