/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useCallback, useRef, MouseEvent } from 'react';
import { useParams } from 'react-router';

// Chakra UI
import { Box, Button, ButtonGroup, Tooltip, HStack, Fade, Image } from '@chakra-ui/react';
// Icons
import {
  MdFileDownload,
  MdOutlineFastRewind,
  MdOutlineFastForward,
  MdAdd,
  MdRemove,
  MdSkipPrevious,
  MdSkipNext,
  MdNavigateNext,
  MdNavigateBefore,
  MdArrowBack,
  MdArrowForward,
} from 'react-icons/md';
import { BsFiletypePdf } from 'react-icons/bs';

// Utility functions from SAGE3
import { useAssetStore, useAppStore, useUser, downloadFile, apiUrls, useUIStore, useHexColor } from '@sage3/frontend';
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
  // App functions
  const createApp = useAppStore((state) => state.create);
  // User information
  const { user } = useUser();
  const { boardId, roomId } = useParams();
  // Set the processing UI state
  const [processing, setProcessing] = useState(false);
  // Used to deselect the app
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const backgroundColor = useHexColor('gray.400');
  const [navigating, setNavigating] = useState("");

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
            setNavigating("");
          }
        }
      }
    }
  }, [s.currentPage]);

  // Display the processing UI
  useEffect(() => {
    // Only show the processing UI if the user is the one who clicked the button
    if (s.executeInfo.executeFunc && s.client === user?._id) setProcessing(true);
    else setProcessing(false);
  }, [s.executeInfo.executeFunc, s.client]);

  // Return from the remote python function
  useEffect(() => {
    if (!user) return;
    if (s.analyzed && s.client === user._id) {
      // Clear the client id after a response
      updateState(props._id, { client: '' });
      // Parse the result we got back
      const result = JSON.parse(s.analyzed);
      // Create a new stickie to show resuls (temporary, should be a new app for this purpose)
      createApp({
        title: 'Analysis - ' + file?.data.originalfilename,
        roomId: roomId!,
        boardId: boardId!,
        position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
        size: { width: 700, height: props.data.size.height, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'PDFResult',
        state: {
          result: JSON.stringify(result, null, 4),
        },
        raised: true,
        dragging: false,
        pinned: false,
      });
    }
  }, [s.analyzed]);

  // Event handler
  const handleUserKeyPress = useCallback(
    (evt: KeyboardEvent) => {
      evt.stopPropagation();
      switch (evt.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ': {
          // Next page
          if (s.currentPage === s.numPages - s.displayPages) return;
          const newpage = s.currentPage + 1 < s.numPages ? s.currentPage + 1 : s.numPages - s.displayPages;
          updateState(props._id, { currentPage: newpage });
          setNavigating("forward");
          break;
        }
        case 'ArrowLeft':
        case 'ArrowUp': {
          // Previous page
          if (s.currentPage === 0) return;
          const newpage = s.currentPage - 1 >= 0 ? s.currentPage - 1 : 0;
          updateState(props._id, { currentPage: newpage });
          setNavigating("backward");
          break;
        }
        case '1': {
          // Go to first page
          if (s.currentPage === 0) return;
          updateState(props._id, { currentPage: 0 });
          setNavigating("backward");
          break;
        }
        case '0': {
          // Go to last page
          if (s.currentPage === (s.numPages - s.displayPages)) return;
          updateState(props._id, { currentPage: s.numPages - s.displayPages });
          setNavigating("forward");
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

  function ondblclick(event: MouseEvent) {
    if (divRef.current) {
      // Get the size of the div
      const bbox = divRef.current.getBoundingClientRect();
      // Convert click position to [0,1]
      const px = (event.clientX - bbox.left) / bbox.width;
      if (px > 0.4) {
        // Click right side: Next page
        if (s.currentPage === s.numPages - s.displayPages) return;
        const newpage = s.currentPage + 1 < s.numPages ? s.currentPage + 1 : s.numPages - s.displayPages;
        updateState(props._id, { currentPage: newpage });
        setNavigating("forward");
      } else {
        // Click left side: Previous page
        if (s.currentPage === 0) return;
        const newpage = s.currentPage - 1 >= 0 ? s.currentPage - 1 : 0;
        updateState(props._id, { currentPage: newpage });
        setNavigating("backward");
      }
    }
  }

  let lastEvent = 0;
  let actionEvent: number | null = null;

  function ontouchend(event: React.TouchEvent<HTMLDivElement>) {
    const now = new Date().getTime();
    const lastTouch = lastEvent || now + 1;
    const delta = now - lastTouch;
    if (actionEvent) window.clearTimeout(actionEvent);
    if (delta < 500 && delta > 0) {
      // Click right side: Next page
      if (s.currentPage === s.numPages - s.displayPages) return;
      const newpage = s.currentPage + 1 < s.numPages ? s.currentPage + 1 : s.numPages - s.displayPages;
      updateState(props._id, { currentPage: newpage });
      setNavigating("forward");
    } else {
      lastEvent = now;
      actionEvent = window.setTimeout(function () {
        if (actionEvent) window.clearTimeout(actionEvent);
      }, 500, [event]);
    }
    lastEvent = now;
  }

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
    <AppWindow app={props} lockAspectRatio={displayRatio} processing={processing} hideBackgroundIcon={BsFiletypePdf}>
      <Box m={0} p={0} width="100%" height="100%">

        <Fade in={navigating === "forward"} transition={{ exit: { duration: 0.5 } }} unmountOnExit={true}>
          <Box
            m={0} p={0}
            position="absolute"
            left={0}
            top={0}
            width={props.data.size.width}
            height={props.data.size.height}
            pointerEvents={'none'}
            userSelect={'none'}
            justifyContent={'center'}
            alignItems={'center'}
            display={'flex'}
            gap={0}
            color={backgroundColor}
            opacity={0.6}
            fontSize={Math.min(props.data.size.width, props.data.size.height) / 2}
          >
            <MdArrowForward stroke="white" strokeWidth={0.1} />
          </Box>
        </Fade>
        <Fade in={navigating === "backward"} transition={{ exit: { duration: 0.5 } }} unmountOnExit={true}>
          <Box
            m={0} p={0}
            position="absolute"
            left={0}
            top={0}
            width={props.data.size.width}
            height={props.data.size.height}
            pointerEvents={'none'}
            userSelect={'none'}
            zIndex={999999999}
            justifyContent={'center'}
            alignItems={'center'}
            display={'flex'}
            color={backgroundColor}
            opacity={0.6}
            fontSize={Math.min(props.data.size.width, props.data.size.height) / 2}
          >
            <MdArrowBack stroke="white" strokeWidth={0.1} />
          </Box>
        </Fade>

        <HStack
          roundedBottom="md"
          bg="whiteAlpha.700"
          width="100%"
          height="100%"
          // setting for keyboard handler
          ref={divRef}
          tabIndex={1}
          onDoubleClick={ondblclick}
          onTouchEnd={ontouchend}
        >
          {urls
            .filter((u, i) => i >= s.currentPage && i < s.currentPage + s.displayPages)
            .map((url, idx) => (
              <Box id={'pane~' + props._id + idx} key={idx} p={1} m={1}
                rounded="lg" bg="white" color="gray.800" shadow="base"
                width="100%" height="100%"
              >
                <Image
                  src={url}
                  userSelect={'none'}
                  draggable={false}
                  width="100%"
                  height="100%"
                  objectFit="contain"
                  alt={file?.data.originalfilename}
                />
              </Box>
            ))}
        </HStack>
      </Box>
    </AppWindow >
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

      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={0}>
        <Tooltip placement="top-start" hasArrow={true} label={'Back 10 pages'} openDelay={400}>
          <Button onClick={() => handlePrev(10)}>
            <MdOutlineFastRewind />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Forward 10 pages'} openDelay={400}>
          <Button onClick={() => handleNext(10)}>
            <MdOutlineFastForward />
          </Button>
        </Tooltip>

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
      {/* <ButtonGroup isAttached size="xs" colorScheme="teal">
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
      </ButtonGroup> */}

      {/* Remote Action in Python */}
      {/* <ButtonGroup isAttached size="xs" colorScheme="orange" ml={1}>
        <Menu placement="top-start">
          <Tooltip hasArrow={true} label={'Remote Actions'} openDelay={300}>
            <MenuButton as={Button} colorScheme="orange" aria-label="layout">
              <MdMenu />
            </MenuButton>
          </Tooltip>
          <MenuList minWidth="150px" fontSize={'sm'}>
            <MenuItem icon={<MdTipsAndUpdates />} onClick={analyzePDF}>
              Analyze
            </MenuItem>
          </MenuList>
        </Menu>
      </ButtonGroup> */}
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  const updateStateBatch = useAppStore((state) => state.updateStateBatch);

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
