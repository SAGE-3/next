/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Drawing app: the editing panel at the top of the canvas (shown while the app is selected):
 * undo/redo, colours, size, arrow heads, group, arrange, delete, zoom and the grid.
 * Export stays in the SAGE3 app toolbar.
 */

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  HStack,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Portal,
  SimpleGrid,
  Tooltip,
} from '@chakra-ui/react';
import {
  MdUndo,
  MdRedo,
  MdZoomIn,
  MdZoomOut,
  MdFitScreen,
  MdFlipToFront,
  MdFlipToBack,
  MdDelete,
  MdAlignHorizontalLeft,
  MdAlignHorizontalCenter,
  MdAlignHorizontalRight,
  MdAlignVerticalTop,
  MdAlignVerticalCenter,
  MdAlignVerticalBottom,
  MdCallMade,
  MdGridOn,
  MdGridOff,
} from 'react-icons/md';
import { BsBoundingBox, BsBoundingBoxCircles, BsChevronUp, BsChevronDown } from 'react-icons/bs';

import { COLOR_NAMES, ColorName, Fill, Head, Shape, Size, isBox, isLink, newId } from '../model/shape';
import { DrawingDoc } from '../model/doc';
import { AlignMode, OrderOp, align, expandGroups, reorder, selectionBounds } from '../model/geometry';
import { useAppStore } from '@sage3/frontend';
import { Theme } from '../render/theme';
import { Style, useDrawingStore, useEditor } from './store';
import { fitView, zoomAt } from './useView';

const HEADS: { label: string; value: { start: Head; end: Head } }[] = [
  { label: 'Arrow at the end', value: { start: 'none', end: 'arrow' } },
  { label: 'Arrows at both ends', value: { start: 'arrow', end: 'arrow' } },
  { label: 'Dot to arrow', value: { start: 'dot', end: 'arrow' } },
  { label: 'Dots at both ends', value: { start: 'dot', end: 'dot' } },
  { label: 'No heads', value: { start: 'none', end: 'none' } },
];
const SIZE_LABEL: Record<Size, string> = { S: 'Small', M: 'Medium', L: 'Large' };

// MenuButton puts its content in a full-width span: centre the content inside it
const CENTER_MENU_BUTTON = { '& > span': { display: 'flex', alignItems: 'center', justifyContent: 'center' } };

type Props = { appId: string; doc: DrawingDoc; theme: Theme; background: 'white' | 'grid' };

export function Panel({ appId, doc, theme, background }: Props) {
  const updateState = useAppStore((state) => state.updateState);
  const editor = useEditor(appId);
  // The view is loaded and saved by the canvas (useView); the panel only changes it
  const view = useDrawingStore((state) => state.views[appId]) ?? { x: 0, y: 0, zoom: 1 };
  const storeSetView = useDrawingStore((state) => state.setView);
  const setView = (v: { x: number; y: number; zoom: number }) => storeSetView(appId, v);
  const viewport = useDrawingStore((state) => state.viewports[appId]);
  const setStyle = useDrawingStore((state) => state.setStyle);
  const setSelection = useDrawingStore((state) => state.setSelection);
  const sel = editor.selection;
  // Re-render only when what the panel shows changes, not on every change during a drag
  const anyGrouped = useDrawingStore((state) => sel.some((id) => state.shapes[appId]?.[id]?.group));
  const [history, setHistory] = useState({ undo: false, redo: false });
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const next = { undo: doc.canUndo(), redo: doc.canRedo() };
      setHistory((h) => (h.undo === next.undo && h.redo === next.redo ? h : next));
    };
    check();
    const off = doc.observe(() => {
      if (!frame) frame = requestAnimationFrame(check);
    });
    return () => {
      off();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [doc]);

  // The shapes, read when a button is used
  const current = () => useDrawingStore.getState().shapes[appId] ?? {};

  /** Set a style for the next shapes, and apply it to the selected shapes it fits */
  const applyStyle = (style: Partial<Style>) => {
    setStyle(appId, style);
    const shapes = current();
    const patches: Record<string, Partial<Shape>> = {};
    for (const id of sel) {
      const shape = shapes[id];
      if (!shape) continue;
      const p: Record<string, unknown> = {};
      if (style.stroke) p.stroke = style.stroke;
      if (style.size) p.size = style.size;
      if (style.fill && isBox(shape) && shape.type !== 'text') p.fill = style.fill;
      if (style.heads && isLink(shape) && shape.type === 'arrow') p.heads = style.heads;
      if (Object.keys(p).length) patches[id] = p as Partial<Shape>;
    }
    doc.update(patches);
  };
  const doAlign = (mode: AlignMode) => doc.update(align(current(), sel, mode));
  const doOrder = (op: OrderOp) => {
    const shapes = current();
    const z = reorder(shapes, expandGroups(shapes, sel), op);
    doc.update(Object.fromEntries(Object.entries(z).map(([id, v]) => [id, { z: v }])));
  };
  const group = () => {
    if (sel.length < 2) return;
    const g = newId();
    doc.update(Object.fromEntries(sel.map((id) => [id, { group: g }])));
  };
  const ungroup = () => doc.update(Object.fromEntries(sel.map((id) => [id, { group: undefined }])));
  const remove = () => {
    doc.remove(sel);
    setSelection(appId, []);
  };
  const center = viewport ? { x: viewport.w / 2, y: viewport.h / 2 } : { x: 0, y: 0 };
  const fit = () => {
    const shapes = current();
    const b = selectionBounds(Object.keys(shapes), shapes);
    // Leave room for the tool column on the left and this panel on top
    if (b && viewport) setView(fitView(b, viewport, 24, { left: 64, top: 56 }));
  };

  const swatch = (color: string, outline = false) => (
    <Box width="18px" height="18px" borderRadius="4px" background={color} border={outline ? '1px dashed #718096' : '1px solid #a0aec0'} />
  );
  const tip = (label: string, child: JSX.Element, key?: string) => (
    <Tooltip key={key} placement="bottom" hasArrow label={label} openDelay={400}>
      {child}
    </Tooltip>
  );
  const { palette, canvas } = theme;

  return (
    <HStack
      position="absolute"
      top="6px"
      left="64px"
      right="6px"
      spacing="4px"
      flexWrap="wrap"
      rowGap="4px"
      pointerEvents="none"
      zIndex={1}
    >
      {/* Each group catches its own clicks; the space between them stays part of the canvas */}
      <HStack
        spacing="4px"
        p="4px"
        background={theme.panel}
        borderRadius="md"
        boxShadow="md"
        pointerEvents="auto"
        flexWrap="wrap"
        rowGap="4px"
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <ButtonGroup isAttached size="sm" colorScheme="teal">
          {tip(
            'Undo (Ctrl+Z)',
            <Button onClick={() => doc.undo()} isDisabled={!history.undo} px={0}>
              <MdUndo size="20px" />
            </Button>,
          )}
          {tip(
            'Redo (Ctrl+Shift+Z)',
            <Button onClick={() => doc.redo()} isDisabled={!history.redo} px={0}>
              <MdRedo size="20px" />
            </Button>,
          )}
        </ButtonGroup>

        <Menu isLazy>
          {tip(
            'Line colour',
            <MenuButton as={Button} size="sm" px={1} sx={CENTER_MENU_BUTTON}>
              {swatch(palette[editor.style.stroke].stroke)}
            </MenuButton>,
          )}
          <Portal>
            <MenuList minWidth="auto" p={2} zIndex="popover">
              <SimpleGrid columns={4} spacing={1}>
                {COLOR_NAMES.map((c: ColorName) => (
                  <Button key={c} size="sm" px={1} onClick={() => applyStyle({ stroke: c })} aria-label={c}>
                    {swatch(palette[c].stroke)}
                  </Button>
                ))}
              </SimpleGrid>
            </MenuList>
          </Portal>
        </Menu>
        <Menu isLazy>
          {tip(
            'Fill colour',
            <MenuButton as={Button} size="sm" px={1} sx={CENTER_MENU_BUTTON}>
              {editor.style.fill === 'none' ? swatch(canvas, true) : swatch(palette[editor.style.fill].fill)}
            </MenuButton>,
          )}
          <Portal>
            <MenuList minWidth="auto" p={2} zIndex="popover">
              <SimpleGrid columns={3} spacing={1}>
                <Button size="sm" px={1} onClick={() => applyStyle({ fill: 'none' })} aria-label="No fill">
                  {swatch(canvas, true)}
                </Button>
                {COLOR_NAMES.map((c: ColorName) => (
                  <Button key={c} size="sm" px={1} onClick={() => applyStyle({ fill: c as Fill })} aria-label={c}>
                    {swatch(palette[c].fill)}
                  </Button>
                ))}
              </SimpleGrid>
            </MenuList>
          </Portal>
        </Menu>
        <ButtonGroup isAttached size="sm" colorScheme="teal">
          {(['S', 'M', 'L'] as Size[]).map((sz) =>
            tip(
              SIZE_LABEL[sz],
              <Button variant={editor.style.size === sz ? 'solid' : 'outline'} onClick={() => applyStyle({ size: sz })}>
                {sz}
              </Button>,
              sz,
            ),
          )}
        </ButtonGroup>
        <Menu isLazy>
          {tip(
            'Arrow heads',
            <MenuButton as={Button} size="sm" px={1} sx={CENTER_MENU_BUTTON}>
              <MdCallMade size="20px" />
            </MenuButton>,
          )}
          <Portal>
            <MenuList zIndex="popover">
              {HEADS.map((h) => (
                <MenuItem key={h.label} onClick={() => applyStyle({ heads: h.value })}>
                  {h.label}
                </MenuItem>
              ))}
            </MenuList>
          </Portal>
        </Menu>
      </HStack>

      <HStack
        spacing="4px"
        p="4px"
        background={theme.panel}
        borderRadius="md"
        boxShadow="md"
        pointerEvents="auto"
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <ButtonGroup isAttached size="sm" colorScheme="teal">
          {tip(
            'Group (Ctrl+G)',
            <Button onClick={group} isDisabled={sel.length < 2} px={0}>
              <BsBoundingBox size="18px" />
            </Button>,
          )}
          {tip(
            'Ungroup (Ctrl+Shift+G)',
            <Button onClick={ungroup} isDisabled={!anyGrouped} px={0}>
              <BsBoundingBoxCircles size="18px" />
            </Button>,
          )}
        </ButtonGroup>
        <Menu isLazy>
          {tip(
            'Arrange: order and alignment',
            <MenuButton as={Button} size="sm" px={1} isDisabled={!sel.length} sx={CENTER_MENU_BUTTON}>
              <MdFlipToFront size="20px" />
            </MenuButton>,
          )}
          <Portal>
            <MenuList zIndex="popover">
              <MenuItem icon={<MdFlipToFront />} onClick={() => doOrder('front')}>
                Bring to front
              </MenuItem>
              <MenuItem icon={<BsChevronUp />} onClick={() => doOrder('forward')}>
                Bring forward
              </MenuItem>
              <MenuItem icon={<BsChevronDown />} onClick={() => doOrder('backward')}>
                Send backward
              </MenuItem>
              <MenuItem icon={<MdFlipToBack />} onClick={() => doOrder('back')}>
                Send to back
              </MenuItem>
              <MenuDivider />
              <MenuItem icon={<MdAlignHorizontalLeft />} onClick={() => doAlign('left')} isDisabled={sel.length < 2}>
                Align left
              </MenuItem>
              <MenuItem icon={<MdAlignHorizontalCenter />} onClick={() => doAlign('center')} isDisabled={sel.length < 2}>
                Align centre
              </MenuItem>
              <MenuItem icon={<MdAlignHorizontalRight />} onClick={() => doAlign('right')} isDisabled={sel.length < 2}>
                Align right
              </MenuItem>
              <MenuItem icon={<MdAlignVerticalTop />} onClick={() => doAlign('top')} isDisabled={sel.length < 2}>
                Align top
              </MenuItem>
              <MenuItem icon={<MdAlignVerticalCenter />} onClick={() => doAlign('middle')} isDisabled={sel.length < 2}>
                Align middle
              </MenuItem>
              <MenuItem icon={<MdAlignVerticalBottom />} onClick={() => doAlign('bottom')} isDisabled={sel.length < 2}>
                Align bottom
              </MenuItem>
            </MenuList>
          </Portal>
        </Menu>
        <ButtonGroup isAttached size="sm" colorScheme="red">
          {tip(
            'Delete (Delete key)',
            <Button onClick={remove} isDisabled={!sel.length} px={0}>
              <MdDelete size="20px" />
            </Button>,
          )}
        </ButtonGroup>
      </HStack>

      <HStack
        spacing="4px"
        p="4px"
        background={theme.panel}
        borderRadius="md"
        boxShadow="md"
        pointerEvents="auto"
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <ButtonGroup isAttached size="sm" colorScheme="teal">
          {tip(
            'Zoom out',
            <Button onClick={() => setView(zoomAt(view, 1 / 1.25, center))} px={0}>
              <MdZoomOut size="20px" />
            </Button>,
          )}
          {tip(
            'Zoom in',
            <Button onClick={() => setView(zoomAt(view, 1.25, center))} px={0}>
              <MdZoomIn size="20px" />
            </Button>,
          )}
          {tip(
            'Fit the drawing',
            <Button onClick={fit} px={0}>
              <MdFitScreen size="20px" />
            </Button>,
          )}
          {tip('Actual size', <Button onClick={() => setView(zoomAt(view, 1 / view.zoom, center))}>{Math.round(view.zoom * 100)}%</Button>)}
        </ButtonGroup>
        <ButtonGroup isAttached size="sm" colorScheme="teal">
          {tip(
            background === 'grid' ? 'Hide the grid' : 'Show a grid',
            <Button
              onClick={() => updateState(appId, { background: background === 'grid' ? 'white' : 'grid' })}
              variant={background === 'grid' ? 'solid' : 'outline'}
              px={0}
            >
              {background === 'grid' ? <MdGridOff size="20px" /> : <MdGridOn size="20px" />}
            </Button>,
          )}
        </ButtonGroup>
      </HStack>
    </HStack>
  );
}
