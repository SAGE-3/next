/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: plotlyViewer
 * created by: Roderick
 */

// Import the React library

import React from 'react';
import { Tooltip, Box } from '@chakra-ui/react';

// State and app management functions
import { AppExport, MenuBarProps } from '@sage3/shared/types';

// Import the props definition for plotlyViewer application
import { plotlyViewerProps, meta } from './metadata';

// Import the CSS definitions for plotlyViewer application
import './styling.css';
import { S3AppIcon } from '@sage3/frontend/ui';
import { MdOutlineQueryStats } from 'react-icons/md';
import { truncateWithEllipsis } from '@sage3/frontend/utils/misc';

/**
 * Defines the titlebar above the application window
 * @param props
 */
const Title = (props: plotlyViewerProps) => {
  // Get values from the props
  const ww = Math.floor(props.position.width);
  const hh = Math.floor(props.position.height);
  const name = props.__meta__.name;

  // Change the title of the application
  return (
    <>
      {name}: {ww} x {hh}
    </>
  );
};

/**
 * Define the items on the titlebar (buttons, ...) on the right side
 * @param props
 */
const Controls = null;

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: plotlyViewerProps & MenuBarProps) => {
  const str = truncateWithEllipsis(props.data.file.meta.filename, 17);

  return (
    <Tooltip hasArrow={true} label={props.__meta__.description} openDelay={400}>
      <Box display="inline">
        {props.showIcon ? (
          <S3AppIcon icon={MdOutlineQueryStats} appTitle={props.showInfo ? 'By ' + str : undefined} />
        ) : props.showInfo ? (
          str
        ) : undefined}
      </Box>
    </Tooltip>
  );
};

/**
 * Import on-demand the code for your application
 */
const App = React.lazy(() => import('./plotlyViewer'));

/**
 * Package the three application elements to export
 */
const plotlyViewer = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default plotlyViewer;
