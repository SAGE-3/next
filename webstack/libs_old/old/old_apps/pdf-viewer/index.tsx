/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';
import axios from 'axios';
import { Button, ButtonGroup, Tooltip, Box } from '@chakra-ui/react';
import { Menu, MenuItem, MenuList, MenuButton } from '@chakra-ui/react';

import { AppExport, MenuBarProps } from '@sage3/shared/types';
// Utility functions from SAGE3
import { downloadFile, truncateWithEllipsis } from '@sage3/frontend/utils/misc';
import { useAction } from '@sage3/frontend/services';

import { PdfViewerProps, meta } from './metadata';

import { useSageStateReducer, useSageSmartData, useSageAssetUrl } from '@sage3/frontend/smart-data/hooks';
import { pdfReducer } from './state-reducers';

// import { useAction } from '@sage3/frontend/services';
import { S3AppIcon } from '@sage3/frontend/ui';

import {
  MdArticle,
  MdFileDownload,
  MdOutlineFastRewind,
  MdOutlineFastForward,
  MdAdd,
  MdRemove,
  MdMenu,
  MdSkipPrevious,
  MdSkipNext,
  MdNavigateNext,
  MdNavigateBefore,
} from 'react-icons/md';

/**
 * Title for the PDF Viewer
 * @param props PdfViewerProps
 */
const Title = (props: PdfViewerProps) => {
  const filename = truncateWithEllipsis(props.data.file.meta.filename, 40);
  const pdfState = useSageStateReducer(props.state.pdfState, pdfReducer);

  const { data: filedata } = useSageSmartData(props.data.file);
  const filepages = filedata.pages.length;

  if (filepages > 1) {
    return (
      <span>
        {' '}
        <span style={{ fontWeight: 'bold', margin: 0, marginRight: '5px' }}>PDF</span> {filename} &nbsp; Page{' '}
        {pdfState.data.currentPage + 1} of {filepages} &nbsp;{' '}
      </span>
    );
  } else {
    return (
      <span>
        {' '}
        <span style={{ fontWeight: 'bold', margin: 0, marginRight: '5px' }}>PDF</span> {filename} &nbsp;{' '}
      </span>
    );
  }
};

/**
 * UI for the PDF viewer
 * @param props PdfViewerProps
 */
const Controls = (props: PdfViewerProps) => {
  const {
    data: { numPages, currentPage },
    dispatch,
  } = useSageStateReducer(props.state.pdfState, pdfReducer);

  const {
    data: { pages },
  } = useSageSmartData(props.data.file);

  // Info about the first page: we use the aspect ratio value later
  const page0 = useSageSmartData(pages[0]);

  // Number of pages in the document
  const filepages = pages.length;

  // Get URL of asset
  const {
    data: { url },
  } = useSageAssetUrl(props.data.file);

  const length = pages.length;
  const { act } = useAction();

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Remove Page'} openDelay={400}>
          <Button
            isDisabled={numPages <= 1}
            onClick={() => {
              dispatch({ type: 'remove-page' });
              const newwidth = (numPages - 1) * props.position.height * page0.data.aspectRatio;
              act({
                type: 'resize',
                position: {
                  ...props.position,
                  width: newwidth,
                },
                id: props.id,
              });
            }}
          >
            <MdRemove />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Add Page'} openDelay={400}>
          <Button
            isDisabled={numPages >= filepages}
            onClick={() => {
              dispatch({ type: 'add-page' });
              const newwidth = (numPages + 1) * props.position.height * page0.data.aspectRatio;
              act({
                type: 'resize',
                position: {
                  ...props.position,
                  width: newwidth,
                },
                id: props.id,
              });
            }}
          >
            <MdAdd />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'1st Page'} openDelay={400}>
          <Button isDisabled={currentPage === 0} onClick={() => dispatch({ type: 'to-start' })}>
            <MdSkipPrevious />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Previous Page'} openDelay={400}>
          <Button isDisabled={currentPage === 0} onClick={() => dispatch({ type: 'prev-page' })}>
            <MdNavigateBefore />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Next Page'} openDelay={400}>
          <Button
            isDisabled={currentPage === length - 1}
            onClick={() => {
              dispatch({ type: 'next-page', length: length });

              // Hack: trigger the rendering of the next page
              if (currentPage < pages.length - 2) {
                const nextPage = currentPage + 2;
                axios.get('/api/data/' + pages[nextPage].reference, { withCredentials: true });
              }
            }}
          >
            <MdNavigateNext />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Last Page'} openDelay={400}>
          <Button isDisabled={currentPage === length - 1} onClick={() => dispatch({ type: 'to-end', length: length })}>
            <MdSkipNext />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Menu placement="bottom">
          <Tooltip hasArrow={true} label={'Actions'} openDelay={300}>
            <MenuButton as={Button} colorScheme="teal" aria-label="layout">
              <MdMenu />
            </MenuButton>
          </Tooltip>
          <MenuList minWidth="150px">
            <MenuItem icon={<MdFileDownload />} onClick={() => downloadFile(url, props.data.file.meta.filename)}>
              Download PDF
            </MenuItem>
            <MenuItem icon={<MdOutlineFastRewind />} onClick={() => dispatch({ type: 'prev-page', step: 10 })}>
              Back 10 pages
            </MenuItem>
            <MenuItem icon={<MdOutlineFastForward />} onClick={() => dispatch({ type: 'next-page', step: 10, length: length })}>
              Forward 10 pages
            </MenuItem>
          </MenuList>
        </Menu>
      </ButtonGroup>
    </>
  );
};

/**
 * Defines the Icon and info to show in Opened Applications dropdown
 */
const MenuBarItem = (props: PdfViewerProps & MenuBarProps) => {
  const str = truncateWithEllipsis(props.data.file.meta.filename, 17);

  return (
    <Tooltip hasArrow={true} label={props.__meta__.description} openDelay={400}>
      <Box display="inline">
        {props.showIcon ? <S3AppIcon icon={MdArticle} appTitle={props.showInfo ? str : undefined} /> : props.showInfo ? str : undefined}
      </Box>
    </Tooltip>
  );
};

const App = React.lazy(() => import('./pdf-viewer'));

const PdfViewer = {
  App,
  Title,
  Controls,
  MenuBarItem,
  __meta__: meta,
} as AppExport<typeof meta>;

export default PdfViewer;
