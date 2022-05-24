/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';
import { Tooltip, Box } from '@chakra-ui/react';

import { AppExport, MenuBarProps } from '@sage3/shared/types';

import { ThreejsViewerProps, meta } from './metadata';
import { S3AppIcon } from '@sage3/frontend/ui';
import { MdOutlineViewInAr } from 'react-icons/md';
import { truncateWithEllipsis } from '@sage3/frontend/utils/misc';

const Title = (props: ThreejsViewerProps) => {
  return <p>{props.data.file.meta.filename}</p>;
};

const Controls = null;

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: ThreejsViewerProps & MenuBarProps) => {
  const str = truncateWithEllipsis(props.data.file.meta.filename, 17);

  return (
    <Tooltip hasArrow={true} label={props.showInfo ? props.data.file.meta.filename : 'ThreeJS Viewer'} openDelay={400}>
      <Box display="inline">
        {props.showIcon ? (
          <S3AppIcon icon={MdOutlineViewInAr} appTitle={props.showInfo ? str : undefined} />
        ) : props.showInfo ? (
          str
        ) : undefined}
      </Box>
    </Tooltip>
  );
};

const App = React.lazy(() => import('./threejs-viewer'));

const ThreejsViewer = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default ThreejsViewer;
