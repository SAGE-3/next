/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useState } from 'react';

// React component for efficiently rendering large lists and tabular data
import { Virtuoso } from 'react-virtuoso';

import { Box, Input, InputLeftAddon, InputGroup, Flex, Divider, Spacer, VStack } from '@chakra-ui/react';

import { FileEntry } from './types';
import { RowFile } from './RowFile';

export interface FilesProps {
  files: FileEntry[];
}

export function Files(props: FilesProps): JSX.Element {
  // The data list
  const [filesList, setList] = useState(props.files);

  // Element to set the focus to when opening the dialog
  const initialRef = React.useRef<HTMLInputElement>(null);
  const [sorted, setSorted] = useState<string>('file');

  // Update the file list to the list passed through props
  useEffect(() => {
    setList(props.files);
  }, [props.files]);

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
          <Box >Filename</Box> <Box>⬆︎</Box><Spacer />
        </Flex>
      );
      break;
    case 'file_r':
      headerFile = (
        <Flex>
          <Box >Filename</Box> <Box>⬇︎</Box><Spacer />
        </Flex>
      );
      break;
    case 'owner':
      headerOwner = (
        <Flex>
          <Spacer />
          <Box>Owner</Box>
          <Box>⬆︎</Box>
          <Spacer />
        </Flex>
      );
      break;
    case 'owner_r':
      headerOwner = (
        <Flex>
          <Spacer />
          <Box>Owner</Box>
          <Box>⬇︎</Box>
          <Spacer />
        </Flex>
      );
      break;
    case 'type':
      headerType = (
        <Flex>
          <Spacer />
          <Box>Type</Box>
          <Box>⬆︎</Box>
          <Spacer />
        </Flex>
      );
      break;
    case 'type_r':
      headerType = (
        <Flex>
          <Spacer />
          <Box>Type</Box>
          <Box>⬇︎</Box>
          <Spacer />
        </Flex>
      );
      break;
    case 'modified':
      headerModified = (
        <Flex>
          <Spacer />
          <Box>Modified</Box>
          <Box>⬆︎</Box>
          <Spacer />
        </Flex>
      );
      break;
    case 'modified_r':
      headerModified = (
        <Flex>
          <Spacer />
          <Box>Modified</Box>
          <Box>⬇︎</Box>
          <Spacer />
        </Flex>
      );
      break;
    case 'added':
      headerAdded = (
        <Flex>
          <Spacer />
          <Box>Added</Box>
          <Box>⬆︎</Box>
          <Spacer />
        </Flex>
      );
      break;
    case 'added_r':
      headerAdded = (
        <Flex>
          <Spacer />
          <Box>Added</Box>
          <Box>⬇︎</Box>
          <Spacer />
        </Flex>
      );
      break;
    case 'size':
      headerSize = (
        <Flex>
          <Spacer />
          <Box>Size</Box>
          <Box>⬆︎</Box>
          <Spacer />
        </Flex>
      );
      break;
    case 'size_r':
      headerSize = (
        <Flex>
          <Spacer />
          <Box>Size</Box>
          <Box>⬇︎</Box>
          <Spacer />
        </Flex>
      );
      break;
  }

  const headerClick = (order: 'file' | 'owner' | 'type' | 'modified' | 'added' | 'size') => {
    if (order === 'file') {
      // Store the list into the state after sorting by filename
      filesList.sort((a, b) => {
        // compare filenames case independent
        const namea = a.originalfilename.toLowerCase();
        const nameb = b.originalfilename.toLowerCase();
        if (namea < nameb) return -1;
        if (namea > nameb) return 1;
        return 0;
      });
      if (sorted === 'file') {
        filesList.reverse();
        setList(filesList);
        setSorted('file_r');
      } else {
        setList(filesList);
        setSorted('file');
      }
    } else if (order === 'owner') {
      // Store the list into the state after sorting by type
      filesList.sort((a, b) => {
        // compare names case independent
        const namea = a.ownerName.toLowerCase();
        const nameb = b.ownerName.toLowerCase();
        if (namea < nameb) return -1;
        if (namea > nameb) return 1;
        return 0;
      });
      if (sorted === 'owner') {
        filesList.reverse();
        setList(filesList);
        setSorted('owner_r');
      } else {
        setList(filesList);
        setSorted('owner');
      }
    } else if (order === 'type') {
      // Store the list into the state after sorting by type
      filesList.sort((a, b) => {
        // compare type names case independent
        const namea = a.type.toLowerCase();
        const nameb = b.type.toLowerCase();
        if (namea < nameb) return -1;
        if (namea > nameb) return 1;
        return 0;
      });
      if (sorted === 'type') {
        filesList.reverse();
        setList(filesList);
        setSorted('type_r');
      } else {
        setList(filesList);
        setSorted('type');
      }
    } else if (order === 'modified') {
      // Store the list into the state after sorting by date
      filesList.sort((a, b) => {
        // compare dates (number)
        return a.date - b.date;
      });
      if (sorted === 'modified') {
        filesList.reverse();
        setList(filesList);
        setSorted('modified_r');
      } else {
        setList(filesList);
        setSorted('modified');
      }
    } else if (order === 'added') {
      // Store the list into the state after sorting by date
      filesList.sort((a, b) => {
        // compare dates (number)
        return a.dateAdded - b.dateAdded;
      });
      if (sorted === 'added') {
        filesList.reverse();
        setList(filesList);
        setSorted('added_r');
      } else {
        setList(filesList);
        setSorted('added');
      }
    } else if (order === 'size') {
      // Store the list into the state after sorting by file size
      filesList.sort((a, b) => {
        // compare sizes
        return a.size - b.size;
      });
      if (sorted === 'size') {
        filesList.reverse();
        setList(filesList);
        setSorted('size_r');
      } else {
        setList(filesList);
        setSorted('size');
      }
    }
  };

  // Select the file when clicked
  const handleSearch = (event: React.FormEvent<HTMLInputElement>) => {
    event.preventDefault();
    const term = event.currentTarget.value;
    if (term) {
      // If something to search
      setList(
        props.files.filter((item) => {
          // if term is in the filename
          return (
            item.originalfilename.toUpperCase().indexOf(term.toUpperCase()) !== -1 ||
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
  const onClick = (p: FileEntry) => {
    setList(
      filesList.map((k) => {
        if (p.id === k.id) {
          // Flip the value
          k.selected = !k.selected;
        } else {
          k.selected = false;
        }
        return k;
      })
    );
  };

  return (
    <VStack w={"100%"} fontSize={"xs"}>
      {/* Search box */}
      <InputGroup size={"xs"}>
        <InputLeftAddon children="Search" />
        <Input ref={initialRef}
          size={"xs"} mb={2}
          focusBorderColor="gray.500"
          placeholder="name, owner, extension..."
          _placeholder={{ opacity: 1, color: 'gray.400' }}
          onChange={handleSearch}
        />
      </InputGroup>

      {/* Headers */}
      <Flex w="100%" fontFamily="mono" alignItems="center" userSelect={"none"}>
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
          height: '150px',
          width: '100%',
          borderCollapse: 'collapse',
        }}
        data={filesList}
        totalCount={filesList.length}
        // Content of the table
        itemContent={(idx, val) => <RowFile file={filesList[idx]} clickCB={onClick} />}
      />
    </VStack>
  );
}
