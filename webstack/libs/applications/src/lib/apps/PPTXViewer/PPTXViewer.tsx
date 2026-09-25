/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, ButtonGroup, Spinner, Text, Tooltip } from '@chakra-ui/react';
import { MdFileDownload, MdNavigateBefore, MdNavigateNext, MdSkipNext, MdSkipPrevious, MdSlideshow } from 'react-icons/md';

// Parses the .pptx in the browser and renders slides as HTML/SVG. Only the type is
// imported here: the library (about 1.5 MB with its chart engine) is loaded on first
// use, so boards without a presentation never download it.
import type { PptxViewer } from '@aiden0z/pptx-renderer';

import { useAppStore, useAssetStore, apiUrls, downloadFile } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';

import { state as AppState } from './index';
import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';

// Styling
import './styling.css';

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
          update(props._id, { size: { width: size.width, height: Math.round(size.width / ratio), depth: size.depth } });
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
      const { currentSlide, numSlides } = stateRef.current;
      const last = Math.max(0, numSlides - 1);
      let next: number | undefined;
      switch (evt.key) {
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
          next = 0;
          break;
        case 'End':
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

  return (
    <AppWindow app={props} lockAspectRatio={aspect ?? false} hideBackgroundIcon={MdSlideshow}>
      <Box ref={divRef} tabIndex={1} position="relative" w="100%" h="100%" bg="black" overflow="hidden" outline="none">
        {/* The renderer owns this element's content */}
        <Box ref={slideRef} w="100%" h="100%" className="pptx-viewer-slide" />
        {(loading || error) && (
          <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center" bg="blackAlpha.700">
            {error ? (
              <Text color="red.300" fontSize="lg" px={4} textAlign="center">
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
  const assets = useAssetStore((state) => state.assets);
  const [file, setFile] = useState<Asset>();

  // Convert the ID to an asset
  useEffect(() => {
    const appasset = assets.find((a) => a._id === s.assetid);
    if (appasset) setFile(appasset);
  }, [s.assetid, assets]);

  const last = Math.max(0, s.numSlides - 1);
  const goTo = (index: number) => updateState(props._id, { currentSlide: Math.min(Math.max(0, index), last) });

  return (
    <>
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
        {s.numSlides > 0 ? `${s.currentSlide + 1} / ${s.numSlides}` : '…'}
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
