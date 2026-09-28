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
  MdDescription,
  MdFileDownload,
  MdNavigateBefore,
  MdNavigateNext,
  MdRemove,
  MdSkipNext,
  MdSkipPrevious,
} from 'react-icons/md';

import { useAppStore, useAssetStore, apiUrls, downloadFile } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';

import { state as AppState } from './index';
import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';

// Styling
import './styling.css';

// Height of one printed page in CSS pixels when the document doesn't say (US Letter)
const DEFAULT_PAGE_HEIGHT = 1056;
// Gap between pages shown side by side, as a fraction of the window's height
const PAGE_GAP = 0.02;
// Longest wait for the document's images before splitting it into pages
const IMAGE_WAIT_MS = 5000;

// Number of pages shown side by side
const shownPages = (s: AppState) => Math.max(1, Math.min(s.displayPages ?? 1, s.numPages || 1));

// Width / height of the window: the pages side by side with gaps between them
const windowAspect = (aspect: number, shown: number) => aspect * shown + (shown - 1) * PAGE_GAP;

// Window size after changing the number of pages shown: widened or narrowed so the
// pages keep their size
function layoutSize(size: App['data']['size'], s: AppState, displayPages: number): App['data']['size'] {
  const shown = shownPages(s);
  // One page's shape, from the window's current (locked) shape
  const aspect = (size.width / size.height - (shown - 1) * PAGE_GAP) / shown;
  return { ...size, width: Math.round(size.height * windowAspect(aspect, displayPages)) };
}

// Wait until the document's images have loaded (they decide what fits on each page), or give up
function imagesLoaded(root: HTMLElement) {
  const pending = Array.from(root.querySelectorAll('img')).filter((img) => !img.complete);
  const loaded = Promise.all(
    pending.map(
      (img) =>
        new Promise<void>((done) => {
          img.addEventListener('load', () => done(), { once: true });
          img.addEventListener('error', () => done(), { once: true });
        }),
    ),
  );
  return Promise.race([loaded, new Promise<void>((done) => window.setTimeout(done, IMAGE_WAIT_MS))]);
}

// A block of the document, or a row of a table split between pages, with its position
// in the continuous layout
type Unit = { el: HTMLElement; top: number; bottom: number; table?: HTMLTableElement };

// An empty copy of a table, to hold the rows it has on one page
function tablePart(table: HTMLTableElement) {
  const part = table.cloneNode(false) as HTMLTableElement;
  const cols = table.querySelector(':scope > colgroup');
  if (cols) part.appendChild(cols.cloneNode(true));
  part.appendChild(document.createElement('tbody'));
  return part;
}

/**
 * Split the rendered document into printed pages. The renderer makes one sheet per
 * section of the document, as tall as its content: a sheet taller than a page is cut
 * into pages of the size the document asks for, each with the sheet's margins, header
 * and footer. Paragraphs and other blocks move whole to the next page; a table taller
 * than a page is split between rows. A single block taller than a page (a large image)
 * is cut off at the bottom of its page.
 * Everything stays inside the renderer's wrapper, whose styles number the lists.
 */
function paginate(wrapper: HTMLElement, className: string) {
  wrapper.querySelectorAll<HTMLElement>(`section.${className}`).forEach((sheet) => {
    const style = getComputedStyle(sheet);
    const pageHeight = parseFloat(style.minHeight) || DEFAULT_PAGE_HEIGHT;
    const children = Array.from(sheet.children) as HTMLElement[];
    const header = children.find((el) => el.tagName === 'HEADER');
    const footer = children.find((el) => el.tagName === 'FOOTER');
    const article = children.find((el) => el.tagName === 'ARTICLE');
    if (!article || sheet.offsetHeight <= pageHeight + 1) return;

    // Height left for the body on each page
    const room =
      pageHeight -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom) -
      (header?.offsetHeight ?? 0) -
      (footer?.offsetHeight ?? 0);
    // The blocks in reading order (notes after the body, such as endnotes, included),
    // all measured before anything moves
    const blocks = [
      ...(Array.from(article.children) as HTMLElement[]),
      ...children.filter((el) => el !== header && el !== footer && el !== article),
    ];
    const units: Unit[] = [];
    for (const el of blocks) {
      const top = el.offsetTop;
      if (el instanceof HTMLTableElement && el.offsetHeight > room && el.rows.length > 1) {
        // Rows are positioned relative to their table
        for (const row of Array.from(el.rows))
          units.push({ el: row, top: top + row.offsetTop, bottom: top + row.offsetTop + row.offsetHeight, table: el });
      } else {
        // With its margins: on a new page, the first block's top margin is inside the page
        const margins = getComputedStyle(el);
        units.push({ el, top: top - parseFloat(margins.marginTop), bottom: top + el.offsetHeight + parseFloat(margins.marginBottom) });
      }
    }

    // Fill pages in order: a unit that doesn't fit starts the next page
    const pages: Unit[][] = [];
    let pageTop = 0;
    for (const unit of units) {
      const page = pages[pages.length - 1];
      if (page && unit.bottom - pageTop <= room) page.push(unit);
      else {
        pages.push([unit]);
        pageTop = unit.top;
      }
    }

    // Build the pages: the first reuses the sheet, the others are copies of its shell
    blocks.forEach((el) => el.remove());
    let previous = sheet;
    pages.forEach((page, index) => {
      let target = sheet;
      let body = article;
      if (index > 0) {
        target = sheet.cloneNode(false) as HTMLElement;
        body = article.cloneNode(false) as HTMLElement;
        if (header) target.appendChild(header.cloneNode(true));
        target.appendChild(body);
        if (footer) target.appendChild(footer.cloneNode(true));
        previous.after(target);
      }
      let part: HTMLTableElement | null = null;
      let partOf: HTMLTableElement | undefined;
      for (const unit of page) {
        if (unit.table) {
          // Rows of a split table go into a copy of the table on this page
          if (!part || partOf !== unit.table) {
            part = tablePart(unit.table);
            partOf = unit.table;
            body.appendChild(part);
          }
          part.tBodies[0].appendChild(unit.el);
        } else {
          part = null;
          body.appendChild(unit.el);
        }
      }
      previous = target;
    });
  });

  // Every page is exactly one page tall, with its footer at the bottom
  wrapper.querySelectorAll<HTMLElement>(`section.${className}`).forEach((page) => {
    const pageHeight = parseFloat(getComputedStyle(page).minHeight) || DEFAULT_PAGE_HEIGHT;
    Object.assign(page.style, { height: `${pageHeight}px`, overflow: 'hidden', display: 'flex', flexDirection: 'column' });
    const body = page.querySelector<HTMLElement>(':scope > article');
    if (body) Object.assign(body.style, { flex: '1 1 auto', minHeight: '0' });
  });
}

/**
 * Keep only links that are safe to follow. External links open in a new tab, and only
 * for http(s) and mailto, so a crafted document can't run script through a javascript:
 * link. Links inside the document (#bookmark) go to the page holding their target: left
 * alone they would change the page's URL fragment, which SAGE3's router uses.
 */
function sanitizeLinks(body: HTMLElement, goToAnchor: (anchor: string) => void) {
  body.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#')) {
      const anchor = decodeURIComponent(href.slice(1));
      a.removeAttribute('href');
      a.style.cursor = 'pointer';
      a.addEventListener('click', (e) => {
        e.preventDefault();
        goToAnchor(anchor);
      });
      return;
    }
    let protocol = '';
    try {
      protocol = new URL(href, window.location.href).protocol;
    } catch {
      /* unparsable: dropped below */
    }
    if (['http:', 'https:', 'mailto:'].includes(protocol)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    } else {
      a.removeAttribute('href');
    }
  });
}

/* App component for DOCXViewer */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const assets = useAssetStore((state) => state.assets);

  const [file, setFile] = useState<Asset>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Width / height of the document's first page, used to lock the window shape
  const [aspect, setAspect] = useState<number | undefined>();

  // One column per page on screen. The first holds the rendered document; the others
  // hold copies of it (pictures: they ignore the pointer). Each column shows the whole
  // document moved and scaled so that one page fills it.
  const rowRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  // The pages of the rendered document, once paginated
  const pagesRef = useRef<HTMLElement[]>([]);
  const focusRef = useRef<HTMLDivElement>(null);
  // Latest shared state and size, for event handlers
  const stateRef = useRef(s);
  stateRef.current = s;
  const sizeRef = useRef(props.data.size);
  sizeRef.current = props.data.size;
  // Style names are prefixed with this, so two documents on one board don't collide
  const className = `docx-${props._id.slice(0, 8)}`;

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

  // Show page `first` in the first column and the following pages in the next ones,
  // each scaled to fit its column and centered
  const showPages = useCallback(() => {
    const wrapper = bodyRef.current?.firstElementChild as HTMLElement | null;
    const pages = pagesRef.current;
    if (!wrapper || pages.length === 0) return;
    const first = Math.min(Math.max(0, stateRef.current.currentPage), pages.length - 1);
    columnRefs.current.forEach((column, i) => {
      if (!column) return;
      // The first column holds the document itself; the others a copy, made the first
      // time the column is shown
      let copy: HTMLElement | null = i === 0 ? wrapper : (column.firstElementChild as HTMLElement | null);
      if (!copy) {
        copy = wrapper.cloneNode(true) as HTMLElement;
        column.appendChild(copy);
      }
      const page = pages[first + i];
      copy.style.visibility = page ? 'visible' : 'hidden';
      if (!page) return;
      // Copies have the same layout as the document, so the page's position is read once
      const width = column.clientWidth;
      const height = column.clientHeight;
      const scale = Math.min(width / page.offsetWidth, height / page.offsetHeight);
      const x = (width - page.offsetWidth * scale) / 2 - page.offsetLeft * scale;
      const y = (height - page.offsetHeight * scale) / 2 - page.offsetTop * scale;
      copy.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    });
  }, []);

  // Download, render, and paginate the document
  useEffect(() => {
    const body = bodyRef.current;
    const styles = styleRef.current;
    if (!file || !body || !styles) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    const load = async () => {
      // Fetch the file and the renderer (loaded on first use) in parallel
      const [response, lib] = await Promise.all([fetch(apiUrls.assets.getAssetById(file.data.file)), import('docx-preview')]);
      if (!response.ok) throw new Error(`Could not download the file (${response.status})`);
      const blob = await response.blob();
      if (cancelled) return;
      body.innerHTML = '';
      styles.innerHTML = '';
      await lib.renderAsync(blob, body, styles, {
        className,
        inWrapper: true,
        breakPages: true,
        // HTML embedded in the document would run in an unsandboxed iframe with
        // SAGE3's own origin: never render it
        renderAltChunks: false,
      });
      const wrapper = body.firstElementChild as HTMLElement | null;
      if (cancelled || !wrapper) return;
      // Pages are measured at the document's natural size, relative to the wrapper
      Object.assign(wrapper.style, { position: 'relative', transformOrigin: 'top left' });
      await Promise.all([imagesLoaded(wrapper), document.fonts.ready]);
      if (cancelled) return;
      paginate(wrapper, className);
      const pages = Array.from(wrapper.querySelectorAll<HTMLElement>(`section.${className}`));
      pagesRef.current = pages;
      sanitizeLinks(wrapper, (anchor) => {
        const target = wrapper.querySelector(`[id="${CSS.escape(anchor)}"], [name="${CSS.escape(anchor)}"]`);
        const index = pages.findIndex((page) => target && page.contains(target));
        if (index >= 0) updateState(props._id, { currentPage: Math.min(index, Math.max(0, pages.length - shownPages(stateRef.current))) });
      });

      const count = pages.length;
      const ratio = pages[0] ? pages[0].offsetWidth / pages[0].offsetHeight : undefined;
      setAspect(ratio);
      const current = stateRef.current;
      if (current.numPages !== count) {
        // First load of this document on the board: shape the window like its pages
        if (current.numPages === 0 && ratio) {
          const size = sizeRef.current;
          update(props._id, {
            size: { ...size, height: Math.round(size.width / windowAspect(ratio, Math.max(1, current.displayPages ?? 1))) },
          });
        }
        updateState(props._id, { numPages: count });
      }
      setLoading(false);
    };

    load().catch((err) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : 'Could not open the document');
      setLoading(false);
    });

    return () => {
      cancelled = true;
      pagesRef.current = [];
      body.innerHTML = '';
      styles.innerHTML = '';
      // Drop the copies of this document (the first column holds the document itself)
      columnRefs.current.slice(1).forEach((column) => column && (column.innerHTML = ''));
    };
  }, [file?.data.file]);

  // Follow the shared page, and re-fit when pages are added or the window is resized
  const shown = shownPages(s);
  useEffect(() => {
    if (!loading) showPages();
  }, [s.currentPage, shown, loading]);
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const observer = new ResizeObserver(() => showPages());
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  // Keyboard navigation while the pointer is over the app
  const handleUserKeyPress = useCallback(
    (evt: KeyboardEvent) => {
      const current = stateRef.current;
      const { currentPage, numPages } = current;
      const shown = shownPages(current);
      // First page of the last full set on screen
      const last = Math.max(0, numPages - shown);
      // Show more or fewer pages side by side, like the toolbar's + and - buttons
      const setShown = (displayPages: number) => {
        if (displayPages < 1 || displayPages > numPages || displayPages === shown) return;
        updateState(props._id, { displayPages });
        update(props._id, { size: layoutSize(sizeRef.current, current, displayPages) });
      };
      let next: number | undefined;
      switch (evt.key) {
        case '+':
        case '=':
          setShown(shown + 1);
          next = currentPage;
          break;
        case '-':
          setShown(shown - 1);
          next = currentPage;
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          next = Math.min(currentPage + 1, last);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          next = Math.max(currentPage - 1, 0);
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
      if (next !== currentPage) updateState(props._id, { currentPage: next });
    },
    [props._id],
  );

  useEffect(() => {
    const div = focusRef.current;
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

  // Around and between the pages, and over them while loading
  const background = useColorModeValue('gray.100', 'black');
  const gapColor = useColorModeValue('gray.300', 'gray.800');
  const overlay = useColorModeValue('whiteAlpha.700', 'blackAlpha.700');
  const errorColor = useColorModeValue('red.500', 'red.300');

  return (
    <AppWindow app={props} lockAspectRatio={aspect ? windowAspect(aspect, shown) : false} hideBackgroundIcon={MdDescription}>
      <Box ref={focusRef} tabIndex={1} position="relative" w="100%" h="100%" bg={background} overflow="hidden" outline="none">
        <Box ref={rowRef} w="100%" h="100%" display="flex">
          {Array.from({ length: shown }, (_, i) => (
            <Fragment key={i}>
              {i > 0 && <Box h="100%" flexShrink={0} bg={gapColor} style={{ aspectRatio: PAGE_GAP }} />}
              <Box
                ref={(el: HTMLDivElement | null) => (columnRefs.current[i] = el)}
                flex={1}
                minW={0}
                h="100%"
                position="relative"
                overflow="hidden"
                pointerEvents={i === 0 ? 'auto' : 'none'}
                className="docx-viewer-body"
              >
                {i === 0 && (
                  <>
                    <div ref={styleRef} />
                    {/* The renderer owns this element's content */}
                    <div ref={bodyRef} style={{ position: 'absolute', top: 0, left: 0 }} />
                  </>
                )}
              </Box>
            </Fragment>
          ))}
        </Box>
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

/* App toolbar component for the app DOCXViewer */
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

  const shown = shownPages(s);
  // First page of the last full set on screen
  const last = Math.max(0, s.numPages - shown);
  const goTo = (index: number) => updateState(props._id, { currentPage: Math.min(Math.max(0, index), last) });

  // Show more or fewer pages side by side, resizing the window to match
  const showPages = (displayPages: number) => {
    updateState(props._id, { displayPages });
    update(props._id, { size: layoutSize(props.data.size, s, displayPages) });
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mr={1}>
        <Tooltip placement="top" hasArrow={true} label={'Show Fewer Pages'} openDelay={400}>
          <Button isDisabled={shown <= 1} onClick={() => showPages(shown - 1)} size="xs" p={0}>
            <MdRemove size="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Show More Pages'} openDelay={400}>
          <Button isDisabled={shown >= s.numPages} onClick={() => showPages(shown + 1)} size="xs" p={0}>
            <MdAdd size="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mr={1}>
        <Tooltip placement="top" hasArrow={true} label={'First Page'} openDelay={400}>
          <Button isDisabled={s.currentPage <= 0} onClick={() => goTo(0)} size="xs" p={0}>
            <MdSkipPrevious size="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Previous Page'} openDelay={400}>
          <Button isDisabled={s.currentPage <= 0} onClick={() => goTo(s.currentPage - 1)} size="xs" p={0}>
            <MdNavigateBefore size="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Next Page'} openDelay={400}>
          <Button isDisabled={s.currentPage >= last} onClick={() => goTo(s.currentPage + 1)} size="xs" p={0}>
            <MdNavigateNext size="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Last Page'} openDelay={400}>
          <Button isDisabled={s.currentPage >= last} onClick={() => goTo(last)} size="xs" p={0}>
            <MdSkipNext size="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <Text fontSize="xs" mx={1} whiteSpace="nowrap">
        {s.numPages === 0
          ? '…'
          : shown > 1
            ? `${s.currentPage + 1}–${Math.min(s.currentPage + shown, s.numPages)} / ${s.numPages}`
            : `${s.currentPage + 1} / ${s.numPages}`}
      </Text>
      <ButtonGroup isAttached size="xs" colorScheme="teal" ml={1}>
        <Tooltip placement="top" hasArrow={true} label={'Download Document'} openDelay={400}>
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
