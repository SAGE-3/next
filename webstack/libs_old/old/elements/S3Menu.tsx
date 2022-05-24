/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Chakra imports
import { Menu, MenuProps, MenuList, MenuButton, Button, Tooltip } from '@chakra-ui/react';

import { MdAdd } from 'react-icons/md';

export interface S3MenuProps extends MenuProps {
  buttonLabel: string;
  tooltip: string;
  showIcon: boolean;
  onClick?: () => void;
}

/**
 * Menu Button for Applications, Assets, and Opened Applications buttons
 * Used to customize look of buttons on Menu bar component
 * @param props
 * @returns JSX.Element
 */
export function S3Menu(props: S3MenuProps): JSX.Element {
  return (
    <Menu flip={false} placement="top-start">
      <Tooltip hasArrow={true} label={props.tooltip} openDelay={400}>
        <MenuButton ml={1} as={Button} colorScheme="teal" size="sm" onClick={props.onClick}>
          {props.showIcon && <MdAdd style={{ fontSize: '1.5rem', display: 'inline-flex', verticalAlign: 'middle' }} />} {props.buttonLabel}
        </MenuButton>
      </Tooltip>
      {props.onClick ? null : <MenuList fontSize="md">{props.children}</MenuList>}
    </Menu>
  );
}
