/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: vegaLiteViewer
 * created by: roderick
 */

// Import the React library
import React from 'react';
import { Tooltip, Box } from '@chakra-ui/react';

// State and app management functions
import { AppExport, MenuBarProps } from '@sage3/shared/types';

// Import the props definition for vegaLiteViewer application
import { vegaLiteViewerProps, meta } from './metadata';

// Import the CSS definitions for vegaLiteViewer application
import './styling.css';
import { S3AppIcon } from '@sage3/frontend/ui';
import { MdOutlineQueryStats } from 'react-icons/md';
import { truncateWithEllipsis } from '@sage3/frontend/utils/misc';

/**
 * Defines the titlebar above the application window
 * @param props
 */
const Title = (props: vegaLiteViewerProps) => {
  // Get values from the props
  // const ww = Math.floor(props.position.width);
  // const hh = Math.floor(props.position.height);
  // const name = props.__meta__.name;

  // Change the title of the application
  return <div>{/*{name}: {ww} x {hh}*/}</div>;
};

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: vegaLiteViewerProps & MenuBarProps) => {
  const str = truncateWithEllipsis(props.data.file.meta.filename, 17);

  return (
    <Tooltip hasArrow={true} label={props.showInfo ? props.data.file.meta.filename : 'Vega Lite Viewer'} openDelay={400}>
      <Box display="inline">
        {props.showIcon ? (
          <S3AppIcon icon={MdOutlineQueryStats} appTitle={props.showInfo ? str : undefined} />
        ) : props.showInfo ? (
          str
        ) : undefined}
      </Box>
    </Tooltip>
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
const App = React.lazy(() => import('./vegaLiteViewer'));

/**
 * Package the three application elements to export
 */
const vegaLiteViewer = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default vegaLiteViewer;
