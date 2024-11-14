/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { IconButton, Tooltip, Popover, PopoverBody, PopoverContent, PopoverHeader, PopoverTrigger } from '@chakra-ui/react';

import { JSXElementConstructor, ReactElement, useState } from 'react';

import { ReactNode } from 'react';
import { SAGEColors } from '@sage3/shared';
import { useHexColor } from '@sage3/frontend';

interface ToolbarButtonProps {
  children?: ReactNode;
  color: SAGEColors;
  offset?: [number, number];
  icon: ReactElement<any, string | JSXElementConstructor<any>> | undefined;
  tooltip: string;
  title: string;
  onClick?: () => void;
  isOpen?: boolean;
}

export function ToolbarButton(props: ToolbarButtonProps) {
  const [showMenu, setShowMenu] = useState(props.isOpen ? props.isOpen : false);
  const handleShowMenu = () => {
    props.children && setShowMenu(!showMenu);
    props.onClick && props.onClick();
  };

  const bgColor = useHexColor(props.color + '.200');

  return (
    <Popover isOpen={showMenu} offset={props.offset ? props.offset : undefined}>
      <Tooltip label={props.tooltip} placement="top" hasArrow={true} openDelay={400} shouldWrapChildren={true}>
        <PopoverTrigger>
          <IconButton
            colorScheme={showMenu ? props.color : 'gray'}
            size="sm"
            icon={props.icon}
            fontSize="lg"
            aria-label={`Open ${props.title} Menu`}
            sx={{
              _dark: {
                bg: showMenu ? bgColor : 'gray.600', // 'inherit' didnt seem to work
              },
            }}
            onClick={handleShowMenu}
          ></IconButton>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent width="100%">
        <PopoverHeader>{props.title}</PopoverHeader>
        <PopoverBody>{props.children}</PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
