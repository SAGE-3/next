/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { JSXElementConstructor, ReactElement } from 'react';

// Chakra Imports
import { IconButton, Tooltip, ButtonProps, Placement } from '@chakra-ui/react';
import { MinimapButtonColor, TextColor } from './S3Colors';

export interface SButtonProps extends ButtonProps {
  tooltipLabel: string;
  'aria-label': string;
  icon: ReactElement<any, string | JSXElementConstructor<any>>;
  tooltipPlacement: Placement;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
}

/**
 * Sage Mini-map buttons for zoom in, zoom out, fit apps, fit board
 * Used to customize look of buttons on mini-map by changing
 * background color & text color. Uses tooltip on all buttons
 * @param SButtonProps
 * @returns JSX.Element
 */
export function S3Button(props: SButtonProps): JSX.Element {
  // remove the S3Button specific props values, and pass the rest to IconButton
  const { tooltipPlacement, tooltipLabel, ...childProps } = props;

  return (
    <Tooltip placement={tooltipPlacement} hasArrow={true} label={tooltipLabel} openDelay={400}>
      <IconButton
        {...childProps}
        icon={props.icon}
        aria-label={props['aria-label']}
        background={MinimapButtonColor()}
        textColor={TextColor()}
        onClick={props.onClick}>
        {props.children}
      </IconButton>
    </Tooltip>
  );
}
