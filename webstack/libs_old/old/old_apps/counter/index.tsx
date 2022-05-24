/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';

import { AppExport, MenuBarProps } from '@sage3/shared/types';

import { CounterProps, meta } from './metadata';

import { S3AppIcon } from '@sage3/frontend/ui';
import { MdNoteAdd } from 'react-icons/md';
import { Box, Tooltip } from '@chakra-ui/react';

const Title = (props: CounterProps) => <>CounterApp</>;

const Controls = null;

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: CounterProps & MenuBarProps) => {
  const str = props.__meta__.name;

  return (
    <Tooltip hasArrow={true} label={props.showInfo ? str : 'Counter App'} openDelay={400}>
      <Box display="inline">
        {props.showIcon ? <S3AppIcon icon={MdNoteAdd} appTitle={props.showInfo ? str : undefined} /> : props.showInfo ? str : undefined}
      </Box>
    </Tooltip>
  );
};

const App = React.lazy(() => import('./counter'));

const Counter = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default Counter;
