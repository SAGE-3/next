/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Drawing app: a collaborative drawing with shapes, labels, magnetic arrows, pen and text.
 * The drawing lives in the board's Yjs document and is saved to the app state for durability.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, ButtonGroup, Tooltip, useDisclosure, useToast } from '@chakra-ui/react';
import { MdAddPhotoAlternate, MdCloudUpload } from 'react-icons/md';
import { BsFiletypeSvg, BsFiletypePng } from 'react-icons/bs';
import { debounce } from 'throttle-debounce';
import { format } from 'date-fns/format';

import { ConfirmValueModal, downloadFile, useAppStore, useLinkStore, useUIStore, useYjs } from '@sage3/frontend';
import { SAGE3Ability, SAGEColors, getHexColor } from '@sage3/shared';
import { AppWindow } from '../../components';
import { DrawingApp } from './index';
import { DrawingDoc, isElectedSaver, prepareSave } from './model/doc';
import { Canvas } from './editor/Canvas';
import { useDrawingStore, useEditor } from './editor/store';
import { exportSvg, svgSize, svgToPng, uploadToAssets } from './export';
import { canvasMeasure } from './render/text';
import { useDrawingTheme } from './render/theme';

const presenceKey = (appId: string) => 'drawing:' + appId;
const SAVE_DELAY_MS = 2000;

// What each person with the drawing open shares: their selection, and whether they may save the app state
type Presence = { ids: string[]; canSave: boolean };

/** A user's colour as CSS: SAGE3 colour names are mapped to their hex value */
function cssColor(color: unknown): string {
  if (typeof color !== 'string' || !color) return '#718096';
  if (color.startsWith('#')) return color;
  try {
    return getHexColor(color as SAGEColors);
  } catch {
    return '#718096';
  }
}

function AppComponent(props: DrawingApp): JSX.Element {
  const s = props.data.state;
  const appId = props._id;
  const { yApps } = useYjs();
  const selected = useUIStore((state) => state.selectedAppId === appId);
  const updateState = useAppStore((state) => state.updateState);
  const setDoc = useDrawingStore((state) => state.setDoc);
  const editor = useEditor(appId);
  const toast = useToast();
  const [remoteSelections, setRemoteSelections] = useState<{ ids: string[]; color: string }[]>([]);
  const theme = useDrawingTheme();

  const doc = useMemo(() => (yApps ? new DrawingDoc(yApps.doc, appId) : null), [yApps, appId]);

  // Make the document reachable from the toolbar
  useEffect(() => {
    if (!doc) return;
    setDoc(appId, doc);
    return () => {
      setDoc(appId, null);
      doc.destroy();
    };
  }, [doc]);

  // The latest saved copy, for seeding
  const savedShapes = useRef(s.shapes);
  savedShapes.current = s.shapes;

  // Once synced with the Yjs server, fill an empty drawing from the saved copy. Only once:
  // y-websocket fires 'sync' again on every reconnect, and a drawing someone cleared must stay empty.
  useEffect(() => {
    if (!doc || !yApps) return;
    const provider = yApps.provider;
    let seeded = false;
    const onSync = (isSynced: boolean) => {
      if (!isSynced || seeded) return;
      seeded = true;
      provider.off('sync', onSync);
      doc.seed(savedShapes.current);
    };
    if (provider.synced) onSync(true);
    else provider.on('sync', onSync);
    return () => provider.off('sync', onSync);
  }, [doc]);

  // Save the drawing to the app state, 2 s after the last change, by one of the people who have it open
  useEffect(() => {
    if (!doc || !yApps) return;
    const awareness = yApps.provider.awareness;
    let warned = false;
    const save = debounce(SAVE_DELAY_MS, () => {
      // Elected among the people who have the drawing open and may update apps (not spectators)
      const savers = [...awareness.getStates().entries()].filter(([, st]) => st?.[presenceKey(appId)]?.canSave).map(([id]) => id);
      if (!SAGE3Ability.canCurrentUser('update', 'apps') || !isElectedSaver(savers, yApps.doc.clientID)) return;
      const shapes = doc.getShapes();
      if (!prepareSave(shapes).ok) {
        if (!warned) {
          warned = true;
          toast({
            title: 'Drawing',
            description: 'This drawing is too large to save; remove some pen strokes',
            status: 'warning',
            duration: 8000,
            isClosable: true,
          });
        }
        return;
      }
      updateState(appId, { shapes });
    });
    const off = doc.observe(save);
    return () => {
      off();
      save.cancel();
    };
  }, [doc]);

  // Presence: tell others what I have selected here (an empty list still says "I have this drawing open")
  useEffect(() => {
    const presence: Presence = { ids: editor.selection, canSave: SAGE3Ability.canCurrentUser('update', 'apps') };
    yApps?.provider.awareness.setLocalStateField(presenceKey(appId), presence);
  }, [yApps, editor.selection]);
  useEffect(() => {
    const awareness = yApps?.provider.awareness;
    if (!awareness) return;
    let previous = '';
    const onChange = () => {
      const list: { ids: string[]; color: string }[] = [];
      awareness.getStates().forEach((st, clientId) => {
        const ids = (st?.[presenceKey(appId)] as Presence | undefined)?.ids;
        if (clientId !== awareness.clientID && Array.isArray(ids) && ids.length) list.push({ ids, color: cssColor(st.user?.color) });
      });
      // Awareness changes for every cursor and field on the board: re-render only when this drawing's outlines change
      const key = JSON.stringify(list);
      if (key === previous) return;
      previous = key;
      setRemoteSelections(list);
    };
    awareness.on('change', onChange);
    onChange();
    return () => {
      awareness.off('change', onChange);
      awareness.setLocalStateField(presenceKey(appId), null);
    };
  }, [yApps]);

  return (
    <AppWindow app={props}>
      {doc ? (
        <Canvas appId={appId} doc={doc} selected={selected} background={s.background ?? 'white'} remoteSelections={remoteSelections} />
      ) : (
        <Box width="100%" height="100%" background={theme.canvas} />
      )}
    </AppWindow>
  );
}

/* App toolbar component for the app Drawing: export (editing and the grid are in the panel inside the app) */
function ToolbarComponent(props: DrawingApp): JSX.Element {
  const appId = props._id;
  const selection = useDrawingStore((state) => state.editors[appId]?.selection);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const createApp = useAppStore((state) => state.create);
  const addLink = useLinkStore((state) => state.addLink);
  const [placing, setPlacing] = useState(false);
  const sel = selection ?? [];

  // The shapes, read when a button is used
  const svgOf = () => exportSvg(useDrawingStore.getState().shapes[appId] ?? {}, sel.length ? sel : null, canvasMeasure);
  const downloadSvg = () => {
    const svg = svgOf();
    if (svg) downloadFile('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), 'drawing.svg');
  };
  const downloadPng = async () => {
    const svg = svgOf();
    if (!svg) return;
    try {
      const url = URL.createObjectURL(await svgToPng(svg, 2));
      downloadFile(url, 'drawing.png');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      // For example a drawing too large for a canvas at 2x
      toast({
        title: 'Drawing',
        description: 'PNG export failed: ' + (error as Error).message,
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
    }
  };
  const saveToAssets = async (name: string) => {
    const svg = svgOf();
    if (!svg) return;
    try {
      const isSvg = name.toLowerCase().endsWith('.svg');
      const filename = isSvg || name.toLowerCase().endsWith('.png') ? name : name + '.png';
      const blob = isSvg ? new Blob([svg], { type: 'image/svg+xml' }) : await svgToPng(svg, 2);
      await uploadToAssets(new File([blob], filename, { type: blob.type }), props.data.roomId);
      toast({ title: 'Upload', description: 'Upload complete', status: 'info', duration: 4000, isClosable: true });
    } catch (error) {
      toast({
        title: 'Upload',
        description: 'Upload failed: ' + (error as Error).message,
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  /** Upload the drawing (or the selection) as a PNG and open it in an ImageViewer to the right of the app */
  const openImageNextToApp = async () => {
    const svg = svgOf();
    if (!svg) return;
    setPlacing(true);
    try {
      const png = await svgToPng(svg, 2);
      const name = 'drawing-' + format(new Date(), 'yyyy-MM-dd-HH-mm-ss') + '.png';
      const [assetId] = await uploadToAssets(new File([png], name, { type: 'image/png' }), props.data.roomId);
      if (!assetId) throw new Error('no asset id returned');
      // Same proportions as the drawing, as tall as the app
      const { w, h } = svgSize(svg);
      const height = props.data.size.height;
      const width = Math.round(w && h ? (height * w) / h : height);
      const { position, size, roomId, boardId } = props.data;
      const res = await createApp({
        title: name,
        roomId,
        boardId,
        position: { x: position.x + size.width + 20, y: position.y, z: 0 },
        size: { width, height, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'ImageViewer',
        state: { assetid: assetId },
        raised: true,
        dragging: false,
        pinned: false,
      });
      // Show where the image came from
      if (res.success) addLink(appId, res.data._id, boardId, 'provenance');
    } catch (error) {
      toast({
        title: 'Drawing',
        description: 'Could not open the image: ' + (error as Error).message,
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setPlacing(false);
    }
  };

  const tip = (label: string, child: JSX.Element) => (
    <Tooltip placement="top" hasArrow label={label} openDelay={400}>
      {child}
    </Tooltip>
  );

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        {tip(
          sel.length ? 'Download the selection as SVG' : 'Download as SVG',
          <Button onClick={downloadSvg} px={0}>
            <BsFiletypeSvg size="14px" />
          </Button>,
        )}
        {tip(
          sel.length ? 'Download the selection as PNG' : 'Download as PNG',
          <Button onClick={downloadPng} px={0}>
            <BsFiletypePng size="14px" />
          </Button>,
        )}
        {tip(
          sel.length ? 'Open the selection as an image next to the drawing' : 'Open as an image next to the drawing',
          <Button onClick={openImageNextToApp} isLoading={placing} px={0}>
            <MdAddPhotoAlternate size="16px" />
          </Button>,
        )}
        {tip(
          'Save in Asset Manager',
          <Button onClick={onOpen} px={0}>
            <MdCloudUpload size="16px" />
          </Button>,
        )}
      </ButtonGroup>

      <ConfirmValueModal
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={(name: string) => saveToAssets(name)}
        title="Save Drawing in Asset Manager"
        message="Select a file name (.png or .svg):"
        initiaValue={'drawing-' + format(new Date(), 'yyyy-MM-dd-HH:mm:ss') + '.png'}
        cancelText="Cancel"
        confirmText="Save"
        confirmColor="green"
      />
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: DrawingApp[] }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
