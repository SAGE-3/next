/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Drawing app: export the drawing (or the selection) as SVG or PNG,
 * and upload a file to the room's Asset Manager.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { apiUrls } from '@sage3/frontend';

import { Shapes } from './model/shape';
import { selectionBounds } from './model/geometry';
import { ShapesLayer } from './render/Shapes';
import { Measure } from './render/text';
import { LIGHT_THEME } from './render/theme';

const MARGIN = 16;

/** A complete SVG document, cropped to the shapes plus a margin, on white. Null when there is nothing to export. */
export function exportSvg(shapes: Shapes, ids: string[] | null, measure: Measure): string | null {
  const wanted = ids && ids.length ? ids : Object.keys(shapes);
  const b = selectionBounds(wanted, shapes);
  if (!b) return null;
  const x = b.x - MARGIN;
  const y = b.y - MARGIN;
  const w = b.w + MARGIN * 2;
  const h = b.h + MARGIN * 2;
  const body = renderToStaticMarkup(createElement(ShapesLayer, { shapes, ids: wanted, measure, theme: LIGHT_THEME }));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${LIGHT_THEME.canvas}"/>` +
    body +
    `</svg>`
  );
}

/** Draw an SVG document onto a canvas and return it as a PNG (browser only) */
export function svgToPng(svg: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(img.width * scale);
      canvas.height = Math.ceil(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('No canvas context'));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG conversion failed'))), 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load the SVG'));
    };
    img.src = url;
  });
}

/** Width and height of an exported SVG (its width/height attributes) */
export function svgSize(svg: string): { w: number; h: number } {
  const w = Number(svg.match(/ width="([\d.]+)"/)?.[1] ?? 0);
  const h = Number(svg.match(/ height="([\d.]+)"/)?.[1] ?? 0);
  return { w, h };
}

/** Upload a file to the room's assets, as the Stickie app does; returns the new asset ids */
export async function uploadToAssets(file: File, roomId: string): Promise<string[]> {
  const fd = new FormData();
  fd.append('files', file);
  fd.append('room', roomId);
  const res = await fetch(apiUrls.assets.upload, { method: 'POST', body: fd, credentials: 'include' });
  if (!res.ok) throw new Error(res.statusText || 'HTTP ' + res.status);
  // The server answers with the ids of the uploaded assets (as the Chat app reads them)
  const ids = await res.json().catch(() => []);
  return Array.isArray(ids) ? ids : [];
}
