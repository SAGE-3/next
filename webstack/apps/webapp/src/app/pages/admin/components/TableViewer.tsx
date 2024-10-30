/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Thead, Tr, Th, Tbody, Td, Button, Table, Box, useColorModeValue } from '@chakra-ui/react';
import { SAGEColors, fuzzySearch } from '@sage3/shared';
import { SBDoc } from '@sage3/shared/types';

/**
 * Represents a type that extends the SBDoc type with an additional `data` property.
 *
 * @template T - The type of the `data` property.
 */
type TableDataType<T> = SBDoc & { data: T };


/**
 * Props for the TableViewer component.
 *
 * @template T - The type of the data items.
 *
 * @property {string} heading - The heading of the table.
 * @property {TableDataType<T>[]} data - The data to be displayed in the table.
 * @property {(keyof T | keyof SBDoc)[]} columns - The columns to be displayed in the table.
 * @property {() => void} onRefresh - Callback function to refresh the table data.
 * @property {string} search - The search term to filter the table data.
 * @property {Array<{ label: string; color: SAGEColors; onClick: (id: string) => void }>} [actions] - Optional actions to be displayed in the table.
 */
interface TableViewerProps<T> {
  heading: string;
  data: TableDataType<T>[];
  columns: (keyof T | keyof SBDoc)[];
  onRefresh: () => void;
  search: string;
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

/**
 * TableViewer component renders a table with dynamic columns and data.
 * It supports custom actions and search filtering.
 *
 * @template T - The type of data being displayed in the table.
 * @param {TableViewerProps<T>} props - The properties for the TableViewer component.
 * @returns {JSX.Element} The rendered TableViewer component.
 */
export function TableViewer<T>(props: TableViewerProps<T>): JSX.Element {
  const data = props.data;
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
      <Tbody maxHeight="500px" overflowY="scroll">
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
    return fuzzySearch(searchStr, props.search);
  };

  // Chakra Table
  return (
    // This height is really ugly but I couldnt figure out how to make the table reactively size with a scrollbar
    // The height is calculated by subtracting the height of the header, footer, tabs, search bar, and padding
    <Box height="calc(100vh - 16px - 32px - 30px -  42px - 72px - 24px) " overflowY="auto">
      <Table variant="striped" size="sm" layout="fixed">
        {TableHeader(columns)}
        {TableBody(data.filter(searchFilter), columns)}
      </Table>
    </Box>
  );
}
