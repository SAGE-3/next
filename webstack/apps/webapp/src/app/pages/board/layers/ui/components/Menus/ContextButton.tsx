/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ReactNode, JSXElementConstructor, ReactElement } from 'react';
import {
  IconButton,
  Tooltip,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  useDisclosure,
  PopoverCloseButton,
} from '@chakra-ui/react';

import { SAGEColors } from '@sage3/shared';
import { useHexColor } from '@sage3/frontend';

interface ContextButtonProps {
  children?: ReactNode;
  bgColor: SAGEColors;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  offset?: [number, number];
  icon: ReactElement<any, string | JSXElementConstructor<any>> | undefined;
  tooltip: string;
  title: string;
  stayActive?: boolean;
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
  iconSize?: 'xs' | 'sm' | 'md' | 'lg';
  colorActiveAlways?: boolean;
}

export function ContextButton(props: ContextButtonProps) {
  const { onOpen, onClose, isOpen } = useDisclosure();
  const bgColor = useHexColor(props.bgColor + '.200');

  const handleClick = () => {
    isOpen ? onClose() : onOpen();
  };

  return (
    <Popover
      offset={props.offset ? props.offset : undefined}
      onOpen={props.stayActive ? () => {} : onOpen}
      onClose={props.stayActive ? () => {} : onClose}
      isOpen={isOpen}
      placement={props.placement ? props.placement : 'top'}
    >
      <Tooltip
        label={props.tooltip}
        placement={props.tooltipPlacement ? props.tooltipPlacement : 'top'}
        hasArrow={true}
        openDelay={400}
        shouldWrapChildren={true}
      >
        <PopoverTrigger>
          {/* If stayActive need a different button...sadly very simliar code */}
          {props.stayActive ? (
            <IconButton
              colorScheme={isOpen || props.colorActiveAlways ? props.bgColor : 'gray'}
              size={props.size ? props.size : 'sm'}
              icon={props.icon}
              fontSize={props.iconSize ? props.iconSize : 'lg'}
              aria-label={`Open ${props.title} Menu`}
              sx={{
                _dark: {
                  bg: isOpen || props.colorActiveAlways ? bgColor : 'gray.600', // 'inherit' didnt seem to work
                },
              }}
              onClick={handleClick}
            ></IconButton>
          ) : (
            <IconButton
              colorScheme={isOpen || props.colorActiveAlways ? props.bgColor : 'gray'}
              size={props.size ? props.size : 'sm'}
              icon={props.icon}
              fontSize={props.iconSize ? props.iconSize : 'lg'}
              aria-label={`Open ${props.title} Menu`}
              sx={{
                _dark: {
                  bg: isOpen || props.colorActiveAlways ? bgColor : 'gray.600', // 'inherit' didnt seem to work
                },
              }}
            ></IconButton>
          )}
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent width="100%">
        {props.stayActive && <PopoverCloseButton onClick={handleClick} />}
        <PopoverHeader>{props.title}</PopoverHeader>
        <PopoverBody>{props.children}</PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
