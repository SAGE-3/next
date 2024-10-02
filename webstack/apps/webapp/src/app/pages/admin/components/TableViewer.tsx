/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Button,
  Tfoot,
  Heading,
  InputGroup,
  InputLeftElement,
  Input,
  IconButton,
  TableContainer,
  Table,
  Tooltip,
  Box,
  useColorModeValue,
} from '@chakra-ui/react';
import { SAGEColors, fuzzySearch } from '@sage3/shared';
import { SBDoc } from '@sage3/shared/types';
import { use } from 'passport';
import { useState } from 'react';
import { MdSearch, MdRefresh } from 'react-icons/md';

type TableDataType<T> = SBDoc & { data: T };

interface TableViewerProps<T> {
  heading: string;
  data: TableDataType<T>[];
  columns: (keyof T | keyof SBDoc)[];
  onRefresh: () => void;

  actions?: {
    label: string;
    color: SAGEColors;
    onClick: (id: string) => void;
  }[];
}

const CellStyle = {
  textOverflow: 'hidden',
  whiteSpace: 'no-wrap',
};

export function TableViewer<T>(props: TableViewerProps<T>): JSX.Element {
  const heading = props.heading;
  const data = props.data;
  const dataCount = data.length;
  const columns = props.columns;

  const headerBackgroundColor = useColorModeValue('teal.200', 'teal.600');
  const headerTextColor = useColorModeValue('black', 'white');

  const TableHeader = (columns: (keyof T | keyof SBDoc)[]) => {
    return (
      <Thead position="sticky" top={0} zIndex={2} bg={headerBackgroundColor}>
        <Tr>
          {columns.map((column, i) => (
            <Th key={i} style={CellStyle} color={headerTextColor}>
              {column.toString()}
            </Th>
          ))}
          {props.actions && (
            <Th style={CellStyle} color={headerTextColor}>
              Actions
            </Th>
          )}
        </Tr>
      </Thead>
    );
  };

  const TableBody = (data: TableDataType<T>[], columns: (keyof T | keyof SBDoc)[]) => {
    return (
      <Tbody>
        {data.map((item: any, i) => {
          return (
            <Tr key={item._id}>
              {columns.map((column, j) => {
                // Check if column is in the root item
                if (column in item) {
                  return (
                    <Td key={j} style={CellStyle}>
                      {item[column]}
                    </Td>
                  );
                } else {
                  // Check if column is in the data object
                  if (column in item.data) {
                    return (
                      <Td key={j} style={CellStyle}>
                        {item.data[column]}
                      </Td>
                    );
                  }
                }
                return <Td key={j} style={CellStyle}></Td>;
              })}
              {props.actions && (
                <Td textOverflow="hidden" whiteSpace="hidden">
                  {props.actions.map((action, j) => (
                    <Button key={j} mr={j === 0 ? 0 : 2} colorScheme={action.color} size="xs" onClick={() => action.onClick(item._id)}>
                      {action.label}
                    </Button>
                  ))}
                </Td>
              )}
            </Tr>
          );
        })}
      </Tbody>
    );
  };

  const TableFooter = (columns: (keyof T | keyof SBDoc)[]) => {
    return (
      <Tfoot>
        <Tr>
          {columns.map((column, i) => (
            <Th key={i} style={CellStyle}>
              {column.toString()}
            </Th>
          ))}
          {props.actions && <Th style={CellStyle}>Actions</Th>}
        </Tr>
      </Tfoot>
    );
  };

  // const [sortBy, setSortBy] = useState<keyof T>();
  //  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  //  const handleSort = (column: keyof T) => {
  //    if (sortBy === column) {
  //      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  //    } else {
  //      setSortBy(column);
  //      setSortOrder('asc');
  //    }
  //  };
  //  const sort = (a: T, b: T) => {
  //     if (!sortBy) return 0;
  //     // Handle sorting for different types
  //     if (typeof a[sortBy] === 'string') {
  //       if (a[sortBy] < b[sortBy]) return sortOrder === 'asc' ? -1 : 1;
  //       if (a[sortBy] > b[sortBy]) return sortOrder === 'asc' ? 1 : -1;
  //       return 0;
  //     }
  //     if (typeof a[sortBy] === 'number') {
  //       if (a[sortBy] < b[sortBy]) return sortOrder === 'asc' ? -1 : 1;
  //       if (a[sortBy] > b[sortBy]) return sortOrder === 'asc' ? 1 : -1;
  //       return 0;
  //     }
  //     return 0;
  //  };

  const [search, setSearch] = useState('');
  const searchFilter = (item: TableDataType<T>) => {
    // Get all the values from the selected columns and concat in to one string
    let values: Array<string | number | boolean> = [];
    columns.forEach((column) => {
      if (column in item) {
        // @ts-ignore
        const value = item[column];
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          values.push(value);
        }
      } else {
        // @ts-ignore
        if (column in item.data) {
          // @ts-ignore
          const value = item.data[column];
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            values.push(value);
          }
        }
      }
    });
    // Extract the values from the room object that are strings, numbers, or booleans
    const searchStr = values.join(' ');
    return fuzzySearch(searchStr, search);
  };
  // Chakra Table
  return (
    <>
      <Heading>
        {heading} ({dataCount})
      </Heading>

      <InputGroup my="2" colorScheme="teal">
        <InputLeftElement pointerEvents="none">
          <MdSearch color="gray.300" />
        </InputLeftElement>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" width="500px" />
        <Tooltip label="Refresh" aria-label="Refresh" hasArrow placement="top">
          <IconButton ml="2" aria-label="Home" icon={<MdRefresh />} onClick={props.onRefresh} />
        </Tooltip>
      </InputGroup>
      <Box height="80vh" overflow="hidden">
        <Box maxHeight="calc(80vh - 100px)" overflowY="auto">
          <Table variant="striped" size="sm" width="100%" layout="fixed">
            {TableHeader(columns)}
            {TableBody(data.filter(searchFilter), columns)}
            {/* {TableFooter(columns)} */}
          </Table>
        </Box>
      </Box>
    </>
  );
}
