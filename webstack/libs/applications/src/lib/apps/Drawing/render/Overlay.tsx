/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Drawing app: what is drawn over the shapes while editing (never exported):
 * selection box and handles, anchors while attaching an arrow, the marquee, other people's selections.
 */

import { Anchor, Shapes, isBox, isLink } from '../model/shape';
import { ANCHORS, Box, Handle, Point, anchorPoint, linkPoints, selectionBounds } from '../model/geometry';

export const HANDLE_PX = 12;
const SELECT_COLOR = '#3182ce';

/** Position of a box resize handle */
export function handlePoint(b: Box, h: Handle): Point {
  const x = h.includes('w') ? b.x : h.includes('e') ? b.x + b.w : b.x + b.w / 2;
  const y = h.includes('n') ? b.y : h.includes('s') ? b.y + b.h : b.y + b.h / 2;
  return { x, y };
}
export const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

type Props = {
  shapes: Shapes;
  selection: string[];
  zoom: number;
  marquee: Box | null;
  snap: { shapeId: string; anchor: Anchor; point: Point } | null;
  remoteSelections: { ids: string[]; color: string }[];
  hideHandles: boolean;
  handleFill: string;
};

export function Overlay(props: Props) {
  const { shapes, selection, zoom } = props;
  // Sizes in screen pixels, whatever the zoom
  const px = (v: number) => v / zoom;
  const single = selection.length === 1 ? shapes[selection[0]] : undefined;
  const bounds = selectionBounds(selection, shapes);
  const snapTarget = props.snap ? shapes[props.snap.shapeId] : undefined;

  const square = (p: Point, key: string) => (
    <rect
      key={key}
      x={p.x - px(HANDLE_PX / 2)}
      y={p.y - px(HANDLE_PX / 2)}
      width={px(HANDLE_PX)}
      height={px(HANDLE_PX)}
      fill={props.handleFill}
      stroke={SELECT_COLOR}
      strokeWidth={px(1.5)}
    />
  );
  const dot = (p: Point, key: string, fill = props.handleFill) => (
    <circle key={key} cx={p.x} cy={p.y} r={px(HANDLE_PX / 2)} fill={fill} stroke={SELECT_COLOR} strokeWidth={px(1.5)} />
  );

  return (
    <g pointerEvents="none">
      {props.remoteSelections.map((r, i) => {
        const b = selectionBounds(r.ids, shapes);
        if (!b) return null;
        return (
          <rect
            key={'remote' + i}
            x={b.x - px(6)}
            y={b.y - px(6)}
            width={b.w + px(12)}
            height={b.h + px(12)}
            fill="none"
            stroke={r.color}
            strokeWidth={px(2)}
            rx={px(4)}
          />
        );
      })}

      {bounds && (
        <rect
          x={bounds.x - px(3)}
          y={bounds.y - px(3)}
          width={bounds.w + px(6)}
          height={bounds.h + px(6)}
          fill="none"
          stroke={SELECT_COLOR}
          strokeWidth={px(1.5)}
          strokeDasharray={`${px(4)} ${px(3)}`}
        />
      )}

      {!props.hideHandles && single && isBox(single) && HANDLES.map((h) => square(handlePoint(single, h), h))}

      {!props.hideHandles &&
        single &&
        isLink(single) &&
        (() => {
          const { start, end, handle } = linkPoints(single, shapes);
          return [dot(start, 'start'), dot(end, 'end'), dot(handle, 'bend', '#bee3f8')];
        })()}

      {snapTarget &&
        isBox(snapTarget) &&
        ANCHORS.map((a) => dot(anchorPoint(snapTarget, a), 'anchor' + a, a === props.snap?.anchor ? SELECT_COLOR : props.handleFill))}

      {props.marquee && (
        <rect
          x={props.marquee.x}
          y={props.marquee.y}
          width={props.marquee.w}
          height={props.marquee.h}
          fill="rgba(49, 130, 206, 0.08)"
          stroke={SELECT_COLOR}
          strokeWidth={px(1)}
        />
      )}
    </g>
  );
}
