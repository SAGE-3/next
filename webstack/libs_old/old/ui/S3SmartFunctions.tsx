/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';

// Chakra Imports
import { MenuItem, Tooltip, Button, ButtonGroup, Menu, MenuButton, MenuList } from '@chakra-ui/react';
import { truncateWithEllipsis } from '@sage3/frontend/utils/misc';
import { useSageStateReducer } from '@sage3/frontend/smart-data/hooks';
import { DataReference, smartFunctionsReducer } from '@sage3/shared/types';

// Icons
import { MdLightbulbOutline } from 'react-icons/md';
import { FaEllipsisH } from 'react-icons/fa';

export interface S3SmartFunctionsProps {
  smartFunctions: DataReference<"reducer">;
}

/**
 * S3SmartFunctions: create a button menu with a list of actions
 * @param props
 * @returns JSX.Element[]
 */
export function S3SmartFunctions(props: S3SmartFunctionsProps): JSX.Element | null {
  const { data, dispatch } = useSageStateReducer(props.smartFunctions, smartFunctionsReducer);
  const actions = data.actions;

  // Get the list of actions, and create a button for each
  // Dispatch the action on click
  const buttons = Object.keys(actions).map((key) => {
    const func = actions[key];
    const label = truncateWithEllipsis(func.description, 20);
    return (
      <MenuItem key={'button' + func.uuid}
        onClick={() => dispatch({ type: 'run_action', action_uuid: func.uuid })}
        icon={<MdLightbulbOutline />}
      >
        {label}
      </MenuItem>
    );
  });
  if (Object.keys(actions).length > 0) {
    return (<ButtonGroup isAttached size="xs" variant="ghost">
      <Menu placement="bottom">
        <Tooltip hasArrow={true} label={"Smart Functions"} openDelay={300}>
          <MenuButton ml={"0.5rem"} mr={0} as={Button} colorScheme="orange" aria-label="layout">
            <FaEllipsisH />
          </MenuButton>
        </Tooltip>
        <MenuList minWidth="200px">
          {buttons}
        </MenuList>
      </Menu>
    </ButtonGroup>)
  } else {
    return null;
  }
}

// Some issues with tooltips
// <Tooltip key={'tooltip' + func.uuid} placement="bottom" hasArrow={true} openDelay={400}
// label = { func.description } >
// </Tooltip>
