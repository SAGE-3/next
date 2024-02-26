/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Box, Text, useColorModeValue } from '@chakra-ui/react';

import { useUserSettings } from '@sage3/frontend';

type WindowTitleProps = {
  size: { width: number; height: number };
  scale: number;
  title: string;
  selected: boolean;
};

/**
 * A WindowTitle is a box that is displayed over the top of the window when
 * AppTitles are enabled.
 */
export function WindowTitle(props: WindowTitleProps) {
  const size = props.size;
  const scale = props.scale;
  const title = props.title;
  const selected = props.selected;
  const titleBackground = useColorModeValue('#00000000', '#ffffff26');
  const titleBrightness = useColorModeValue('85%', '65%');
  const titleColor = useColorModeValue('white', 'white');

  const { settings } = useUserSettings();
  const appTitles = settings.showAppTitles;

  if (!appTitles && !selected) return null;

  return (
    <Box
      position="absolute"
      top="0px"
      left="0px"
      width={size.width}
      transform={`translate(-${2 / scale}px, calc(-100% - ${4 / scale}px))`}
      display="flex"
      justifyContent="left"
      alignItems="center"
      pointerEvents="none"
    >
      <Text
        color={titleColor}
        fontSize={16 / scale}
        whiteSpace="nowrap"
        textOverflow="ellipsis"
        overflow="hidden"
        background={titleBackground}
        backdropFilter={`blur(${Math.max(5, 5 / scale)}px) brightness(${titleBrightness})`}
        borderRadius={6}
        px={2}
        userSelect={'none'}
      >
        {title}
      </Text>
    </Box>
  );
}
