/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { Box } from '@chakra-ui/react';
import React from 'react';

type BlockInteractionProps = {
  innerBorderRadius: number;
};

/**
 * A BlockInteraction is a box that is displayed over the top of the window when
 * the window is in a state where it not be interacted with.
 */
export function BlockInteraction(props: BlockInteractionProps) {
  const innerBorderRadius = props.innerBorderRadius;
  return (
    <Box
      position="absolute"
      left="0px"
      top="0px"
      width="100%"
      height="100%"
      pointerEvents={'none'}
      userSelect={'none'}
      borderRadius={innerBorderRadius}
      zIndex={999999999} // Really big number to just force it to be on top
    ></Box>
  );
}
