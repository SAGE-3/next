/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router';

// Chakra UI
import { Box, Button, ButtonGroup, Tooltip, Menu, MenuItem, MenuList, MenuButton, HStack } from '@chakra-ui/react';
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
import { BsFiletypePdf } from 'react-icons/bs';

// Utility functions from SAGE3
import { useAssetStore, useAppStore, useUser, downloadFile, apiUrls, useUIStore } from '@sage3/frontend';
import { Asset, ExtraPDFType } from '@sage3/shared/types';

// App components
import { App, AppGroup } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

function AppComponent(props: App): JSX.Element {
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const assets = useAssetStore((state) => state.assets);
  const s = props.data.state as AppState;
  const [urls, setUrls] = useState([] as string[]);
  const [file, setFile] = useState<Asset>();
  const [aspectRatio, setAspectRatio] = useState(1);
  const [displayRatio, setDisplayRatio] = useState(1);
  // User information
  const { user } = useUser();
  // Used to deselect the app
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);

  // Div around the pages to capture events
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const asset = assets.find((a) => a._id === s.assetid);
    if (asset) {
      setFile(asset);
      // Update the state of the app
      if (asset.data.derived) {
        const pages = asset.data.derived as ExtraPDFType;
        if (pages.length !== s.numPages) {
          updateState(props._id, { numPages: pages.length });
        }
        // Update the app title
        const pageInfo = ' - ' + (s.currentPage + 1) + ' of ' + pages.length;
        const newTitle = asset?.data.originalfilename + pageInfo;
        if (newTitle !== props.data.title) {
          update(props._id, { title: newTitle });
        }
      } else {
        // Update the app title
        if (asset?.data.originalfilename !== props.data.title) {
          update(props._id, { title: asset?.data.originalfilename });
        }
      }
    }
  }, [s.assetid, assets, user]);

  useEffect(() => {
    if (file) {
      const pages = file.data.derived as ExtraPDFType;
      if (pages) {
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
        const ar = firstpage[0].width / firstpage[0].height;
        setAspectRatio(ar);
        setDisplayRatio(ar * s.displayPages);
      }
    }
  }, [file]);

  useEffect(() => {
    if (s.displayPages > 1) {
      setDisplayRatio(aspectRatio * s.displayPages);
    } else {
      setDisplayRatio(aspectRatio);
    }
  }, [s.displayPages]);

  useEffect(() => {
    if (file) {
      const pages = file.data.derived as ExtraPDFType;
      if (pages) {
        if (pages.length > 1 && props._updatedBy === user?._id) {
          const pageInfo = ' - ' + (s.currentPage + 1) + ' of ' + pages.length;
          const newTitle = file.data.originalfilename + pageInfo;
          if (newTitle !== props.data.title) {
            update(props._id, { title: newTitle });
          }
        }
      }
    }
  }, [s.currentPage]);

  // Event handler
  const handleUserKeyPress = useCallback(
    (evt: KeyboardEvent) => {
      evt.stopPropagation();
      switch (evt.key) {
        case 'ArrowRight':
        case 'ArrowDown': {
          // Next page
          if (s.currentPage === s.numPages - s.displayPages) return;
          const newpage = s.currentPage + 1 < s.numPages ? s.currentPage + 1 : s.numPages - s.displayPages;
          updateState(props._id, { currentPage: newpage });
          break;
        }
        case 'ArrowLeft':
        case 'ArrowUp': {
          // Previous page
          if (s.currentPage === 0) return;
          const newpage = s.currentPage - 1 >= 0 ? s.currentPage - 1 : 0;
          updateState(props._id, { currentPage: newpage });
          break;
        }
        case '1': {
          // Go to first page
          updateState(props._id, { currentPage: 0 });
          break;
        }
        case '0': {
          // Go to last page
          updateState(props._id, { currentPage: s.numPages - s.displayPages });
          break;
        }
        case '-': {
          // Remove one page
          if (s.displayPages > 1) {
            const pageCount = s.displayPages - 1;
            updateState(props._id, { displayPages: pageCount });
            update(props._id, {
              size: {
                width: pageCount * props.data.size.height * aspectRatio,
                height: props.data.size.height,
                depth: props.data.size.depth,
              },
            });
          }
          break;
        }
        case '+': {
          // Add one page
          if (s.displayPages < s.numPages) {
            const pageCount = s.displayPages + 1;
            updateState(props._id, { displayPages: pageCount });
            update(props._id, {
              size: {
                width: pageCount * props.data.size.height * aspectRatio,
                height: props.data.size.height,
                depth: props.data.size.depth,
              },
            });
          }
          break;
        }
        case 'D': {
          // Trigger a download
          if (file) {
            const url = file?.data.file;
            const filename = file?.data.originalfilename;
            const dl = apiUrls.assets.getAssetById(url);
            downloadFile(dl, filename);
          }
          break;
        }
        case 'Escape': {
          // Deselect the app
          setSelectedApp('');
        }
      }
    },
    [s, file, props.data.position]
  );

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
        // Focus on the div for keyboard events
        div.focus({ preventScroll: true });
      });
    }
    return () => {
      if (div) div.removeEventListener('keydown', handleUserKeyPress);
    };
  }, [divRef, handleUserKeyPress]);

  return (
    <AppWindow app={props} lockAspectRatio={displayRatio} hideBackgroundIcon={BsFiletypePdf}>
      <HStack
        roundedBottom="md"
        bg="whiteAlpha.700"
        width="100%"
        height="100%"
        // setting for keyboard handler
        ref={divRef}
        tabIndex={1}
      >
        {urls
          .filter((u, i) => i >= s.currentPage && i < s.currentPage + s.displayPages)
          .map((url, idx) => (
            <Box id={'pane~' + props._id + idx} key={idx} p={1} m={1} bg="white" color="gray.800" shadow="base" rounded="lg" width={'100%'}>
              <img src={url} width={'100%'} draggable={false} alt={file?.data.originalfilename} />
            </Box>
          ))}
      </HStack>
    </AppWindow>
  );
}

/*
 * Toolbar component for the PDFViewer app
 *
 * @param {App} props
 * @returns {JSX.Element}
 * */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const assets = useAssetStore((state) => state.assets);
  const update = useAppStore((state) => state.update);
  const [file, setFile] = useState<Asset>();
  const [aspectRatio, setAspectRatio] = useState(1);

  useEffect(() => {
    const asset = assets.find((a) => a._id === s.assetid);
    if (asset) {
      setFile(asset);
    }
  }, [s.assetid, assets]);

  useEffect(() => {
    if (file) {
      const pages = file.data.derived as ExtraPDFType;
      if (pages) {
        // First page
        const page = pages[0];
        // First image of the page
        setAspectRatio(page[0].width / page[0].height);
      }
    }
  }, [file]);

  // Previous page
  function handlePrev(amount = 1) {
    if (s.currentPage === 0) return;
    const newpage = s.currentPage - amount >= 0 ? s.currentPage - amount : 0;
    updateState(props._id, { currentPage: newpage });
  }

  // Next page
  function handleNext(amount = 1) {
    if (s.currentPage === s.numPages - s.displayPages) return;
    const newpage = s.currentPage + amount < s.numPages ? s.currentPage + amount : s.numPages - s.displayPages;
    updateState(props._id, { currentPage: newpage });
  }

  // Go to first page
  function handleFirst() {
    updateState(props._id, { currentPage: 0 });
  }

  // Go to last page
  function handleLast() {
    updateState(props._id, { currentPage: s.numPages - s.displayPages });
  }

  // Add a page
  function handleAddPage() {
    if (s.displayPages < s.numPages) {
      const pageCount = s.displayPages + 1;
      updateState(props._id, { displayPages: pageCount });
      update(props._id, {
        size: {
          width: pageCount * props.data.size.height * aspectRatio,
          height: props.data.size.height,
          depth: props.data.size.depth,
        },
      });
    }
  }

  // Remove a page
  function handleRemovePage() {
    if (s.displayPages > 1) {
      const pageCount = s.displayPages - 1;
      updateState(props._id, { displayPages: pageCount });
      update(props._id, {
        size: {
          width: pageCount * props.data.size.height * aspectRatio,
          height: props.data.size.height,
          depth: props.data.size.depth,
        },
      });
    }
  }

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Remove Page'} openDelay={400}>
          <Button isDisabled={s.displayPages <= 1} onClick={() => handleRemovePage()}>
            <MdRemove />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Add Page'} openDelay={400}>
          <Button isDisabled={s.displayPages >= s.numPages} onClick={() => handleAddPage()}>
            <MdAdd />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top-start" hasArrow={true} label={'1st Page'} openDelay={400}>
          <Button isDisabled={s.currentPage === 0} onClick={() => handleFirst()}>
            <MdSkipPrevious />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Previous Page'} openDelay={400}>
          <Button isDisabled={s.currentPage === 0} onClick={() => handlePrev()}>
            <MdNavigateBefore />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Next Page'} openDelay={400}>
          <Button isDisabled={s.currentPage === length - 1} onClick={() => handleNext()}>
            <MdNavigateNext />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Last Page'} openDelay={400}>
          <Button isDisabled={s.currentPage === length - 1} onClick={() => handleLast()}>
            <MdSkipNext />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top-start" hasArrow={true} label={'Download PDF'} openDelay={400}>
          <Button
            onClick={() => {
              if (file) {
                const url = file?.data.file;
                const filename = file?.data.originalfilename;
                const dl = apiUrls.assets.getAssetById(url);
                downloadFile(dl, filename);
              }
            }}
          >
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>

      {/* Extra Actions */}
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Menu placement="top-start">
          <Tooltip hasArrow={true} label={'Actions'} openDelay={300}>
            <MenuButton as={Button} colorScheme="teal" aria-label="layout">
              <MdMenu />
            </MenuButton>
          </Tooltip>
          <MenuList minWidth="150px" fontSize={'sm'}>
            <MenuItem
              icon={<MdFileDownload />}
              onClick={() => {
                if (file) {
                  const url = file?.data.file;
                  const parts = url.split('.');
                  const filename = file?.data.originalfilename + '.json';
                  const dl = apiUrls.assets.getAssetById(parts[0] + '-text.json');
                  downloadFile(dl, filename);
                }
              }}
            >
              Download Text
            </MenuItem>
            <MenuItem icon={<MdOutlineFastRewind />} onClick={() => handlePrev(10)}>
              Back 10 pages
            </MenuItem>
            <MenuItem icon={<MdOutlineFastForward />} onClick={() => handleNext(10)}>
              Forward 10 pages
            </MenuItem>
          </MenuList>
        </Menu>
      </ButtonGroup>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  const { updateStateBatch } = useAppStore((state) => state);

  const handleAddPage = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      if (app.data.state.displayPages >= app.data.state.numPages) return;
      const displayPages = app.data.state.displayPages + 1;
      ps.push({ id: app._id, updates: { displayPages } });
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  const handleRemovePage = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      if (app.data.state.displayPages <= 1) return;
      const displayPages = app.data.state.displayPages - 1;
      ps.push({ id: app._id, updates: { displayPages } });
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  const handleFirstPage = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      const currentPage = 0;
      ps.push({ id: app._id, updates: { currentPage } });
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  const handleLastPage = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      const currentPage = app.data.state.numPages - app.data.state.displayPages;
      ps.push({ id: app._id, updates: { currentPage } });
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  const handlePrev = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      if (app.data.state.currentPage === 0) return;
      const currentPage = app.data.state.currentPage - 1 >= 0 ? app.data.state.currentPage - 1 : 0;
      ps.push({ id: app._id, updates: { currentPage } });
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  const handleNext = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      if (app.data.state.currentPage === app.data.state.numPages - app.data.state.displayPages) return;
      const currentPage =
        app.data.state.currentPage + 1 < app.data.state.numPages
          ? app.data.state.currentPage + 1
          : app.data.state.numPages - app.data.state.displayPages;
      ps.push({ id: app._id, updates: { currentPage } });
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Remove Page'} openDelay={400}>
          <Button onClick={() => handleRemovePage()}>
            <MdRemove />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Add Page'} openDelay={400}>
          <Button onClick={() => handleAddPage()}>
            <MdAdd />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top-start" hasArrow={true} label={'1st Page'} openDelay={400}>
          <Button onClick={() => handleFirstPage()}>
            <MdSkipPrevious />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Previous Page'} openDelay={400}>
          <Button onClick={() => handlePrev()}>
            <MdNavigateBefore />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Next Page'} openDelay={400}>
          <Button onClick={() => handleNext()}>
            <MdNavigateNext />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Last Page'} openDelay={400}>
          <Button onClick={() => handleLastPage()}>
            <MdSkipNext />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
