/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useState, useCallback, useRef, MouseEvent } from 'react';
import { useParams } from 'react-router';

// Chakra UI components
import { Box, Button, ButtonGroup, Tooltip, HStack, Fade, Image } from '@chakra-ui/react';

// Material Design icons for navigation and actions
import {
  MdFileDownload,
  MdAdd,
  MdRemove,
  MdSkipPrevious,
  MdSkipNext,
  MdNavigateNext,
  MdNavigateBefore,
  MdArrowBack,
  MdArrowForward,
  MdFastRewind,
  MdFastForward,
} from 'react-icons/md';
import { BsFiletypePdf } from 'react-icons/bs';

// SAGE3 utility functions and types
import { useAssetStore, useAppStore, useUser, downloadFile, apiUrls, useUIStore, useHexColor } from '@sage3/frontend';
import { Asset, ExtraPDFType } from '@sage3/shared/types';

// App components and types
import { App, AppGroup } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

/**
 * Main PDFViewer application component
 * Handles PDF display, navigation, and collaborative features
 */
function AppComponent(props: App): JSX.Element {
  // State management hooks
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const assets = useAssetStore((state) => state.assets);
  const s = props.data.state as AppState;
  
  // Local state for PDF rendering
  const [urls, setUrls] = useState([] as string[]);
  const [file, setFile] = useState<Asset>();
  const [aspectRatio, setAspectRatio] = useState(1);
  const [displayRatio, setDisplayRatio] = useState(1);
  
  // App creation function for spawning new apps
  const createApp = useAppStore((state) => state.create);
  
  // User and room information
  const { user } = useUser();
  const { boardId, roomId } = useParams();
  
  // UI state management
  const [processing, setProcessing] = useState(false);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const backgroundColor = useHexColor('gray.400');
  const [navigating, setNavigating] = useState("");

  // Reference to the main container div for event handling
  const divRef = useRef<HTMLDivElement>(null);

  // Effect: Update file reference and initialize PDF metadata
  useEffect(() => {
    const asset = assets.find((a) => a._id === s.assetid);
    if (asset) {
      setFile(asset);
      
      // Update app state with PDF page count
      if (asset.data.derived) {
        const pages = asset.data.derived as ExtraPDFType;
        if (pages.length !== s.numPages) {
          updateState(props._id, { numPages: pages.length });
        }
        
        // Update app title with page information
        if (pages.length > 1) {
          let pageInfo;
          if (s.displayPages > 1) {
            // Show page range when multiple pages are displayed
            const startPage = s.currentPage + 1;
            const endPage = Math.min(s.currentPage + s.displayPages, pages.length);
            pageInfo = ' - ' + startPage + '-' + endPage + ' of ' + pages.length;
          } else {
            // Show single page when only one page is displayed
            pageInfo = ' - ' + (s.currentPage + 1) + ' of ' + pages.length;
          }
          const newTitle = asset?.data.originalfilename + pageInfo;
          if (newTitle !== props.data.title) {
            update(props._id, { title: newTitle });
          }
        } else {
          // Single page PDF - no page info needed in title
          if (asset?.data.originalfilename !== props.data.title) {
            update(props._id, { title: asset?.data.originalfilename });
          }
        }
      } else {
        // No derived data available - use original filename
        if (asset?.data.originalfilename !== props.data.title) {
          update(props._id, { title: asset?.data.originalfilename });
        }
      }
    }
  }, [s.assetid, assets, user]);

  // Effect: Process PDF pages and extract image URLs
  useEffect(() => {
    if (file) {
      const pages = file.data.derived as ExtraPDFType;
      if (pages) {
        // Extract highest resolution image URL for each page
        const allurls = pages.map((page) => {
          const res = page.reduce(function (p, v) {
            return p.width > v.width ? p : v;
          });
          return res.url;
        });
        setUrls(allurls);
        
        // Calculate aspect ratio from first page
        const firstpage = pages[0];
        const ar = firstpage[0].width / firstpage[0].height;
        setAspectRatio(ar);
        setDisplayRatio(ar * Math.max(1, s.displayPages));
      }
    }
  }, [file]);

  // Effect: Update display ratio when number of displayed pages changes
  useEffect(() => {
    if (s.displayPages > 1) {
      setDisplayRatio(aspectRatio * s.displayPages);
    } else {
      setDisplayRatio(aspectRatio);
    }
  }, [s.displayPages, aspectRatio]);

  // Effect: Update title when current page changes
  useEffect(() => {
    if (file) {
      const pages = file.data.derived as ExtraPDFType;
      if (pages) {
        if (pages.length > 1) {
          let pageInfo;
          if (s.displayPages > 1) {
            // Show page range when multiple pages are displayed
            const startPage = s.currentPage + 1;
            const endPage = Math.min(s.currentPage + s.displayPages, pages.length);
            pageInfo = ' - ' + startPage + '-' + endPage + ' of ' + pages.length;
          } else {
            // Show single page when only one page is displayed
            pageInfo = ' - ' + (s.currentPage + 1) + ' of ' + pages.length;
          }
          const newTitle = file.data.originalfilename + pageInfo;
          if (newTitle !== props.data.title) {
            update(props._id, { title: newTitle });
            setNavigating("");
          }
        } else {
          // Single page - no page info needed
          if (file.data.originalfilename !== props.data.title) {
            update(props._id, { title: file.data.originalfilename });
          }
        }
      }
    }
  }, [s.currentPage, s.displayPages]);

  // Effect: Show processing UI for remote operations
  useEffect(() => {
    // Only show processing UI if the current user initiated the operation
    if (s.executeInfo.executeFunc && s.client === user?._id) setProcessing(true);
    else setProcessing(false);
  }, [s.executeInfo.executeFunc, s.client]);

  // Effect: Handle remote analysis results
  useEffect(() => {
    if (!user) return;
    if (s.analyzed && s.client === user._id) {
      // Clear the client ID after receiving response
      updateState(props._id, { client: '' });
      
      // Parse the analysis result
      const result = JSON.parse(s.analyzed);
      
      // Create a new app to display analysis results
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

  // Keyboard event handler for navigation and actions
  const handleUserKeyPress = useCallback(
    (evt: KeyboardEvent) => {
      evt.stopPropagation();
      switch (evt.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ': {
          // Navigate to next page
          const maxPage = Math.max(0, s.numPages - s.displayPages);
          if (s.currentPage >= maxPage) return;
          const newpage = Math.min(s.currentPage + 1, maxPage);
          updateState(props._id, { currentPage: newpage });
          setNavigating("forward");
          break;
        }
        case 'ArrowLeft':
        case 'ArrowUp': {
          // Navigate to previous page
          if (s.currentPage === 0) return;
          const newpage = Math.max(0, s.currentPage - 1);
          updateState(props._id, { currentPage: newpage });
          setNavigating("backward");
          break;
        }
        case '1': {
          // Jump to first page
          if (s.currentPage === 0) return;
          updateState(props._id, { currentPage: 0 });
          setNavigating("backward");
          break;
        }
        case '0': {
          // Jump to last page
          const maxPage = Math.max(0, s.numPages - s.displayPages);
          if (s.currentPage === maxPage) return;
          updateState(props._id, { currentPage: maxPage });
          setNavigating("forward");
          break;
        }
        case '-': {
          // Reduce number of displayed pages
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
          // Increase number of displayed pages
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
          // Download the PDF file
          if (file) {
            const url = file?.data.file;
            const filename = file?.data.originalfilename;
            const dl = apiUrls.assets.getAssetById(url);
            downloadFile(dl, filename);
          }
          break;
        }
        case 'Escape': {
          // Deselect the current app
          setSelectedApp('');
        }
      }
    },
    [s, file, props.data.position]
  );

  // Double-click handler for page navigation
  function ondblclick(event: MouseEvent) {
    if (divRef.current) {
      // Calculate click position relative to container
      const bbox = divRef.current.getBoundingClientRect();
      const px = (event.clientX - bbox.left) / bbox.width;
      
      if (px > 0.4) {
        // Right side click: navigate to next page
        const maxPage = Math.max(0, s.numPages - s.displayPages);
        if (s.currentPage >= maxPage) return;
        const newpage = Math.min(s.currentPage + 1, maxPage);
        updateState(props._id, { currentPage: newpage });
        setNavigating("forward");
      } else {
        // Left side click: navigate to previous page
        if (s.currentPage === 0) return;
        const newpage = Math.max(0, s.currentPage - 1);
        updateState(props._id, { currentPage: newpage });
        setNavigating("backward");
      }
    }
  }

  // Touch event tracking variables
  let lastEvent = 0;
  let actionEvent: number | null = null;

  // Touch end handler for mobile navigation
  function ontouchend(event: React.TouchEvent<HTMLDivElement>) {
    const now = new Date().getTime();
    const lastTouch = lastEvent || now + 1;
    const delta = now - lastTouch;
    
    if (actionEvent) window.clearTimeout(actionEvent);
    
    if (delta < 500 && delta > 0) {
      // Double tap detected: navigate to next page
      const maxPage = Math.max(0, s.numPages - s.displayPages);
      if (s.currentPage >= maxPage) return;
      const newpage = Math.min(s.currentPage + 1, maxPage);
      updateState(props._id, { currentPage: newpage });
      setNavigating("forward");
    } else {
      // Single tap: set up timeout for potential double tap
      lastEvent = now;
      actionEvent = window.setTimeout(function () {
        if (actionEvent) window.clearTimeout(actionEvent);
      }, 500, [event]);
    }
    lastEvent = now;
  }

  // Effect: Attach and detach keyboard event listeners
  useEffect(() => {
    const div = divRef.current;
    if (div) {
      div.addEventListener('keydown', handleUserKeyPress);
      div.addEventListener('mouseleave', () => {
        // Remove focus when mouse leaves the container
        div.blur();
      });
      div.addEventListener('mouseenter', () => {
        // Focus on container for keyboard events
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
        {/* Navigation animation overlay - forward direction */}
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
        
        {/* Navigation animation overlay - backward direction */}
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

        {/* Main PDF display container */}
        <HStack
          roundedBottom="md"
          bg="whiteAlpha.700"
          width="100%"
          height="100%"
          ref={divRef}
          tabIndex={1}
          onDoubleClick={ondblclick}
          onTouchEnd={ontouchend}
        >
          {/* Render PDF pages based on current page and display count */}
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

/**
 * Toolbar component for the PDFViewer app
 * Provides navigation controls and actions for individual PDF viewers
 */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const assets = useAssetStore((state) => state.assets);
  const update = useAppStore((state) => state.update);
  const [file, setFile] = useState<Asset>();
  const [aspectRatio, setAspectRatio] = useState(1);

  // Effect: Update file reference when asset ID changes
  useEffect(() => {
    const asset = assets.find((a) => a._id === s.assetid);
    if (asset) {
      setFile(asset);
    }
  }, [s.assetid, assets]);

  // Effect: Calculate aspect ratio from PDF pages
  useEffect(() => {
    if (file) {
      const pages = file.data.derived as ExtraPDFType;
      if (pages) {
        // Use first page to determine aspect ratio
        const page = pages[0];
        setAspectRatio(page[0].width / page[0].height);
      }
    }
  }, [file]);

  // Navigation function: Go to previous page(s)
  function handlePrev(amount = 1) {
    if (s.currentPage === 0) return;
    const newpage = Math.max(0, s.currentPage - amount);
    updateState(props._id, { currentPage: newpage });
  }

  // Navigation function: Go to next page(s)
  function handleNext(amount = 1) {
    const maxPage = Math.max(0, s.numPages - s.displayPages);
    if (s.currentPage >= maxPage) return;
    const newpage = Math.min(s.currentPage + amount, maxPage);
    updateState(props._id, { currentPage: newpage });
  }

  // Navigation function: Jump to first page
  function handleFirst() {
    updateState(props._id, { currentPage: 0 });
  }

  // Navigation function: Jump to last page
  function handleLast() {
    const maxPage = Math.max(0, s.numPages - s.displayPages);
    updateState(props._id, { currentPage: maxPage });
  }

  // Display function: Add more pages to view
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

  // Display function: Remove pages from view
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
      {/* Page display controls */}
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top" hasArrow={true} label={'Remove Page'} openDelay={400}>
          <Button isDisabled={s.displayPages <= 1} onClick={() => handleRemovePage()}>
            <MdRemove size="16px"/>
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Add Page'} openDelay={400}>
          <Button isDisabled={s.displayPages >= s.numPages} onClick={() => handleAddPage()}>
            <MdAdd size="16px"/>
          </Button>
        </Tooltip>
      </ButtonGroup>
      
      {/* Primary navigation controls */}
      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top" hasArrow={true} label={'1st Page'} openDelay={400}>
          <Button isDisabled={s.currentPage === 0} onClick={() => handleFirst()}>
            <MdSkipPrevious size="16px"/>
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Previous Page'} openDelay={400}>
          <Button isDisabled={s.currentPage === 0} onClick={() => handlePrev()}>
            <MdNavigateBefore size="16px"/>
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Next Page'} openDelay={400}>
          <Button isDisabled={s.currentPage >= Math.max(0, s.numPages - s.displayPages)} onClick={() => handleNext()}>
            <MdNavigateNext size="16px"/>
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Last Page'} openDelay={400}>
          <Button isDisabled={s.currentPage >= Math.max(0, s.numPages - s.displayPages)} onClick={() => handleLast()}>
            <MdSkipNext size="16px"/>
          </Button>
        </Tooltip>
      </ButtonGroup>

      {/* Secondary navigation and actions */}
      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={0}>
        <Tooltip placement="top" hasArrow={true} label={'Back 10 pages'} openDelay={400}>
          <Button isDisabled={s.currentPage === 0} onClick={() => handlePrev(10)}>
            <MdFastRewind size="16px"/>
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Forward 10 pages'} openDelay={400}>
          <Button isDisabled={s.currentPage >= Math.max(0, s.numPages - s.displayPages)} onClick={() => handleNext(10)}>
            <MdFastForward size="16px"/>
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Download PDF'} openDelay={400}>
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
            <MdFileDownload size="16px"/>
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

/**
 * Grouped App toolbar component
 * Provides navigation controls for multiple selected PDF viewers simultaneously
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  const updateStateBatch = useAppStore((state) => state.updateStateBatch);

  // Batch operation: Add pages to all selected viewers
  const handleAddPage = () => {
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      if (app.data.state.displayPages >= app.data.state.numPages) return;
      const displayPages = app.data.state.displayPages + 1;
      ps.push({ id: app._id, updates: { displayPages } });
    });
    updateStateBatch(ps);
  };

  // Batch operation: Remove pages from all selected viewers
  const handleRemovePage = () => {
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      if (app.data.state.displayPages <= 1) return;
      const displayPages = app.data.state.displayPages - 1;
      ps.push({ id: app._id, updates: { displayPages } });
    });
    updateStateBatch(ps);
  };

  // Batch operation: Go to first page in all selected viewers
  const handleFirstPage = () => {
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      const currentPage = 0;
      ps.push({ id: app._id, updates: { currentPage } });
    });
    updateStateBatch(ps);
  };

  // Batch operation: Go to last page in all selected viewers
  const handleLastPage = () => {
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      const maxPage = Math.max(0, app.data.state.numPages - app.data.state.displayPages);
      const currentPage = maxPage;
      ps.push({ id: app._id, updates: { currentPage } });
    });
    updateStateBatch(ps);
  };

  // Batch operation: Go to previous page in all selected viewers
  const handlePrev = () => {
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      if (app.data.state.currentPage === 0) return;
      const currentPage = Math.max(0, app.data.state.currentPage - 1);
      ps.push({ id: app._id, updates: { currentPage } });
    });
    updateStateBatch(ps);
  };

  // Batch operation: Go to next page in all selected viewers
  const handleNext = () => {
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      const maxPage = Math.max(0, app.data.state.numPages - app.data.state.displayPages);
      if (app.data.state.currentPage >= maxPage) return;
      const currentPage = Math.min(app.data.state.currentPage + 1, maxPage);
      ps.push({ id: app._id, updates: { currentPage } });
    });
    updateStateBatch(ps);
  };

  return (
    <>
      {/* Batch page display controls */}
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top" hasArrow={true} label={'Remove Page'} openDelay={400}>
          <Button onClick={() => handleRemovePage()}>
            <MdRemove size="16px"/>
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Add Page'} openDelay={400}>
          <Button onClick={() => handleAddPage()}>
            <MdAdd size="16px"/>
          </Button>
        </Tooltip>
      </ButtonGroup>
      
      {/* Batch navigation controls */}
      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top" hasArrow={true} label={'1st Page'} openDelay={400}>
          <Button onClick={() => handleFirstPage()}>
            <MdSkipPrevious size="16px"/>
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Previous Page'} openDelay={400}>
          <Button onClick={() => handlePrev()}>
            <MdNavigateBefore size="16px"/>
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Next Page'} openDelay={400}>
          <Button onClick={() => handleNext()}>
            <MdNavigateNext size="16px"/>
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Last Page'} openDelay={400}>
          <Button onClick={() => handleLastPage()}>
            <MdSkipNext size="16px"/>
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
