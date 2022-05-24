/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';
import { Button, ButtonGroup, Tooltip, Box } from '@chakra-ui/react';
import { MdBook, MdFileDownload } from 'react-icons/md';

import { NotebookViewerProps, meta } from './metadata';
import { AppExport, MenuBarProps } from '@sage3/shared/types';
import { useSageSmartData } from '@sage3/frontend/smart-data/hooks';
import { S3AppIcon } from '@sage3/frontend/ui';
import { useSageAssetUrl } from '@sage3/frontend/smart-data/hooks';
// Utility functions from SAGE3
import { downloadFile, truncateWithEllipsis } from '@sage3/frontend/utils/misc';

const Title = (props: NotebookViewerProps) => {
  const {
    data: { cells },
  } = useSageSmartData(props.data.file);

  return (
    <>
      <p style={{ fontWeight: 'bold', margin: 0 }}>Notebook</p> &nbsp; &nbsp;
      <p style={{ margin: 0 }}>
        {props.data.file.meta.filename} - {cells.length} cells
      </p>
    </>
  );
};

const Controls = (props: NotebookViewerProps) => {
  // Get URL of asset
  const {
    data: { url },
  } = useSageAssetUrl(props.data.file);

  return (
    <ButtonGroup isAttached size="xs" colorScheme="teal">
      <Tooltip placement="bottom" hasArrow={true} label={'Download Notebook'} openDelay={400}>
        <Button onClick={() => downloadFile(url, props.data.file.meta.filename)}>
          <MdFileDownload />
        </Button>
      </Tooltip>
    </ButtonGroup>
  );
};

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: NotebookViewerProps & MenuBarProps) => {
  const str = truncateWithEllipsis(props.data.file.meta.filename, 17);

  return (
    <Tooltip hasArrow={true} label={props.showInfo ? props.data.file.meta.filename : 'Notebook Viewer'} openDelay={400}>
      <Box display="inline">
        {props.showIcon ? <S3AppIcon icon={MdBook} appTitle={props.showInfo ? str : undefined} /> : props.showInfo ? str : undefined}
      </Box>
    </Tooltip>
  );
};

const App = React.lazy(() => import('./notebook-viewer'));

const NotebookViewer = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default NotebookViewer;
