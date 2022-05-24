/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: d3Delaunay
 * created by: Luc Renambot
 */

// Import the React library
import React from 'react';

// State and app management functions
import { AppExport, MenuBarProps } from '@sage3/shared/types';

// Import the props definition for d3Delaunay application
import { d3DelaunayProps, meta } from './metadata';

// Import the CSS definitions for d3Delaunay application
import './styling.css';
import { S3AppIcon } from '@sage3/frontend/ui';
import { MdCrop32 } from 'react-icons/md';
import { Box, Tooltip } from '@chakra-ui/react';

/**
 * Defines the titlebar above the application window
 * @param props
 */
const Title = (props: d3DelaunayProps) => {
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
 * Import on-demand the code for your application
 */
const App = React.lazy(() => import('./d3Delaunay'));

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: d3DelaunayProps & MenuBarProps) => {
  const name = props.info.createdBy.name;

  return (
    <Tooltip hasArrow={true} label={props.showInfo ? 'By ' + name : 'D3-Delaunay'} openDelay={400}>
      <Box display="inline">
        {props.showIcon ? (
          <S3AppIcon icon={MdCrop32} appTitle={props.showInfo ? 'By ' + name : undefined} />
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
const d3Delaunay = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default d3Delaunay;
