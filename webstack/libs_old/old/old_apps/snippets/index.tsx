/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: snippets
 * created by: Luc Renambot
 */

// Import the React library
import React from 'react';

// State and app management functions
import { AppExport, MenuBarProps } from '@sage3/shared/types';

// Import the props definition for snippets application
import { snippetsProps, meta } from './metadata';
import { S3AppIcon } from '@sage3/frontend/ui';
import { MdMemory } from 'react-icons/md';

/**
 * Defines the titlebar above the application window
 * @param props
 */
const Title = (props: snippetsProps) => {
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
const App = React.lazy(() => import('./snippets'));

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: snippetsProps & MenuBarProps) => {
  const name = props.info.createdBy.name;
  return props.showIcon ? (
    <S3AppIcon icon={MdMemory} appTitle={props.showInfo ? 'By ' + name : undefined} />
  ) : props.showInfo ? (
    'By ' + name
  ) : undefined;
};

/**
 * Package the three application elements to export
 */
const snippets = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default snippets;
