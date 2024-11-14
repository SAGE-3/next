/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { CSSProperties } from 'react';
import { Button, useColorModeValue, Box } from '@chakra-ui/react';

// Font sizes
const bigFont = 18;
const smallFont = 14;

// Add a title to the chakra button props
export interface MenuButtonProps {
  title: string;
  textColor?: string;
  draggable?: boolean;
  onClick?: () => void;
  style?: CSSProperties | undefined;
}

// Button with a title and using the font size from parent panel
export function MenuButton(props: MenuButtonProps) {
  const textColor = useColorModeValue('gray.800', 'gray.100');

  const onDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    // storing the app name in the dataTransfer object
    e.dataTransfer.setData('app', props.title);
  };

  return (
    <Box w="100%">
      <Button
        {...props}
        title={props.title}
        textColor={props.textColor}
        draggable={props.draggable}
        w="100%"
        borderRadius="md"
        h="auto"
        p={1}
        pl={2}
        fontSize={smallFont}
        color={props.textColor ? props.textColor : textColor}
        justifyContent="flex-start"
        // Drag and drop the button to create an app
        onDragStart={onDragStart}
      >
        {props.title}
      </Button>
    </Box>
  );
}
