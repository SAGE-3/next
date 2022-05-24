/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';
import { Button, ButtonGroup, Tooltip, Box } from '@chakra-ui/react';

import { AppExport, MenuBarProps } from '@sage3/shared/types';

import { ImageViewerProps, meta } from './metadata';
// import { useAction } from '@sage3/frontend/services';
import { S3AppIcon, S3SmartFunctions } from '@sage3/frontend/ui';

import { MdPhotoLibrary, MdFileDownload } from 'react-icons/md';

import { useSageSmartData } from '@sage3/frontend/smart-data/hooks';
// Utility functions from SAGE3
import { truncateWithEllipsis } from '@sage3/frontend/utils/misc';
import { downloadFile } from '@sage3/frontend/utils/misc';

const Title = (props: ImageViewerProps) => {
  // name of the first image in the set, if any
  const { data } = useSageSmartData(props.data.image[0] || {});
  const str = data?.filename || '-';

  return (
    <span>
      <span style={{ fontWeight: 'bold', marginRight: '5px' }}>Image</span> {str}
    </span>
  );
};

const Controls = (props: ImageViewerProps) => {
  // const { act } = useAction();
  // Only works for the first image
  const { data } = useSageSmartData(props.data.image[0] || {});

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Download Image'} openDelay={400}>
          <Button
            onClick={() => {
              if (data) {
                // Go for download: selectng the full image
                let url = data.src;
                const basename = data.filename.substring(0, data.filename.lastIndexOf('.'));
                const filename = basename + '.jpg';
                if (data.fullSize) {
                  url = data.fullSize;
                }
                downloadFile(url, filename);
              }
            }}
          >
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>

      {/* Add the menu for smart function */}
      <S3SmartFunctions smartFunctions={props.state.smartFunctions} />
    </>
  );
};

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: ImageViewerProps & MenuBarProps) => {
  // name of the first image in the set, if any
  const { data } = useSageSmartData(props.data.image[0] || {});
  const filename = data?.filename || '-';
  // Truncate the file
  const str = truncateWithEllipsis(filename, 17);

  // Need a box for the tooltip to work
  return (
    <Tooltip hasArrow={true} label={props.showInfo ? filename || '-' : 'Image Viewer'} openDelay={400}>
      <Box display="inline">
        {props.showIcon ? (
          <S3AppIcon icon={MdPhotoLibrary} appTitle={props.showInfo ? str : undefined} />
        ) : props.showInfo ? (
          str
        ) : undefined}
      </Box>
    </Tooltip>
  );
};

const App = React.lazy(() => import('./image-viewer'));

const ImageViewer = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default ImageViewer;
