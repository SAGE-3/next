/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Chakra Imports
import { ButtonProps, Icon } from '@chakra-ui/react';
import { IconType } from 'react-icons/lib';

export interface S3IconProps extends ButtonProps {
  icon: IconType;
  appTitle?: string;
  size?: string;
  color?: string;
}

/**
 * Icons for apps in the opened application list
 * @param S3IconProps
 * @returns JSX.Element
 */
export function S3AppIcon(props: S3IconProps): JSX.Element {
  return (
    <>
      <Icon verticalAlign='middle' color={props.color ? props.color : 'none'} boxSize={props.size ? props.size : '24px'} as={props.icon} />{' '}
      {props.appTitle ? props.appTitle : null}
    </>
  );
}
