/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, ButtonGroup, Spinner, Text, Tooltip, useColorModeValue } from '@chakra-ui/react';
import {
  MdAdd,
  MdFileDownload,
  MdNavigateBefore,
  MdNavigateNext,
  MdRemove,
  MdSkipNext,
  MdSkipPrevious,
  MdSlideshow,
  MdViewSidebar,
} from 'react-icons/md';

// Parses the .pptx in the browser and renders slides as HTML/SVG. Only the type is
// imported here: the library (about 1.5 MB with its chart engine) is loaded on first
// use, so boards without a presentation never download it.
import type { PptxViewer, SlideHandle } from '@aiden0z/pptx-renderer';

import { useAppStore, useAssetStore, apiUrls, downloadFile } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';

import { state as AppState } from './index';
import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';

// Styling
import './styling.css';

// Width of the thumbnails panel, as a fraction of the window's height: it keeps its size
// when slides are added beside the first, and scales with the window like the slides
const THUMBS_WIDTH = 0.35;

// Gap between slides shown side by side, also as a fraction of the window's height
const SLIDE_GAP = 0.02;

// Number of slides shown side by side (apps created before this option show one)
const shownSlides = (s: AppState) => Math.max(1, Math.min(s.displaySlides ?? 1, s.numSlides || 1));

// Width / height of the window: the slides side by side, plus the thumbnails panel when open
const windowAspect = (aspect: number, shown: number, thumbnails: boolean) =>
  aspect * shown + (shown - 1) * SLIDE_GAP + (thumbnails ? THUMBS_WIDTH : 0);

// Window size after changing what is on screen: widened or narrowed so the slides keep their size
function layoutSize(size: App['data']['size'], s: AppState, displaySlides: number, showThumbnails: boolean): App['data']['size'] {
  const shown = shownSlides(s);
  // The slides' shape, from the window's current (locked) shape
  const aspect = (size.width / size.height - (shown - 1) * SLIDE_GAP - (s.showThumbnails ? THUMBS_WIDTH : 0)) / shown;
  return { ...size, width: Math.round(size.height * windowAspect(aspect, displaySlides, showThumbnails)) };
}

/**
 * Slide thumbnails in a scrollable column; clicking one goes to that slide.
 * Only thumbnails scrolled into view are drawn: drawing one makes the renderer decode
 * that slide's images and videos, which it then keeps cached (all 34 thumbnails of a
 * 255 MB deck cost ~255 MB), so the lazy loading of the main view would otherwise be lost.
 */
function SlideThumbnails(props: {
  viewer: PptxViewer;
  count: number;
  current: number;
  shown: number;
  aspect: number;
  onSelect: (index: number) => void;
}) {
  const { viewer, count, current, shown, aspect, onSelect } = props;
  const panelBg = useColorModeValue('gray.200', 'gray.800');
  const slotBg = useColorModeValue('gray.100', 'black');
  const labelColor = useColorModeValue('gray.600', 'gray.300');
  const highlight = useColorModeValue('teal.500', 'teal.300');
  const hover = useColorModeValue('gray.400', 'gray.500');
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Thumbnail width in CSS pixels, following the panel's width
  const [width, setWidth] = useState(0);
  const PAD = 8,
    BORDER = 2;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const observer = new ResizeObserver(() => setWidth(Math.floor(panel.clientWidth - 2 * PAD - 2 * BORDER)));
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  // Draw thumbnails as they come into view; everything is redrawn when the width changes
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || width < 20) return;
    const handles = new Map<number, SlideHandle>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const slot = entry.target as HTMLElement;
          const index = Number(slot.dataset.index);
          if (!entry.isIntersecting || handles.has(index)) continue;
          const handle = viewer.renderThumbnailToContainer(index, slot, { width });
          if (handle) handles.set(index, handle);
        }
      },
      { root: panel, rootMargin: '200px 0px' },
    );
    itemRefs.current.slice(0, count).forEach((slot) => slot && observer.observe(slot));
    return () => {
      observer.disconnect();
      handles.forEach((handle) => handle.dispose());
      itemRefs.current.forEach((slot) => slot && (slot.innerHTML = ''));
    };
  }, [viewer, width, count]);

  // Keep the current slide's thumbnail in view (scrolls the panel only, never the page)
  useEffect(() => {
    const panel = panelRef.current;
    const item = itemRefs.current[current]?.parentElement;
    if (!panel || !item) return;
    if (item.offsetTop < panel.scrollTop) panel.scrollTop = item.offsetTop - PAD;
    else if (item.offsetTop + item.offsetHeight > panel.scrollTop + panel.clientHeight)
      panel.scrollTop = item.offsetTop + item.offsetHeight - panel.clientHeight + PAD;
  }, [current, width]);

  return (
    <Box
      ref={panelRef}
      position="relative"
      h="100%"
      style={{ aspectRatio: THUMBS_WIDTH }}
      flexShrink={0}
      overflowY="auto"
      bg={panelBg}
      p={`${PAD}px`}
      onWheel={(e) => e.stopPropagation()} // scroll the thumbnails, don't zoom the board
    >
      {Array.from({ length: count }, (_, index) => {
        // Every slide on screen is highlighted
        const onScreen = index >= current && index < current + shown;
        return (
          <Box
            key={index}
            mb={`${PAD}px`}
            cursor="pointer"
            onClick={() => onSelect(index)}
            border={`${BORDER}px solid`}
            borderColor={onScreen ? highlight : 'transparent'}
            borderRadius="3px"
            _hover={{ borderColor: onScreen ? highlight : hover }}
          >
            {/* The renderer draws here; its content ignores the pointer so a click always
              selects the slide (a thumbnail can contain a real video player) */}
            <Box
              ref={(el: HTMLDivElement | null) => (itemRefs.current[index] = el)}
              data-index={index}
              className="pptx-viewer-thumb"
              h={width > 0 ? `${width / aspect}px` : undefined}
              bg={slotBg}
              overflow="hidden"
              pointerEvents="none"
            />
            <Text fontSize="xs" color={labelColor} textAlign="center" lineHeight="1.4">
              {index + 1}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * A slide shown beside the first one when several are displayed. It is drawn like a
 * thumbnail, at the size that fits its slot: a static picture whose videos and links
 * don't respond (those of the first slide do).
 */
function ExtraSlide(props: { viewer: PptxViewer; index: number; aspect: number }) {
  const { viewer, index, aspect } = props;
  const slotRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<HTMLDivElement>(null);
  // Slide width in CSS pixels, fitted (contain) in the slot
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const observer = new ResizeObserver(() => setWidth(Math.floor(Math.min(slot.clientWidth, slot.clientHeight * aspect))));
    observer.observe(slot);
    return () => observer.disconnect();
  }, [aspect]);

  useEffect(() => {
    const target = drawRef.current;
    if (!target || width < 20) return;
    const handle = viewer.renderThumbnailToContainer(index, target, { width });
    return () => {
      handle?.dispose();
      target.innerHTML = '';
    };
  }, [viewer, index, width]);

  return (
    <Box ref={slotRef} flex={1} minW={0} h="100%" className="pptx-viewer-slide">
      <Box ref={drawRef} w={`${width}px`} h={`${width / aspect}px`} overflow="hidden" pointerEvents="none" />
    </Box>
  );
}

/* App component for PPTXViewer */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const assets = useAssetStore((state) => state.assets);

  // The asset and its URL
  const [file, setFile] = useState<Asset>();
  // Load status
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Width / height of the deck's slides, used to lock the window shape
  const [aspect, setAspect] = useState<number | undefined>();

  // Element the renderer draws into, and the renderer itself
  const slideRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PptxViewer | null>(null);
  // Navigations the app itself asked for; their slidechange events are not re-broadcast
  const navigatingRef = useRef(0);
  // Focusable wrapper for keyboard navigation
  const divRef = useRef<HTMLDivElement>(null);
  // Latest shared state, read inside renderer callbacks and key handlers
  const stateRef = useRef(s);
  stateRef.current = s;
  const sizeRef = useRef(props.data.size);
  sizeRef.current = props.data.size;

  // Get the asset from the state id value, and name the window after the file
  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.assetid);
    if (myasset) {
      setFile(myasset);
      if (props.data.title !== myasset.data.originalfilename) {
        update(props._id, { title: myasset.data.originalfilename });
      }
    }
  }, [s.assetid, assets]);

  // Play/stop of the deck's videos is mirrored on every client: when someone plays or
  // stops a clip here, the same clip is played or stopped everywhere else. Clips are
  // named "<slide>:<n-th clip on the slide>", the same on every client since all
  // render the same deck. No position or timing sync.
  // Clips are looked up when needed rather than tagged when the slide renders: with
  // lazy media, a clip is attached shortly after the slide itself.
  const clipsOnSlide = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLMediaElement>('video, audio'));

  useEffect(() => {
    const container = slideRef.current;
    if (!container) return;
    const share = (event: Event) => {
      const media = event.target as HTMLMediaElement;
      const viewer = viewerRef.current;
      if (!viewer || !(media instanceof HTMLMediaElement)) return;
      // The event our own remote-driven play()/pause() produced: don't echo it
      if (media.dataset.remote) {
        delete media.dataset.remote;
        return;
      }
      // Leaving the slide removes the clip, which pauses it: not a user action
      if (!media.isConnected) return;
      const index = clipsOnSlide(container).indexOf(media);
      if (index < 0) return;
      updateState(props._id, { mediaKey: `${viewer.currentSlideIndex}:${index}`, mediaPlaying: event.type === 'play' });
    };
    // Media events don't bubble, so listen in the capture phase
    container.addEventListener('play', share, true);
    container.addEventListener('pause', share, true);
    return () => {
      container.removeEventListener('play', share, true);
      container.removeEventListener('pause', share, true);
    };
  }, [props._id]);

  // Download and render the deck. Re-runs only when the asset changes; slide
  // changes are applied to the live renderer by the effect below.
  useEffect(() => {
    const container = slideRef.current;
    if (!file || !container) return;
    const abort = new AbortController();
    let viewer: PptxViewer | null = null;
    setLoading(true);
    setError('');

    const load = async () => {
      // Fetch the file and the renderer in parallel
      const [response, lib] = await Promise.all([
        fetch(apiUrls.assets.getAssetById(file.data.file), { signal: abort.signal }),
        import('@aiden0z/pptx-renderer'),
      ]);
      if (!response.ok) throw new Error(`Could not download the file (${response.status})`);
      const buffer = await response.arrayBuffer();
      if (abort.signal.aborted) return;
      // Fits the slide inside the container and re-fits when the window is resized.
      // pdfjs is only used to preview EMF images that embed a PDF: disabled so the
      // renderer never loads a second pdf.js worker alongside the app's own.
      viewer = new lib.PptxViewer(container, { fitMode: 'contain', pdfjs: false });
      viewerRef.current = viewer;
      // Only the slide on screen is parsed and its media decoded: a 255 MB deck opens
      // with ~5 MB of extra memory instead of ~260 MB
      await viewer.open(buffer, { renderMode: 'slide', lazySlides: true, lazyMedia: true, signal: abort.signal });
      if (abort.signal.aborted) return;

      const count = viewer.slideCount;
      const ratio = viewer.slideWidth && viewer.slideHeight ? viewer.slideWidth / viewer.slideHeight : undefined;
      setAspect(ratio);
      const current = stateRef.current;
      if (current.numSlides !== count) {
        // First load of this deck on the board: shape the window like the slides
        if (current.numSlides === 0 && ratio) {
          const size = props.data.size;
          const windowRatio = windowAspect(ratio, Math.max(1, current.displaySlides ?? 1), !!current.showThumbnails);
          update(props._id, { size: { width: size.width, height: Math.round(size.width / windowRatio), depth: size.depth } });
        }
        updateState(props._id, { numSlides: count });
      }
      // Join the presentation where everyone else is
      const start = Math.min(Math.max(0, current.currentSlide), Math.max(0, count - 1));
      if (start !== 0) await viewer.goToSlide(start);
      // A slide change from inside the deck (a hyperlink to another slide) is shared
      // with everyone, like a toolbar click. Registered only after joining the shared
      // slide: open() itself reports slide 0, which would pull everyone back to the start.
      viewer.on('slidechange', (e) => {
        if (navigatingRef.current === 0 && e.detail.index !== stateRef.current.currentSlide) {
          updateState(props._id, { currentSlide: e.detail.index });
        }
      });
      setLoading(false);
    };

    load().catch((err) => {
      if (abort.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Could not open the presentation');
      setLoading(false);
    });

    return () => {
      abort.abort();
      viewer?.destroy();
      viewerRef.current = null;
    };
  }, [file?.data.file]);

  // Follow the shared slide
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || loading || viewer.slideCount === 0) return;
    const target = Math.min(Math.max(0, s.currentSlide), viewer.slideCount - 1);
    if (target === viewer.currentSlideIndex) return;
    navigatingRef.current++;
    viewer.goToSlide(target).finally(() => navigatingRef.current--);
  }, [s.currentSlide, loading]);

  // Apply a play/stop someone else did to the same clip here
  useEffect(() => {
    const container = slideRef.current;
    const viewer = viewerRef.current;
    if (!container || !viewer || !s.mediaKey) return;
    // Only when that clip is on the slide shown here
    const [slide, index] = s.mediaKey.split(':').map(Number);
    if (slide !== viewer.currentSlideIndex) return;
    const media = clipsOnSlide(container)[index];
    if (!media) return;
    if (s.mediaPlaying && media.paused) {
      media.dataset.remote = '1';
      // Rejected when the browser blocks playback before the user has clicked the page
      media.play().catch(() => delete media.dataset.remote);
    } else if (!s.mediaPlaying && !media.paused) {
      media.dataset.remote = '1';
      media.pause();
    }
  }, [s.mediaKey, s.mediaPlaying]);

  // Keyboard navigation while the pointer is over the app
  const handleUserKeyPress = useCallback(
    (evt: KeyboardEvent) => {
      const current = stateRef.current;
      const { currentSlide, numSlides } = current;
      const shown = shownSlides(current);
      // First slide of the last full set on screen
      const last = Math.max(0, numSlides - shown);
      // Show more or fewer slides side by side, like the toolbar's + and - buttons
      const showSlides = (displaySlides: number) => {
        if (displaySlides < 1 || displaySlides > numSlides || displaySlides === shown) return;
        updateState(props._id, { displaySlides });
        update(props._id, { size: layoutSize(sizeRef.current, current, displaySlides, !!current.showThumbnails) });
      };
      let next: number | undefined;
      switch (evt.key) {
        case '+':
        case '=':
          showSlides(shown + 1);
          next = currentSlide;
          break;
        case '-':
          showSlides(shown - 1);
          next = currentSlide;
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          next = Math.min(currentSlide + 1, last);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          next = Math.max(currentSlide - 1, 0);
          break;
        case 'Home':
        case '1':
          next = 0;
          break;
        case 'End':
        case '0':
          next = last;
          break;
        default:
          return;
      }
      evt.stopPropagation();
      evt.preventDefault();
      if (next !== currentSlide) updateState(props._id, { currentSlide: next });
    },
    [props._id],
  );

  useEffect(() => {
    const div = divRef.current;
    if (!div) return;
    const onEnter = () => div.focus({ preventScroll: true });
    const onLeave = () => div.blur();
    div.addEventListener('keydown', handleUserKeyPress);
    div.addEventListener('mouseenter', onEnter);
    div.addEventListener('mouseleave', onLeave);
    return () => {
      div.removeEventListener('keydown', handleUserKeyPress);
      div.removeEventListener('mouseenter', onEnter);
      div.removeEventListener('mouseleave', onLeave);
    };
  }, [handleUserKeyPress]);

  const shown = shownSlides(s);
  const viewer = !loading && !error ? viewerRef.current : null;
  // Around the slides, between them, and over them while loading
  const background = useColorModeValue('gray.100', 'black');
  const gapColor = useColorModeValue('gray.300', 'gray.800');
  const overlay = useColorModeValue('whiteAlpha.700', 'blackAlpha.700');
  const errorColor = useColorModeValue('red.500', 'red.300');

  return (
    <AppWindow
      app={props}
      lockAspectRatio={aspect ? windowAspect(aspect, shown, !!s.showThumbnails) : false}
      hideBackgroundIcon={MdSlideshow}
    >
      <Box ref={divRef} tabIndex={1} position="relative" w="100%" h="100%" bg={background} overflow="hidden" outline="none" display="flex">
        {s.showThumbnails && viewer && (
          <SlideThumbnails
            viewer={viewer}
            count={s.numSlides}
            current={s.currentSlide}
            shown={shown}
            aspect={aspect ?? 16 / 9}
            onSelect={(index) => updateState(props._id, { currentSlide: Math.min(index, Math.max(0, s.numSlides - shown)) })}
          />
        )}
        {/* The renderer owns this element's content; it re-fits the slide when the
            thumbnails open or close, or slides are added beside it */}
        <Box ref={slideRef} flex={1} minW={0} h="100%" className="pptx-viewer-slide" />
        {/* The next slides, when several are shown, each after a gap (an empty slot past the last slide) */}
        {Array.from({ length: shown - 1 }, (_, i) => s.currentSlide + 1 + i).map((index, i) => (
          <Fragment key={i}>
            <Box h="100%" flexShrink={0} bg={gapColor} style={{ aspectRatio: SLIDE_GAP }} />
            {viewer && index < s.numSlides ? <ExtraSlide viewer={viewer} index={index} aspect={aspect ?? 16 / 9} /> : <Box flex={1} />}
          </Fragment>
        ))}
        {(loading || error) && (
          <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center" bg={overlay}>
            {error ? (
              <Text color={errorColor} fontSize="lg" px={4} textAlign="center">
                {error}
              </Text>
            ) : (
              <Spinner size="xl" color="teal.300" thickness="4px" />
            )}
          </Box>
        )}
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app PPTXViewer */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const assets = useAssetStore((state) => state.assets);
  const [file, setFile] = useState<Asset>();

  // Convert the ID to an asset
  useEffect(() => {
    const appasset = assets.find((a) => a._id === s.assetid);
    if (appasset) setFile(appasset);
  }, [s.assetid, assets]);

  const shown = shownSlides(s);
  // First slide of the last full set on screen
  const last = Math.max(0, s.numSlides - shown);
  const goTo = (index: number) => updateState(props._id, { currentSlide: Math.min(Math.max(0, index), last) });

  // Change what is on screen, resizing the window to match
  const setLayout = (displaySlides: number, showThumbnails: boolean) => {
    updateState(props._id, { displaySlides, showThumbnails });
    update(props._id, { size: layoutSize(props.data.size, s, displaySlides, showThumbnails) });
  };

  return (
    <>
      <Tooltip placement="top" hasArrow={true} label={s.showThumbnails ? 'Hide Thumbnails' : 'Show Thumbnails'} openDelay={400}>
        <Button
          size="xs"
          p={0}
          mr={1}
          colorScheme="teal"
          variant={s.showThumbnails ? 'solid' : 'outline'}
          isDisabled={s.numSlides === 0}
          onClick={() => setLayout(shown, !s.showThumbnails)}
        >
          <MdViewSidebar size="16px" />
        </Button>
      </Tooltip>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mr={1}>
        <Tooltip placement="top" hasArrow={true} label={'Show Fewer Slides'} openDelay={400}>
          <Button isDisabled={shown <= 1} onClick={() => setLayout(shown - 1, !!s.showThumbnails)} size="xs" p={0}>
            <MdRemove size="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Show More Slides'} openDelay={400}>
          <Button isDisabled={shown >= s.numSlides} onClick={() => setLayout(shown + 1, !!s.showThumbnails)} size="xs" p={0}>
            <MdAdd size="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mr={1}>
        <Tooltip placement="top" hasArrow={true} label={'First Slide'} openDelay={400}>
          <Button isDisabled={s.currentSlide <= 0} onClick={() => goTo(0)} size="xs" p={0}>
            <MdSkipPrevious size="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Previous Slide'} openDelay={400}>
          <Button isDisabled={s.currentSlide <= 0} onClick={() => goTo(s.currentSlide - 1)} size="xs" p={0}>
            <MdNavigateBefore size="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Next Slide'} openDelay={400}>
          <Button isDisabled={s.currentSlide >= last} onClick={() => goTo(s.currentSlide + 1)} size="xs" p={0}>
            <MdNavigateNext size="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Last Slide'} openDelay={400}>
          <Button isDisabled={s.currentSlide >= last} onClick={() => goTo(last)} size="xs" p={0}>
            <MdSkipNext size="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <Text fontSize="xs" mx={1} whiteSpace="nowrap">
        {s.numSlides === 0
          ? '…'
          : shown > 1
            ? `${s.currentSlide + 1}–${Math.min(s.currentSlide + shown, s.numSlides)} / ${s.numSlides}`
            : `${s.currentSlide + 1} / ${s.numSlides}`}
      </Text>
      <ButtonGroup isAttached size="xs" colorScheme="teal" ml={1}>
        <Tooltip placement="top" hasArrow={true} label={'Download Presentation'} openDelay={400}>
          <Button
            onClick={() => {
              if (file) {
                const dl = apiUrls.assets.getAssetById(file.data.file);
                downloadFile(dl, file.data.originalfilename);
              }
            }}
            size="xs"
            px={0}
          >
            <MdFileDownload size="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
