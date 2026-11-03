/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Drawing app: the text area placed over a shape's label while it is typed.
 * Enter or a click outside saves; Shift+Enter starts a new line; Escape cancels.
 */

import { useEffect, useRef, useState } from 'react';

import { FONT_SIZE, STROKE_WIDTH, Shapes, isBox, isLink } from '../model/shape';
import { linkPoints, shapeBounds } from '../model/geometry';
import { DrawingDoc } from '../model/doc';
import { FONT_FAMILY, Measure, wrapText } from '../render/text';
import { linkLabelWidth } from '../render/Shapes';
import { Theme } from '../render/theme';
import { View } from './store';

type Props = { doc: DrawingDoc; shapes: Shapes; id: string; view: View; measure: Measure; theme: Theme; onDone: () => void };

export function TextEditor({ doc, shapes, id, view, measure, theme, onDone }: Props) {
  const shape = shapes[id];
  const [value, setValue] = useState(shape?.label ?? '');
  const ref = useRef<HTMLTextAreaElement>(null);
  const done = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  if (!shape) return null;

  const commit = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    if (save) {
      if (shape.type === 'text' && !value.trim()) {
        doc.remove([id]);
      } else {
        const patch: Record<string, unknown> = { label: value };
        // A text box grows to fit its lines
        if (isBox(shape) && shape.type === 'text') {
          const fs = FONT_SIZE[shape.size];
          const lines = wrapText(value, shape.w - 8, fs, measure).length;
          patch.h = Math.max(shape.h, lines * fs * 1.25 + 8);
        }
        doc.update({ [id]: patch });
      }
    } else if (shape.type === 'text' && !shape.label) {
      doc.remove([id]);
    }
    onDone();
  };

  // Centred where the label is drawn: in the middle of the shape, or at the middle of a line.
  // The width is the label's wrapping width; the height follows the number of lines.
  const fontUnits = FONT_SIZE[shape.size];
  const fontSize = fontUnits * view.zoom;
  let center = { x: 0, y: 0 };
  let widthUnits = linkLabelWidth(fontUnits);
  if (isLink(shape)) {
    center = linkPoints(shape, shapes).handle;
  } else {
    const b = shapeBounds(shape, shapes);
    const padding = shape.type === 'text' ? 4 : STROKE_WIDTH[shape.size] + 8;
    center = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    widthUnits = Math.max(b.w - padding * 2, fontUnits);
  }
  const lines = Math.max(1, wrapText(value, widthUnits, fontUnits, measure).length);
  const width = Math.max(widthUnits * view.zoom, 80) + 8;
  const height = lines * fontSize * 1.25 + 8;
  const left = (center.x - view.x) * view.zoom - width / 2;
  const top = (center.y - view.y) * view.zoom - height / 2;

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => commit(true)}
      onKeyDown={(e) => {
        // Typing must not reach the drawing's or the board's shortcuts
        e.stopPropagation();
        if (e.key === 'Escape') commit(false);
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          commit(true);
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        fontSize,
        fontFamily: FONT_FAMILY,
        lineHeight: 1.25,
        textAlign: 'center',
        color: theme.palette[shape.stroke].stroke,
        // See-through on shapes, so typing looks like the label in place; a line's label hides the line behind it
        background: isLink(shape) ? theme.labelBackground : 'transparent',
        border: '1px dashed #3182ce',
        borderRadius: 4,
        outline: 'none',
        resize: 'none',
        padding: 4,
        overflow: 'hidden',
        zIndex: 2,
      }}
    />
  );
}
