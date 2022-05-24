/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: codeCell
 * created by: Luc Renambot
 */

// Import the React library
import React from 'react';

// State and app management functions
import { AppExport, MenuBarProps } from '@sage3/shared/types';

// Import the props definition for codeCell application
import { codeCellProps, meta } from './metadata';
import { S3AppIcon } from '@sage3/frontend/ui';
import { MdMemory } from 'react-icons/md';
import { Box, Tooltip } from '@chakra-ui/react';

/**
 * Defines the titlebar above the application window
 * @param props
 */
const Title = (props: codeCellProps) => {
  // Change the title of the application
  return (
    <>
      <p style={{ fontWeight: 'bold', margin: 0 }}>CodeCell</p> &nbsp; &nbsp;
      <p style={{ margin: 0 }}>by {props.info.createdBy.name}</p>
    </>
  );
};

/**
 * Define the items on the titlebar (buttons, ...) on the right side
 * @param props
 */
const Controls = null;

/**
 * Import on-demand the code for your application
 */
const App = React.lazy(() => import('./codeCell'));

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: codeCellProps & MenuBarProps) => {
  const name = props.info.createdBy.name;

  return (
    <Tooltip hasArrow={true} label={props.showInfo ? 'By ' + name : 'Code Cell'} openDelay={400}>
      <Box display="inline">
        {props.showIcon ? (
          <S3AppIcon icon={MdMemory} appTitle={props.showInfo ? 'By ' + name : undefined} />
        ) : props.showInfo ? (
          'By ' + name
        ) : undefined}
      </Box>
    </Tooltip>
  );
};

/**
 * Package the three application elements to export
 */
const codeCell = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default codeCell;
