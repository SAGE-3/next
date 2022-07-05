/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useState } from 'react';

// React component for efficiently rendering large lists and tabular data
import { Virtuoso } from 'react-virtuoso'

import { FileManagerProps, FileEntry } from './types';
import { RowFile } from './row';

import {
  Box,
  Input,
  InputLeftAddon,
  InputGroup,
  Flex,
  Divider,
  Spacer
} from '@chakra-ui/react';

import "./menu.scss";

export function FileManager(props: FileManagerProps): JSX.Element {
  // The data list
  const [filesList, setList] = useState(props.files);

  // Element to set the focus to when opening the dialog
  const initialRef = React.useRef<HTMLInputElement>(null);
  const [sorted, setSorted] = useState<string>('file');

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

  /*
        serverData.current.sort((a, b) => {
          // compare filenames case independent
          const namea = a.originalfilename.toLowerCase();
          const nameb = b.originalfilename.toLowerCase();
          if (namea < nameb) return -1;
          if (namea > nameb) return 1;
          return 0;
        })
  */


  const headerClick = (order: 'name' | 'owner' | 'type' | 'modified' | 'added' | 'size') => {
    if (order === 'name') {
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
    } else if (order === 'owner') {
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
    } else if (order === 'type') {
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
    } else if (order === 'modified') {
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
    } else if (order === 'added') {
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
    } else if (order === 'size') {
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
            item.owner.toUpperCase().indexOf(term.toUpperCase()) !== -1
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
    // setList(
    props.files.map((k) => {
      if (p.id === k.id) {
        // Flip the value
        k.selected = !k.selected;
      }
      return k;
    })
    // );
  };

  // Open file when double-clicked
  // const onDBClick = (p: FileEntry) => {
  //   // Open the file
  //   props.openFiles([p]);
  // };

  return (
    <>
      {/* Search box */}
      < InputGroup >
        <InputLeftAddon children="Search" />
        <Input ref={initialRef} placeholder="filename..." mb={2}
          focusBorderColor="gray.500"
          onChange={handleSearch}
        />
      </InputGroup >

      {/* Headers */}
      < Flex fontFamily="mono" alignItems="center" >
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
      </Flex >

      <Divider mb={1} />

      {/* Listing the files in a 'table' */}
      <Virtuoso
        style={{
          height: '150px', width: '100%',
          borderCollapse: 'collapse',
        }}
        data={filesList}
        totalCount={filesList.length}
        // Content of the table
        itemContent={(idx, val) => (
          <RowFile file={filesList[idx]} clickCB={onClick} />
        )}
      />

    </>);
}