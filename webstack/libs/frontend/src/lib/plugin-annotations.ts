import type * as Y from 'yjs';
import type { PluginAnnotation } from '@sage3/sageplugin';

/** Read all committed board shapes from the live document, without viewport culling. */
export function readPluginAnnotations(document: Y.Doc): readonly PluginAnnotation[] {
  return document.getArray<Y.Map<any>>('lines').map((line) => {
    const points = line.get('points') as Y.Array<number> | undefined;
    return {
      id: line.get('id'),
      type: line.get('type') || 'line',
      points: points ? toPairs(points.toArray()) : [],
      color: line.get('userColor'),
      alpha: line.get('alpha'),
      size: line.get('size'),
      isComplete: line.get('isComplete'),
      text: line.get('text'),
    };
  });
}

/** Group consecutive coordinates into pairs, ignoring an unmatched final coordinate. */
export function toPairs<T>(arr: T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i < arr.length - 1; i += 2) {
    pairs.push([arr[i], arr[i + 1]]);
  }
  return pairs;
}
