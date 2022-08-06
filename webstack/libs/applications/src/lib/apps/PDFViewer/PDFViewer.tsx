/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { Box, Button, ButtonGroup, Tooltip, Menu, MenuItem, MenuList, MenuButton, HStack } from '@chakra-ui/react';

import { App } from '../../schema';
import { Asset, ExtraPDFType, ImageInfoType } from '@sage3/shared/types';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { useAssetStore, useAppStore } from '@sage3/frontend';

// Utility functions from SAGE3
import { downloadFile } from '@sage3/frontend';
// Icons
import {
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

// Operator for the Counter application
import { useOperator } from './operator';

// Operator stuff
import { BaseOperator } from '../../components';

export class Operator extends BaseOperator<AppState> {

  // Set page count
  setPageNumber(count: number) {
    console.log('setPageNumber', count);
    this.update({ numPages: count });
  }

  // Next page
  nextPage(s: AppState, amount = 1) {
    console.log('nextPage', s.currentPage, s.numPages, s.displayPages);
    if (s.currentPage === s.numPages - s.displayPages) return;
    const newpage = s.currentPage + amount < s.numPages ? s.currentPage + amount : s.numPages - s.displayPages;
    this.update({ currentPage: newpage });
  }

  // Previous page
  previousPage(s: AppState, amount = 1) {
    if (s.currentPage === 0) return;
    const newpage = s.currentPage - amount >= 0 ? s.currentPage - amount : 0;
    this.update({ currentPage: newpage });
  }

  // Go to first page
  firstPage() {
    this.update({ currentPage: 0 });
  }

  // Go to last page
  lastPage(s: AppState) {
    this.update({ currentPage: s.numPages - s.displayPages });
  }

  // Add a page
  addPage(s: AppState) {
    if (s.displayPages < s.numPages) {
      const pageCount = s.displayPages + 1;
      this.update({ displayPages: pageCount });
    }
  }

  // Remove a page
  removePage(s: AppState) {
    if (s.displayPages > 1) {
      const pageCount = s.displayPages - 1;
      this.update({ displayPages: pageCount });
    }
  }

}

function AppComponent(props: App): JSX.Element {
  const updater = useOperator(props._id);

  const update = useAppStore((state) => state.update);
  const assets = useAssetStore((state) => state.assets);
  const s = props.data.state as AppState;
  const [urls, setUrls] = useState([] as string[]);
  const [file, setFile] = useState<Asset>();
  // const [allPagesInfo, setAllPagesInfo] = useState<ImageInfoType[][]>([]);
  const [aspectRatio, setAspecRatio] = useState(1);


  // Div around the pages to capture events
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.id);
    if (myasset) {
      setFile(myasset);
      // Update the app title
      update(props._id, { description: 'PDF> ' + myasset?.data.originalfilename });
      // Updte the state of the app
      if (myasset.data.derived) {
        const pages = myasset.data.derived as ExtraPDFType;
        updater?.setPageNumber(pages.length);
      }
    }
  }, [s.id, assets, updater]);

  useEffect(() => {
    if (file) {
      const pages = file.data.derived as ExtraPDFType;
      if (pages) {
        // setAllPagesInfo(pages);
        const allurls = pages.map((page) => {
          // find the largest image for this page (multi-resolution)
          const res = page.reduce(function (p, v) {
            return p.width > v.width ? p : v;
          });
          return res.url;
        });
        setUrls(allurls);
        // First image of the page
        const firstpage = pages[0];
        setAspecRatio(firstpage[0].width / firstpage[0].height);
      }
    }
  }, [file]);

  useEffect(() => {
    if (file) {
      const pages = file.data.derived as ExtraPDFType;
      if (pages) {
        if (pages.length > 1) {
          const pageInfo = ' - ' + (s.currentPage + 1) + ' of ' + pages.length;
          update(props._id, { description: 'PDF> ' + file.data.originalfilename + pageInfo });
        }
      }
    }
  }, [s.currentPage]);

  // Event handler
  const handleUserKeyPress = useCallback((evt: KeyboardEvent) => {
    switch (evt.key) {
      case "ArrowRight": {
        // Next page
        updater?.nextPage(s);
        break;
      }
      case "ArrowLeft": {
        // Previous page
        updater?.previousPage(s);
        break;
      }
      case "1": {
        // Go to first page
        updater?.firstPage();
        break;
      }
      case "0": {
        // Go to last page
        updater?.lastPage(s);
        break;
      }

      case "-": {
        // Remove one page
        if (s.displayPages > 1) {
          updater?.removePage(s);
          // Resize the window
          update(props._id, {
            size: {
              width: (s.displayPages - 1) * props.data.size.height * aspectRatio,
              height: props.data.size.height,
              depth: props.data.size.depth,
            },
          });
        }
        break;
      }
      case "+": {
        // Add one page
        if (s.displayPages < s.numPages) {
          updater?.addPage(s);
          // Resize the window
          update(props._id, {
            size: {
              width: (s.displayPages + 1) * props.data.size.height * aspectRatio,
              height: props.data.size.height,
              depth: props.data.size.depth,
            },
          });
        }
        break;
      }
      case "D": {
        // Trigger a download
        if (file) {
          const url = file?.data.file;
          const filename = file?.data.originalfilename;
          downloadFile('api/assets/static/' + url, filename);
        }
        break;
      }
    }
  }, [s, file, props.data.position]);


  // Attach/detach event handler from the div
  useEffect(() => {
    const div = divRef.current;
    if (div) {
      div.addEventListener('keydown', handleUserKeyPress);
      div.addEventListener('mouseleave', () => {
        // remove focus onto div
        div.blur();
      });
      div.addEventListener('mouseenter', () => {
        // Focus on the div for jeyboard events
        div.focus({ preventScroll: true });
      });
    }
    return () => {
      if (div) div.removeEventListener('keydown', handleUserKeyPress);
    };
  }, [divRef, handleUserKeyPress]);

  return (
    <AppWindow app={props}>
      <HStack roundedBottom="md" bg="whiteAlpha.700" width="100%" height="100%" p={2}
        // setting for keyboard handler
        ref={divRef} tabIndex={1} >
        {urls
          .filter((u, i) => i >= s.currentPage && i < s.currentPage + s.displayPages)
          .map((url, idx) => (
            <Box id={'pane~' + props._id + idx} p={1} m={1} bg="white" color="gray.800" shadow="base" rounded="lg" width={'100%'}>
              <img src={url} width={'100%'} draggable={false} alt={file?.data.originalfilename} />
            </Box>
          ))}
      </HStack>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updater = useOperator(props._id);

  const assets = useAssetStore((state) => state.assets);
  const update = useAppStore((state) => state.update);
  const [file, setFile] = useState<Asset>();
  const [aspectRatio, setAspecRatio] = useState(1);

  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.id);
    if (myasset) {
      setFile(myasset);
    }
  }, [s.id, assets]);

  useEffect(() => {
    if (file) {
      const pages = file.data.derived as ExtraPDFType;
      if (pages) {
        // First page
        const page = pages[0];
        // First image of the page
        setAspecRatio(page[0].width / page[0].height);
      }
    }
  }, [file]);

  // Add a page
  function handleAddPage() {
    if (s.displayPages < s.numPages) {
      updater?.addPage(s);
      // Resize the window
      update(props._id, {
        size: {
          width: (s.displayPages + 1) * props.data.size.height * aspectRatio,
          height: props.data.size.height,
          depth: props.data.size.depth,
        },
      });
    }
  }

  // Remove a page
  function handleRemovePage() {
    if (s.displayPages > 1) {
      updater?.removePage(s);
      // Resize the window
      update(props._id, {
        size: {
          width: (s.displayPages - 1) * props.data.size.height * aspectRatio,
          height: props.data.size.height,
          depth: props.data.size.depth,
        },
      });
    }
  }

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Remove Page'} openDelay={400}>
          <Button isDisabled={s.displayPages <= 1} onClick={() => handleRemovePage()}>
            <MdRemove />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Add Page'} openDelay={400}>
          <Button isDisabled={s.displayPages >= s.numPages} onClick={() => handleAddPage()}>
            <MdAdd />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'1st Page'} openDelay={400}>
          <Button isDisabled={s.currentPage === 0} onClick={() => updater?.firstPage()}>
            <MdSkipPrevious />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Previous Page'} openDelay={400}>
          <Button isDisabled={s.currentPage === 0} onClick={() => updater?.previousPage(s)}>
            <MdNavigateBefore />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Next Page'} openDelay={400}>
          <Button isDisabled={s.currentPage === length - 1} onClick={() => updater?.nextPage(s)}>
            <MdNavigateNext />
          </Button>
        </Tooltip>

        <Tooltip placement="bottom" hasArrow={true} label={'Last Page'} openDelay={400}>
          <Button isDisabled={s.currentPage === length - 1} onClick={() => updater?.lastPage(s)}>
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
            <MenuItem
              icon={<MdFileDownload />}
              onClick={() => {
                if (file) {
                  const url = file?.data.file;
                  const filename = file?.data.originalfilename;
                  downloadFile('api/assets/static/' + url, filename);
                }
              }}
            >
              Download
            </MenuItem>
            <MenuItem icon={<MdOutlineFastRewind />} onClick={() => updater?.previousPage(s, 10)}>
              Back 10 pages
            </MenuItem>
            <MenuItem icon={<MdOutlineFastForward />} onClick={() => updater?.nextPage(s, 10)}>
              Forward 10 pages
            </MenuItem>
          </MenuList>
        </Menu>
      </ButtonGroup>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
