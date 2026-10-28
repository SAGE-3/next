import type { PluginSelection } from '@sage3/sageplugin';

type Rectangle = Readonly<Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>>;

/** Normalize to the visible, rotated page, excluding surrounding letterboxing. */
export function normalizePDFSelection(text: string, selectionRects: readonly Rectangle[], bounds: Rectangle): PluginSelection | undefined {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const passage = text.trim();

  if (!passage || width <= 0 || height <= 0) {
    return undefined;
  }

  const normalizedRects: PluginSelection['rects'][number][] = [];

  for (const rect of selectionRects) {
    const left = Math.max(bounds.left, rect.left);
    const top = Math.max(bounds.top, rect.top);
    const right = Math.min(bounds.right, rect.right);
    const bottom = Math.min(bounds.bottom, rect.bottom);

    if (right > left && bottom > top) {
      normalizedRects.push({
        x: (left - bounds.left) / width,
        y: (top - bounds.top) / height,
        width: (right - left) / width,
        height: (bottom - top) / height,
      });
    }
  }

  return normalizedRects.length ? { text: passage, rects: normalizedRects } : undefined;
}
