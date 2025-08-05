/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Button,
  Table,
  Box,
  useColorModeValue,
  Flex,
  Text,
  Select,
  HStack,
  Spinner,
  Center
} from '@chakra-ui/react';

import { throttle } from 'throttle-debounce';

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
  formatColumns?: { [key: string]: (value: any) => string };
  search: string;
  actions?: {
    label: string;
    color: SAGEColors;
    onClick: (id: string) => void;
  }[];
  isLoading?: boolean;
  error?: string;
}

const CellStyle = {
  textOverflow: 'hidden',
  whiteSpace: 'no-wrap',
};

// Virtualization constants
const ROW_HEIGHT = 40; // Approximate height of each row
const BUFFER_SIZE = 10; // Increased buffer size to reduce flickering

/**
 * TableViewer component renders a table with dynamic columns and data.
 * It supports custom actions, search filtering, pagination, and virtualization for performance.
 *
 * @template T - The type of data being displayed in the table.
 * @param {TableViewerProps<T>} props - The properties for the TableViewer component.
 * @returns {JSX.Element} The rendered TableViewer component.
 */
export function TableViewer<T>(props: TableViewerProps<T>): JSX.Element {
  const data = props.data || [];
  const columns = props.columns || [];

  // Early return for loading state - must be before any hooks
  if (props.isLoading) {
    return (
      <Center height="400px">
        <Spinner size="lg" />
      </Center>
    );
  }

  // Early return for error state - must be before any hooks
  if (props.error) {
    return (
      <Center height="400px">
        <Text color="red.500">Error: {props.error}</Text>
      </Center>
    );
  }

  // Early return for empty data - must be before any hooks
  if (!data || data.length === 0) {
    return (
      <Center height="200px">
        <Text>No data available</Text>
      </Center>
    );
  }

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Virtualization state
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const headerBackgroundColor = useColorModeValue('teal.200', 'teal.600');
  const headerTextColor = useColorModeValue('black', 'white');

  // Memoized filtered data for better performance
  const filteredData = useMemo(() => {
    if (!props.search.trim()) return data;

    return data.filter((item: TableDataType<T>) => {
      // Get all the values from the selected columns and concat into one string
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
    });
  }, [data, props.search, columns]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [props.search]);

  // Reset scroll position and virtualization when data changes (tab switching)
  useEffect(() => {
    setScrollTop(0);
    setCurrentPage(1);

    // Force container height recalculation after a short delay
    setTimeout(() => {
      setContainerHeight(0); // Reset to trigger recalculation
    }, 50);
  }, [data]);

  // Handle download the data
  const handleDownloadData = (data: any) => {
    // Download the data
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Timestamp
    const date = new Date();
    a.download = `sage3_data_${date.toISOString()}.json`;
    a.click();
  };

  // Handle scroll for virtualization with throttling and null checks
  const throttledScrollHandler = useMemo(
    () => throttle(16, (e: React.UIEvent<HTMLDivElement>) => {
      if (e.currentTarget && e.currentTarget.scrollTop !== undefined) {
        setScrollTop(e.currentTarget.scrollTop);
      }
    }),
    []
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    throttledScrollHandler(e);
  }, [throttledScrollHandler]);

  // Cleanup throttle on unmount
  useEffect(() => {
    return () => {
      throttledScrollHandler.cancel();
    };
  }, [throttledScrollHandler]);

  // Handle container height update with null checks and delayed measurement
  const handleContainerRef = useCallback((el: HTMLDivElement | null) => {
    if (el && el.clientHeight !== undefined) {
      // Immediate measurement
      setContainerHeight(el.clientHeight);

      // Multiple delayed measurements to ensure proper calculation
      [50, 100, 200].forEach(delay => {
        setTimeout(() => {
          if (el && el.clientHeight !== undefined && el.clientHeight > 0) {
            setContainerHeight(el.clientHeight);
          }
        }, delay);
      });
    }
  }, []);

  // Calculate virtualization bounds with more stable calculations
  const { startIndex, endIndex } = useMemo(() => {
    // If no data, return empty bounds
    if (paginatedData.length === 0) {
      return { startIndex: 0, endIndex: 0 };
    }

    // If container height is not available yet, show first few rows
    if (!containerHeight || containerHeight <= 0) {
      const fallbackVisibleRows = Math.min(20, paginatedData.length); // Show more rows as fallback
      return {
        startIndex: 0,
        endIndex: fallbackVisibleRows
      };
    }

    // Normal virtualization calculation
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_SIZE);
    const visibleRows = Math.ceil(containerHeight / ROW_HEIGHT);
    const end = Math.min(
      paginatedData.length,
      start + visibleRows + (BUFFER_SIZE * 2)
    );

    // Ensure we have a reasonable number of visible rows
    const finalEnd = Math.max(start, end);
    const minVisibleRows = Math.min(visibleRows, paginatedData.length);

    // If we're showing too few rows, expand the range
    if (finalEnd - start < minVisibleRows && finalEnd < paginatedData.length) {
      return {
        startIndex: start,
        endIndex: Math.min(paginatedData.length, start + minVisibleRows + BUFFER_SIZE)
      };
    }

    return { startIndex: start, endIndex: finalEnd };
  }, [scrollTop, containerHeight, paginatedData.length]);

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
    // Calculate expected visible rows based on container height
    const expectedVisibleRows = containerHeight > 0 ? Math.ceil(containerHeight / ROW_HEIGHT) : 10;

    // Fallback to non-virtualized rendering if virtualization seems incorrect
    const shouldUseFallback = data.length > 0 && (
      (startIndex === 0 && endIndex === 0) || // No virtualization bounds
      (endIndex - startIndex < Math.min(expectedVisibleRows, data.length)) || // Too few visible rows
      (endIndex > data.length) || // Invalid bounds
      (data.length <= 50) // Small datasets - just show all data
    );

    const visibleData = shouldUseFallback ? data : data.slice(startIndex, endIndex);

    // Debug logging for troubleshooting
    // if (data.length > 0 && visibleData.length === 0) {
    //   console.warn('TableViewer: No visible data rendered', {
    //     dataLength: data.length,
    //     startIndex,
    //     endIndex,
    //     containerHeight,
    //     scrollTop,
    //     paginatedDataLength: paginatedData.length,
    //     shouldUseFallback,
    //     expectedVisibleRows
    //   });
    // }

    // Additional debug logging for partial rendering
    // if (data.length > 0 && visibleData.length > 0 && visibleData.length < data.length && !shouldUseFallback) {
    //   console.warn('TableViewer: Partial data rendered', {
    //     dataLength: data.length,
    //     visibleDataLength: visibleData.length,
    //     startIndex,
    //     endIndex,
    //     containerHeight,
    //     expectedVisibleRows
    //   });
    // }

    return (
      <Tbody>
        {/* Top spacer row for virtualization - only if not using fallback */}
        {!shouldUseFallback && startIndex > 0 && (
          <Tr>
            <Td colSpan={columns.length + (props.actions ? 1 : 0)} height={`${startIndex * ROW_HEIGHT}px`} p={0} border="none"></Td>
          </Tr>
        )}

        {visibleData.map((item: any, i) => {
          const actualIndex = startIndex + i;
          return (
            <Tr key={`${item._id}-${actualIndex}`} height={`${ROW_HEIGHT}px`}>
              {columns.map((column, j) => {
                // Check if column is in the root item
                if (column in item) {
                  return (
                    <Td key={`${item._id}-${String(column)}-${j}`} style={CellStyle}>
                      {item[column]}
                    </Td>
                  );
                } else {
                  // Check if column is in the data object
                  if (column in item.data) {
                    let value = item.data[column];
                    // Check if value is in the formatColumns object
                    if (props.formatColumns && column in props.formatColumns) {
                      value = props.formatColumns[column as string](value);
                    }
                    // Check if value is an array
                    if (Array.isArray(value)) value = value.join(', ');
                    return (
                      <Td key={`${item._id}-${String(column)}-${j}`} style={CellStyle}>
                        {value}
                      </Td>
                    );
                  }
                }
                return <Td key={`${item._id}-${String(column)}-${j}`} style={CellStyle}></Td>;
              })}
              {props.actions && (
                <Td textOverflow="hidden" whiteSpace="hidden">
                  <Button colorScheme="teal" mr="1" mb="1" size="xs" onClick={() => handleDownloadData(item)}>
                    Download
                  </Button>
                  {props.actions.map((action, j) => (
                    <Button key={`${item._id}-action-${j}`} colorScheme={action.color} size="xs" mb="1" mr="1" onClick={() => action.onClick(item._id)}>
                      {action.label}
                    </Button>
                  ))}
                </Td>
              )}
            </Tr>
          );
        })}

        {/* Bottom spacer row for virtualization - only if not using fallback */}
        {!shouldUseFallback && endIndex < data.length && (
          <Tr>
            <Td colSpan={columns.length + (props.actions ? 1 : 0)} height={`${(data.length - endIndex) * ROW_HEIGHT}px`} p={0} border="none"></Td>
          </Tr>
        )}
      </Tbody>
    );
  };

  // Pagination controls
  const PaginationControls = () => (
    <Flex justify="space-between" align="center" p={4} borderTop="1px" borderColor="gray.200">
      <HStack spacing={4}>
        <Text fontSize="sm">
          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} results
        </Text>
        <Select
          size="sm"
          width="100px"
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setCurrentPage(1);
          }}
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </Select>
      </HStack>

      <HStack spacing={2}>
        <Button
          size="sm"
          onClick={() => setCurrentPage(1)}
          isDisabled={currentPage === 1}
        >
          First
        </Button>
        <Button
          size="sm"
          onClick={() => setCurrentPage(currentPage - 1)}
          isDisabled={currentPage === 1}
        >
          Previous
        </Button>
        <Text fontSize="sm">
          Page {currentPage} of {totalPages}
        </Text>
        <Button
          size="sm"
          onClick={() => setCurrentPage(currentPage + 1)}
          isDisabled={currentPage === totalPages}
        >
          Next
        </Button>
        <Button
          size="sm"
          onClick={() => setCurrentPage(totalPages)}
          isDisabled={currentPage === totalPages}
        >
          Last
        </Button>
      </HStack>
    </Flex>
  );

  // Chakra Table
  return (
    <Box height="calc(100vh - 16px - 32px - 30px - 42px - 72px - 64px)" display="flex" flexDirection="column">
      {/* Table with virtualization */}
      <Box
        flex="1"
        overflowY="auto"
        onScroll={handleScroll}
        ref={handleContainerRef}
        style={{
          willChange: 'scroll-position',
          transform: 'translateZ(0)', // Hardware acceleration
        }}
      >
        <Table variant="striped" size="sm" layout="fixed">
          {TableHeader(columns)}
          {TableBody(paginatedData, columns)}
        </Table>
      </Box>

      {/* Pagination controls */}
      {filteredData.length > 25 && <PaginationControls />}
    </Box>
  );
}
