/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Drawing app: the shapes in the board's shared Yjs document.
 * One Y.Map named `drawing:<appId>` maps each shape id to a Y.Map of that shape's fields,
 * so two people editing different shapes (or different fields) never conflict.
 */

import * as Y from 'yjs';
import { Shape, Shapes, parseShapes, shapeSchema } from './shape';
import { detachFrom } from './geometry';

export const MAX_SAVE_BYTES = 2 * 1024 * 1024;

export class DrawingDoc {
  readonly map: Y.Map<Y.Map<unknown>>;
  private readonly ydoc: Y.Doc;
  // Only edits made with this origin are undoable here, so undo never reverts someone else's work
  private readonly origin = { drawing: true };
  private readonly seedOrigin = { drawingSeed: true };
  private readonly undoManager: Y.UndoManager;

  constructor(ydoc: Y.Doc, appId: string) {
    this.ydoc = ydoc;
    this.map = ydoc.getMap('drawing:' + appId);
    // Undo steps are cut explicitly: each action is one step, and a whole drag is one step (see `drag`)
    this.undoManager = new Y.UndoManager(this.map, { trackedOrigins: new Set([this.origin]), captureTimeout: 1e9 });
  }

  /** One shape, or null when it is missing or invalid */
  getShape(id: string): Shape | null {
    const ymap = this.map.get(id);
    if (!ymap) return null;
    const parsed = shapeSchema.safeParse(ymap.toJSON());
    return parsed.success && parsed.data.id === id ? parsed.data : null;
  }

  getShapes(): Shapes {
    const out: Shapes = {};
    this.map.forEach((_, id) => {
      const shape = this.getShape(id);
      if (shape) out[id] = shape;
    });
    return out;
  }

  /** Add a shape, as its own undo step */
  add(shape: Shape): void {
    this.undoManager.stopCapturing();
    this.ydoc.transact(() => this.map.set(shape.id, toYMap(shape)), this.origin);
    this.undoManager.stopCapturing();
  }

  /**
   * Change only the listed fields of the listed shapes, in one transaction.
   * Each call is its own undo step, except during a drag (`drag: true`), whose writes
   * merge into one step that `stopCapturing()` closes at the end of the drag.
   */
  update(patches: Record<string, Partial<Shape>>, options: { drag?: boolean } = {}): void {
    if (!Object.keys(patches).length) return;
    if (!options.drag) this.undoManager.stopCapturing();
    this.ydoc.transact(() => this.applyPatches(patches), this.origin);
    if (!options.drag) this.undoManager.stopCapturing();
  }

  /** Delete shapes, as one undo step; arrows attached to them keep their ends where they are */
  remove(ids: string[]): void {
    if (!ids.length) return;
    const detach = detachFrom(this.getShapes(), ids);
    this.undoManager.stopCapturing();
    this.ydoc.transact(() => {
      for (const id of ids) this.map.delete(id);
      this.applyPatches(detach);
    }, this.origin);
    this.undoManager.stopCapturing();
  }

  private applyPatches(patches: Record<string, Partial<Shape>>): void {
    for (const [id, patch] of Object.entries(patches)) {
      const ymap = this.map.get(id);
      if (!ymap) continue;
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) ymap.delete(key);
        else ymap.set(key, value);
      }
    }
  }

  undo(): void {
    this.undoManager.undo();
  }

  redo(): void {
    this.undoManager.redo();
  }

  canUndo(): boolean {
    return this.undoManager.canUndo();
  }

  canRedo(): boolean {
    return this.undoManager.canRedo();
  }

  /** Call at the start and end of a drag, so the whole drag is one undo step (whatever its pauses) */
  stopCapturing(): void {
    this.undoManager.stopCapturing();
  }

  /** Fill an empty drawing from the copy saved in the app state. Shapes are keyed by id, so two clients seeding at once give one copy. */
  seed(saved: unknown): void {
    if (this.map.size > 0) return;
    const { shapes, rejected } = parseShapes(saved);
    if (rejected.length) console.warn('Drawing> skipped invalid saved shapes:', rejected);
    if (!Object.keys(shapes).length) return;
    this.ydoc.transact(() => {
      for (const s of Object.values(shapes)) this.map.set(s.id, toYMap(s));
    }, this.seedOrigin);
  }

  /** Calls cb with the ids of the shapes that changed, added or removed (local, remote, undo) */
  observeShapes(cb: (ids: string[]) => void): () => void {
    const handler = (events: Y.YEvent<any>[]) => {
      const ids = new Set<string>();
      for (const e of events) {
        if (e.target === this.map) e.changes.keys.forEach((_, key) => ids.add(key));
        else if (typeof e.path[0] === 'string') ids.add(e.path[0]);
      }
      if (ids.size) cb([...ids]);
    };
    this.map.observeDeep(handler);
    return () => this.map.unobserveDeep(handler);
  }

  /** Calls cb after any change, including the undo history (for undo/redo buttons and saving) */
  observe(cb: () => void): () => void {
    const handler = () => cb();
    this.map.observeDeep(handler);
    this.undoManager.on('stack-item-added', handler);
    this.undoManager.on('stack-item-popped', handler);
    return () => {
      this.map.unobserveDeep(handler);
      this.undoManager.off('stack-item-added', handler);
      this.undoManager.off('stack-item-popped', handler);
    };
  }

  destroy(): void {
    this.undoManager.destroy();
  }
}

function toYMap(shape: Shape): Y.Map<unknown> {
  const ymap = new Y.Map<unknown>();
  for (const [key, value] of Object.entries(shape)) if (value !== undefined) ymap.set(key, value);
  return ymap;
}

/** Only the connected client with the lowest Yjs client id saves, so open copies don't all write the same data */
export function isElectedSaver(clientIds: number[], localId: number): boolean {
  return clientIds.length === 0 || localId <= Math.min(...clientIds);
}

/** Is the drawing small enough to save in the app state? */
export function prepareSave(shapes: Shapes): { ok: true } | { ok: false; bytes: number } {
  const bytes = new TextEncoder().encode(JSON.stringify(shapes)).length;
  return bytes <= MAX_SAVE_BYTES ? { ok: true } : { ok: false, bytes };
}
