/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Box, useColorMode, useColorModeValue } from '@chakra-ui/react';
import { useHexColor } from '@sage3/frontend';

type SearchListProps = {
  searchInput: string;
  searchDiv: HTMLDivElement | null;
};

export function SearchList(props: SearchListProps) {
  if (!props.searchDiv) return null;

  // Get input width
  const inputWidth = props.searchDiv.getBoundingClientRect().width;
  // temp data random list
  const list = ['test1', 'test2', 'test3', 'test4', 'test5', 'test6'];

  const borderColor = useHexColor('teal');
  const backgroundColor = useColorModeValue('gray.50', 'gray.700');
  return (
    <Box
      height="40vh"
      position="absolute"
      backgroundColor={backgroundColor}
      padding="20px"
      borderRadius="md"
      width={inputWidth + 'px'}
      zIndex="100"
      marginTop="4px"
      border={`solid 2px ${borderColor}`}
    >
      {list.map((item) => {
        return <Box>{item}</Box>;
      })}
    </Box>
  );
}
