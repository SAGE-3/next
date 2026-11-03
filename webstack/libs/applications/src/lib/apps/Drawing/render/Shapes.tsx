/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Drawing app: SVG for each shape. Pure elements without event handlers,
 * used both on screen and for the SVG/PNG export.
 */

import { memo, useMemo } from 'react';
import { getStroke } from 'perfect-freehand';

import { BoxShape, FONT_SIZE, Head, LinkShape, PenShape, STROKE_WIDTH, Shape, Shapes, byLayer, isBox, isLink } from '../model/shape';
import { Point, linkPoints, resolveEnd } from '../model/geometry';
import { FONT_FAMILY, Measure, wrapText } from './text';
import { LIGHT_THEME, Theme } from './theme';

const LINE_HEIGHT = 1.25;

/** Wrapping width of a label on a line or arrow: 200 units at the small size, growing with the text */
export const linkLabelWidth = (fontSize: number) => fontSize * 12.5;

/** Lines of text centred on (cx, cy) */
function Label(props: { text: string; cx: number; cy: number; width: number; fontSize: number; color: string; measure: Measure }) {
  const lines = wrapText(props.text, props.width, props.fontSize, props.measure);
  if (!lines.length) return null;
  const lh = props.fontSize * LINE_HEIGHT;
  const top = props.cy - ((lines.length - 1) * lh) / 2;
  return (
    <text
      x={props.cx}
      y={top}
      fill={props.color}
      fontSize={props.fontSize}
      fontFamily={FONT_FAMILY}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {lines.map((line, i) => (
        <tspan key={i} x={props.cx} y={top + i * lh}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function BoxView({ shape, measure, theme }: { shape: BoxShape; measure: Measure; theme: Theme }) {
  const { x, y, w, h } = shape;
  const stroke = theme.palette[shape.stroke].stroke;
  const fill = shape.fill === 'none' ? 'none' : theme.palette[shape.fill].fill;
  const sw = STROKE_WIDTH[shape.size];
  const common = { stroke, strokeWidth: sw, fill, strokeLinejoin: 'round' as const };
  let outline: JSX.Element | null = null;
  if (shape.type === 'rect') outline = <rect x={x} y={y} width={w} height={h} {...common} />;
  if (shape.type === 'roundrect') {
    const r = Math.min(w, h) * 0.15;
    outline = <rect x={x} y={y} width={w} height={h} rx={r} ry={r} {...common} />;
  }
  if (shape.type === 'ellipse') outline = <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...common} />;
  if (shape.type === 'diamond') {
    const pts = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
    outline = <polygon points={pts} {...common} />;
  }
  // Text boxes have no outline; their text uses the stroke colour and size
  // S/M/L sets the label size too, as for text boxes
  const fontSize = FONT_SIZE[shape.size];
  const padding = shape.type === 'text' ? 4 : sw + 8;
  return (
    <g>
      {outline}
      <Label
        text={shape.label}
        cx={x + w / 2}
        cy={y + h / 2}
        width={Math.max(w - padding * 2, fontSize)}
        fontSize={fontSize}
        color={stroke}
        measure={measure}
      />
    </g>
  );
}

/** Arrow head or dot at `tip`, pointing away from `from` */
function HeadView({ head, tip, from, color, width }: { head: Head; tip: Point; from: Point; color: string; width: number }) {
  if (head === 'none') return null;
  const size = width * 2 + 8;
  if (head === 'dot') return <circle cx={tip.x} cy={tip.y} r={size / 2.5} fill={color} />;
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const a1 = angle + Math.PI * 0.85;
  const a2 = angle - Math.PI * 0.85;
  const pts = [
    tip,
    { x: tip.x + size * Math.cos(a1), y: tip.y + size * Math.sin(a1) },
    { x: tip.x + size * Math.cos(a2), y: tip.y + size * Math.sin(a2) },
  ];
  return <polygon points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill={color} stroke={color} strokeWidth={1} strokeLinejoin="round" />;
}

function LinkView({ shape, shapes, measure, theme }: { shape: LinkShape; shapes: Shapes; measure: Measure; theme: Theme }) {
  const { start, end, control, handle, d } = linkPoints(shape, shapes);
  const color = theme.palette[shape.stroke].stroke;
  const width = STROKE_WIDTH[shape.size];
  // Heads point along the curve's tangent at each end: toward the control point when curved
  const nearStart = shape.bend === 0 ? end : control;
  const nearEnd = shape.bend === 0 ? start : control;
  const fontSize = FONT_SIZE[shape.size];
  const labelWidth = linkLabelWidth(fontSize);
  const lines = wrapText(shape.label, labelWidth, fontSize, measure);
  const labelW = Math.max(0, ...lines.map((l) => measure(l, fontSize))) + 8;
  const labelH = lines.length * fontSize * LINE_HEIGHT + 4;
  return (
    <g>
      <path d={d} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" />
      {shape.type === 'arrow' && <HeadView head={shape.heads.start} tip={start} from={nearStart} color={color} width={width} />}
      {shape.type === 'arrow' && <HeadView head={shape.heads.end} tip={end} from={nearEnd} color={color} width={width} />}
      {lines.length > 0 && (
        <>
          <rect x={handle.x - labelW / 2} y={handle.y - labelH / 2} width={labelW} height={labelH} fill={theme.labelBackground} rx={4} />
          <Label text={shape.label} cx={handle.x} cy={handle.y} width={labelWidth} fontSize={fontSize} color={color} measure={measure} />
        </>
      )}
    </g>
  );
}

/** A freehand stroke, outlined by perfect-freehand as in the board's Whiteboard layer */
function PenView({ shape, theme }: { shape: PenShape; theme: Theme }) {
  const d = useMemo(() => {
    const pts: number[][] = [];
    for (let i = 0; i < shape.points.length; i += 2) pts.push([shape.points[i], shape.points[i + 1]]);
    const outline = getStroke(pts, { size: STROKE_WIDTH[shape.size] * 2, thinning: 0.35, smoothing: 0.2, streamline: 0.12, last: true });
    if (!outline.length) return '';
    return 'M ' + outline.map(([x, y]) => `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`).join(' L ') + ' Z';
  }, [shape.points, shape.size]);
  if (!d) return null;
  return <path d={d} fill={theme.palette[shape.stroke].stroke} />;
}

type ShapeViewProps = { shape: Shape; shapes: Shapes; measure: Measure; theme: Theme };

/**
 * Re-render a shape only when it changed, or, for a line or arrow, when a shape it is
 * attached to moved. Unchanged shapes keep their object identity (see useShapes in Canvas).
 */
function sameView(a: ShapeViewProps, b: ShapeViewProps): boolean {
  if (a.shape !== b.shape || a.measure !== b.measure || a.theme !== b.theme) return false;
  if (!isLink(a.shape)) return true;
  const same = (p: Point, q: Point) => p.x === q.x && p.y === q.y;
  const link = a.shape;
  return (
    same(resolveEnd(a.shapes, link.start), resolveEnd(b.shapes, link.start)) &&
    same(resolveEnd(a.shapes, link.end), resolveEnd(b.shapes, link.end))
  );
}

export const ShapeView = memo(function ShapeView(props: ShapeViewProps) {
  const { shape } = props;
  if (isBox(shape)) return <BoxView shape={shape} measure={props.measure} theme={props.theme} />;
  if (isLink(shape)) return <LinkView shape={shape} shapes={props.shapes} measure={props.measure} theme={props.theme} />;
  return <PenView shape={shape} theme={props.theme} />;
}, sameView);

/** All shapes (or only `ids`), in layer order */
export function ShapesLayer(props: { shapes: Shapes; ids?: string[]; measure: Measure; theme?: Theme }) {
  const theme = props.theme ?? LIGHT_THEME;
  const wanted = props.ids ? new Set(props.ids) : null;
  const ordered = Object.values(props.shapes)
    .filter((s) => !wanted || wanted.has(s.id))
    .sort(byLayer);
  return (
    <g>
      {ordered.map((s) => (
        <ShapeView key={s.id} shape={s} shapes={props.shapes} measure={props.measure} theme={theme} />
      ))}
    </g>
  );
}
