/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Others' cursors and selections in a Stickie2, in place of y-codemirror.next's
 * yRemoteSelections (MIT, Kevin Jahns), which works the same way but leaves a person's cursor
 * in the awareness after they leave the note. Here it's taken back when the note loses the
 * focus (deselected), so others' notes show no stale cursor. A cursor is also redrawn when
 * the person's name changes, not only their color.
 *
 * This user's cursor is shared in the awareness ('cursor': Yjs relative positions in the
 * note's text); others' are drawn from theirs, with their name and color ('user').
 */

import * as Y from 'yjs';
import { Range, RangeSet } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { ySyncFacet } from 'y-codemirror.next';

type User = { name?: string; color?: string; colorLight?: string };
type Cursor = { anchor: unknown; head: unknown } | null;

/** A caret in the person's color, with their name above it (styles: yRemoteSelectionsTheme) */
class CaretWidget extends WidgetType {
  constructor(readonly color: string, readonly name: string) {
    super();
  }
  toDOM() {
    const caret = document.createElement('span');
    caret.className = 'cm-ySelectionCaret';
    caret.style.backgroundColor = this.color;
    caret.style.borderColor = this.color;
    const dot = document.createElement('div');
    dot.className = 'cm-ySelectionCaretDot';
    const info = document.createElement('div');
    info.className = 'cm-ySelectionInfo';
    info.textContent = this.name;
    // Word joiners keep the caret from breaking the line
    caret.append('⁠', dot, '⁠', info, '⁠');
    return caret;
  }
  // Redrawn when the name changes too
  eq(other: CaretWidget) {
    return other.color === this.color && other.name === this.name;
  }
  get estimatedHeight() {
    return -1;
  }
  ignoreEvent() {
    return true;
  }
}

class RemoteCursors {
  decorations: DecorationSet = RangeSet.of([]);
  private conf;
  // The people whose cursor is drawn in this note now
  private drawn = new Set<number>();
  private listener: (changes: { added: number[]; updated: number[]; removed: number[] }) => void;

  constructor(view: EditorView) {
    this.conf = view.state.facet(ySyncFacet);
    // Others moved: redraw, but only when it concerns this note (their cursor is in it, or
    // was): the awareness is the board's, so most changes are about other notes
    this.listener = ({ added, updated, removed }) => {
      const me = this.conf.awareness.doc.clientID;
      const states = this.conf.awareness.getStates();
      const concerned = [...added, ...updated, ...removed].some((id) => {
        if (id === me) return false;
        if (this.drawn.has(id)) return true;
        const cursor = states.get(id)?.cursor as Cursor | undefined;
        return cursor != null && cursor.head != null && this.inThisNote(cursor);
      });
      if (concerned) view.dispatch({});
    };
    this.conf.awareness.on('change', this.listener);
  }

  destroy() {
    this.conf.awareness.off('change', this.listener);
    // The note's editor goes away (the note shown plain): take back this user's cursor if in it
    const current = this.conf.awareness.getLocalState()?.cursor as Cursor | undefined;
    if (current != null && current.head != null && this.inThisNote(current)) this.conf.awareness.setLocalStateField('cursor', null);
  }

  /** Is a shared cursor in this note's text */
  private inThisNote(cursor: NonNullable<Cursor>): boolean {
    const { ytext } = this.conf;
    const head = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(cursor.head), ytext.doc as Y.Doc);
    return head?.type === ytext;
  }

  update(update: ViewUpdate) {
    const { ytext, awareness } = this.conf;
    const ydoc = ytext.doc as Y.Doc;

    // Share this user's cursor while the note has the focus; take it back when it loses it
    // (the awareness has one cursor per person for the whole board: only if it's in this note)
    const local = awareness.getLocalState();
    if (local != null) {
      const hasFocus = update.view.hasFocus && update.view.dom.ownerDocument.hasFocus();
      const sel = hasFocus ? update.state.selection.main : null;
      const current = local.cursor as Cursor;
      if (sel != null) {
        const anchor = Y.createRelativePositionFromTypeIndex(ytext, sel.anchor);
        const head = Y.createRelativePositionFromTypeIndex(ytext, sel.head);
        const same =
          current != null &&
          Y.compareRelativePositions(Y.createRelativePositionFromJSON(current.anchor), anchor) &&
          Y.compareRelativePositions(Y.createRelativePositionFromJSON(current.head), head);
        if (!same) awareness.setLocalStateField('cursor', { anchor, head });
      } else if (current != null && (hasFocus || this.inThisNote(current))) {
        awareness.setLocalStateField('cursor', null);
      }
    }

    // Draw the others' cursors and selections that are in this note
    const decorations: Range<Decoration>[] = [];
    this.drawn.clear();
    awareness.getStates().forEach((state: { cursor?: Cursor; user?: User }, client: number) => {
      if (client === awareness.doc.clientID) return;
      const cursor = state.cursor;
      if (cursor == null || cursor.anchor == null || cursor.head == null) return;
      const anchor = Y.createAbsolutePositionFromRelativePosition(cursor.anchor as Y.RelativePosition, ydoc);
      const head = Y.createAbsolutePositionFromRelativePosition(cursor.head as Y.RelativePosition, ydoc);
      if (anchor == null || head == null || anchor.type !== ytext || head.type !== ytext) return;
      const { color = '#30bced', name = 'Anonymous' } = state.user || {};
      const colorLight = state.user?.colorLight || color + '33';
      const doc = update.view.state.doc;
      const start = Math.min(anchor.index, head.index);
      const end = Math.max(anchor.index, head.index);
      const startLine = doc.lineAt(start);
      const endLine = doc.lineAt(end);
      const selection = (from: number, to: number) => {
        if (from < to) decorations.push(Decoration.mark({ attributes: { style: `background-color: ${colorLight}` }, class: 'cm-ySelection' }).range(from, to));
      };
      if (start < end) {
        if (startLine.number === endLine.number) {
          selection(start, end);
        } else {
          // First line, whole lines between, last line
          selection(start, startLine.to);
          for (let n = startLine.number + 1; n < endLine.number; n++) {
            const line = doc.line(n);
            decorations.push(
              Decoration.line({ attributes: { style: `background-color: ${colorLight}`, class: 'cm-yLineSelection' } }).range(line.from)
            );
          }
          selection(endLine.from, end);
        }
      }
      decorations.push(Decoration.widget({ side: head.index - anchor.index > 0 ? -1 : 1, block: false, widget: new CaretWidget(color, name) }).range(head.index));
      this.drawn.add(client);
    });
    this.decorations = Decoration.set(decorations, true);
  }
}

/** Others' cursors and selections, labeled with their names (for yCollab's yRemoteSelections) */
export const remoteCursors = ViewPlugin.fromClass(RemoteCursors, { decorations: (plugin) => plugin.decorations });
