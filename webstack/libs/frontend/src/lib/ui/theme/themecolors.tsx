/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useColorModeValue } from '@chakra-ui/react';

// Light mode on the left, dark mode on the right

/**
 * General Colors
 */
export function TextColor(): string {
  return useColorModeValue('white', 'black');
}

export function LinkColor(): string {
  return useColorModeValue('#207D72', '#81e6d9');
}

export function LinkHoverColor(): string {
  return useColorModeValue('#3F4948', '#c8f1ec');
}

export function BgColor(): string {
  return useColorModeValue('#ffffff', '#171717');
}

export function BorderColor(): string {
  return useColorModeValue('#606060 2px solid', 'white 2px solid');
}

export function DividerColor(): string {
  return useColorModeValue('gray', 'white');
}

export function TextInputColor(): string {
  return useColorModeValue('white', '#292929');
}

/**
 * Board list specific colors
 */

export function CardColor(): string {
  return useColorModeValue('#ededed', '#323232');
}

/**
 * Board page specific colors
 */
export function BoardBgColor(): string {
  // return useColorModeValue('white', 'black');
  return useColorModeValue('#f0f0f0', '#222');
}

export function LocalMenuColor(): string {
  return useColorModeValue('rgb(241, 241, 241)', '#0000008f');
}

export function BoardColor(): string {
  return useColorModeValue('#f0f0f0', '#222');
}

export function MinimapButtonColor(): string {
  return useColorModeValue('blackAlpha.500', 'whiteAlpha.500');
}

export function BoardGridColor(): string {
  return useColorModeValue(
    `
    linear-gradient(to right, #dadada 3px, transparent 3px),
    linear-gradient(to bottom, #dadada 3px, transparent 3px)`,
    `
    linear-gradient(to right, #333 3px, transparent 3px),
    linear-gradient(to bottom, #333 3px, transparent 3px)`
  );
}

export function BoardBgSize(): string {
  return useColorModeValue('128px 128px', '128px 128px');
}

/**
 * Window App specific colors
 */
export function AppControlBgColor(): string {
  return useColorModeValue('whiteAlpha.800', 'blackAlpha.800');
}

/**
 *
 * Menu Colors
 */
export function MenuBgColor(): string {
  return useColorModeValue('white', 'rgb(45, 55, 72)');
}
