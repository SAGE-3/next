/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { Box, Spinner } from '@chakra-ui/react';
import React from 'react';

type ProcessingBoxProps = {
  size: { width: number; height: number };
  selected: boolean;
  colors: {
    backgroundColor: string;
    selectColor: string;
    notSelectColor: string;
  };
};

/**
 * A ProcessingBox is a box that is displayed over the top of the window when
 * the window is processing something.  It is used to block interaction with
 * the window while it is processing.
 */
export function ProcessingBox(props: ProcessingBoxProps) {
  const selected = props.selected;
  const size = props.size;
  const colors = props.colors;
  return (
    <Box
      position="absolute"
      left="0px"
      top="0px"
      width={size.width}
      height={size.height}
      pointerEvents={'none'}
      userSelect={'none'}
      zIndex={999999999}
      display="flex"
      justifyContent="center"
      alignItems="center"
      backgroundColor={colors.backgroundColor}
    >
      <Box transform={`scale(${4 * Math.min(size.width / 300, size.height / 300)})`}>
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color={selected ? colors.selectColor : colors.notSelectColor}
          size="xl"
        />
      </Box>
    </Box>
  );
}
