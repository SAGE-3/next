/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Drawing app: the canvas. It fills the app window (a bigger window shows more drawing),
 * with the tool column on the left, the shapes, the editing overlay and the label editor.
 * Keyboard shortcuts and wheel zoom apply only while the app is selected.
 */

import { useEffect, useRef, useState } from 'react';
import { Box as ChakraBox, IconButton, Tooltip, VStack } from '@chakra-ui/react';
import {
  PiCursorBold,
  PiHandBold,
  PiPencilSimpleBold,
  PiSquareBold,
  PiCircleBold,
  PiDiamondBold,
  PiLineSegmentBold,
  PiArrowUpRightBold,
  PiTextTBold,
} from 'react-icons/pi';

import { Shape, Shapes, newId } from '../model/shape';
import { DrawingDoc } from '../model/doc';
import { expandGroups, translate } from '../model/geometry';
import { Overlay } from '../render/Overlay';
import { ShapesLayer, ShapeView } from '../render/Shapes';
import { canvasMeasure } from '../render/text';
import { useDrawingTheme } from '../render/theme';
import { TextEditor } from './TextEditor';
import { Panel } from './Panel';
import { Tool, useDrawingStore, useEditor } from './store';
import { useTools } from './useTools';
import { useView, zoomAt } from './useView';

/**
 * Grid spacing in drawing units for a zoom: a power-of-two multiple of 20 units, chosen so the
 * dots stay between 16 and 32 screen pixels apart whatever the zoom (finer when zoomed in, coarser when zoomed out).
 */
export function gridStep(zoom: number): number {
  const n = Math.ceil(Math.log2(16 / (20 * zoom)));
  return 20 * Math.pow(2, n);
}

/** A rectangle with clearly rounded corners, in the same bold outline as the Phosphor icons around it */
function RoundRectIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={24} aria-hidden>
      <rect x={40} y={40} width={176} height={176} rx={60} />
    </svg>
  );
}

const TOOLS: { tool: Tool; label: string; icon: JSX.Element }[] = [
  { tool: 'select', label: 'Select', icon: <PiCursorBold /> },
  { tool: 'pan', label: 'Pan (or hold Space, or drag with the middle button)', icon: <PiHandBold /> },
  { tool: 'pen', label: 'Pen', icon: <PiPencilSimpleBold /> },
  { tool: 'rect', label: 'Rectangle', icon: <PiSquareBold /> },
  { tool: 'roundrect', label: 'Rounded rectangle', icon: <RoundRectIcon /> },
  { tool: 'ellipse', label: 'Ellipse', icon: <PiCircleBold /> },
  { tool: 'diamond', label: 'Diamond', icon: <PiDiamondBold /> },
  { tool: 'line', label: 'Line', icon: <PiLineSegmentBold /> },
  { tool: 'arrow', label: 'Arrow', icon: <PiArrowUpRightBold /> },
  { tool: 'text', label: 'Text', icon: <PiTextTBold /> },
];

/**
 * The shapes of a document. Only the shapes that changed are re-read; the others keep their
 * object identity, so their views are not re-rendered.
 */
function useShapes(doc: DrawingDoc): Shapes {
  const [shapes, setShapes] = useState<Shapes>(() => doc.getShapes());
  useEffect(() => {
    setShapes(doc.getShapes());
    return doc.observeShapes((ids) =>
      setShapes((prev) => {
        const next = { ...prev };
        for (const id of ids) {
          const shape = doc.getShape(id);
          if (shape) next[id] = shape;
          else delete next[id];
        }
        return next;
      }),
    );
  }, [doc]);
  return shapes;
}

/** The shapes with the current drag's changes applied, so a drag is drawn at pointer speed */
function withLive(shapes: Shapes, live: Record<string, Partial<Shape>> | null): Shapes {
  if (!live) return shapes;
  const out = { ...shapes };
  for (const [id, patch] of Object.entries(live)) if (out[id]) out[id] = { ...out[id], ...patch } as Shape;
  return out;
}

type Props = {
  appId: string;
  doc: DrawingDoc;
  selected: boolean;
  background: 'white' | 'grid';
  remoteSelections: { ids: string[]; color: string }[];
};

export function Canvas({ appId, doc, selected, background, remoteSelections }: Props) {
  const docShapes = useShapes(doc);
  const theme = useDrawingTheme();
  const { view, setView } = useView(appId);
  const editor = useEditor(appId);
  const setTool = useDrawingStore((s) => s.setTool);
  const setSelection = useDrawingStore((s) => s.setSelection);
  const setEditing = useDrawingStore((s) => s.setEditing);
  const setViewport = useDrawingStore((s) => s.setViewport);
  const storeShapes = useDrawingStore((s) => s.setShapes);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const spaceDown = useRef(false);
  const tools = useTools({ appId, doc, shapes: docShapes, view, setView, svgRef, spaceDown });
  const shapes = withLive(docShapes, tools.live);

  // Forget selected shapes that someone else deleted; share the shapes with the toolbar
  useEffect(() => {
    const kept = editor.selection.filter((id) => docShapes[id]);
    if (kept.length !== editor.selection.length) setSelection(appId, kept);
    storeShapes(appId, docShapes);
  }, [docShapes]);

  // Leaving the app ends label editing; selecting it gives it the keyboard
  const focusCanvas = () => wrapperRef.current?.focus({ preventScroll: true });
  useEffect(() => {
    if (selected) focusCanvas();
    else setEditing(appId, null);
  }, [selected]);

  // Canvas size in screen pixels, for "fit the drawing"
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewport(appId, { w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [appId]);

  // Wheel and pinch zoom the drawing only when the app is selected; otherwise the board zooms
  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !selected) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const r = el.getBoundingClientRect();
      const k = r.width ? el.clientWidth / r.width : 1;
      const screen = { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
      setView(zoomAt(viewRef.current, Math.exp(-e.deltaY * 0.002), screen));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [selected, setView]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!selected || editor.editingId) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    let handled = true;
    if (e.key === ' ') spaceDown.current = true;
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (editor.selection.length) doc.remove(editor.selection);
      setSelection(appId, []);
    } else if (mod && key === 'z' && !e.shiftKey) doc.undo();
    else if ((mod && key === 'z' && e.shiftKey) || (mod && key === 'y')) doc.redo();
    else if (mod && key === 'g' && !e.shiftKey) {
      if (editor.selection.length > 1) {
        const group = newId();
        doc.update(Object.fromEntries(editor.selection.map((id) => [id, { group }])));
      }
    } else if (mod && key === 'g' && e.shiftKey) {
      doc.update(Object.fromEntries(editor.selection.map((id) => [id, { group: undefined }])));
    } else if (e.key === 'Escape') {
      setSelection(appId, []);
      setTool(appId, 'select');
    } else if (e.key.startsWith('Arrow') && editor.selection.length) {
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      const ids = expandGroups(shapes, editor.selection);
      doc.update(Object.fromEntries(ids.map((id) => [id, translate(shapes[id], dx, dy)])));
    } else handled = false;
    if (handled) {
      // Keep these keys from the board's own shortcuts
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ') {
      spaceDown.current = false;
      e.stopPropagation();
    }
  };

  const editingShape = editor.editingId ? shapes[editor.editingId] : undefined;
  // While a label is being typed, the shape is drawn without its label
  const visible: Shapes = editingShape ? { ...shapes, [editingShape.id]: { ...editingShape, label: '' } as Shape } : shapes;
  const gridScreen = gridStep(view.zoom) * view.zoom;

  return (
    <ChakraBox
      ref={wrapperRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onClick={(e) => {
        // While selected, the drawing (canvas, tools, panel) handles every click itself: keep clicks
        // from the app window, where Shift+click would add the app to the board's multi-app selection
        if (selected) e.stopPropagation();
      }}
      onBlur={() => (spaceDown.current = false)}
      position="relative"
      width="100%"
      height="100%"
      overflow="hidden"
      background={theme.canvas}
      outline="none"
      style={
        background === 'grid'
          ? {
              backgroundImage: `radial-gradient(${theme.grid} 1.25px, transparent 1.25px)`,
              backgroundSize: `${gridScreen}px ${gridScreen}px`,
              backgroundPosition: `${-view.x * view.zoom}px ${-view.y * view.zoom}px`,
            }
          : undefined
      }
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ display: 'block', cursor: tools.cursor, touchAction: 'none' }}
        onPointerDown={(e) => {
          // The first click on an unselected app only selects it, as with other apps
          if (!selected) return;
          focusCanvas();
          tools.onPointerDown(e);
        }}
        onPointerMove={tools.onPointerMove}
        onPointerUp={tools.onPointerUp}
        onPointerCancel={tools.onPointerUp}
        onDoubleClick={(e) => selected && tools.onDoubleClick(e)}
      >
        <g transform={`scale(${view.zoom}) translate(${-view.x} ${-view.y})`}>
          <ShapesLayer shapes={visible} measure={canvasMeasure} theme={theme} />
          {tools.preview && <ShapeView shape={tools.preview} shapes={shapes} measure={canvasMeasure} theme={theme} />}
          <Overlay
            shapes={shapes}
            selection={editor.selection}
            zoom={view.zoom}
            marquee={tools.marquee}
            snap={tools.snap}
            remoteSelections={remoteSelections}
            hideHandles={tools.dragging || !!editor.editingId}
            handleFill={theme.handleFill}
          />
        </g>
      </svg>

      {editor.editingId && editingShape && (
        <TextEditor
          key={editor.editingId}
          doc={doc}
          shapes={shapes}
          id={editor.editingId}
          view={view}
          measure={canvasMeasure}
          theme={theme}
          onDone={() => {
            setEditing(appId, null);
            // Give the keyboard back to the drawing (Delete, Ctrl+Z, arrows), not the board
            focusCanvas();
          }}
        />
      )}

      {selected && <Panel appId={appId} doc={doc} theme={theme} background={background} />}

      {selected && (
        <VStack position="absolute" left="6px" top="6px" spacing="3px" background={theme.panel} borderRadius="md" boxShadow="md" p="3px">
          {TOOLS.map((t) => (
            <Tooltip key={t.tool} label={t.label} placement="right" hasArrow openDelay={400}>
              <IconButton
                aria-label={t.label}
                icon={t.icon}
                size="md"
                fontSize="22px"
                colorScheme={editor.tool === t.tool ? 'teal' : 'gray'}
                variant={editor.tool === t.tool ? 'solid' : 'ghost'}
                onClick={() => setTool(appId, t.tool)}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </Tooltip>
          ))}
        </VStack>
      )}
    </ChakraBox>
  );
}
