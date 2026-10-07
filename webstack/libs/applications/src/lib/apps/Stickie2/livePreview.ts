/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Markdown "live preview" for CodeMirror 6, as in Obsidian or Typora: the text is shown
 * rendered (headings, bold, italics, code, links, lists, tasks, quotes), except on the lines
 * with the cursor, which show the raw Markdown so it can be edited. A fenced code block shows
 * raw as a whole when the cursor is in it. Without the focus, everything is rendered.
 */

import { EditorState, Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { tags } from '@lezer/highlight';

// Markdown characters hidden off the cursor's lines
const HIDDEN_MARKS = new Set(['HeaderMark', 'EmphasisMark', 'CodeMark', 'StrikethroughMark', 'QuoteMark', 'LinkMark']);

/** A bullet in place of a list's "-", "*" or "+" */
class BulletWidget extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-md-bullet';
    span.textContent = '•';
    return span;
  }
}

/** A checkbox in place of a task's "[ ]" or "[x]"; clicking it toggles the task in the text */
class TaskWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly pos: number) {
    super();
  }
  eq(other: TaskWidget) {
    return other.checked === this.checked && other.pos === this.pos;
  }
  toDOM(view: EditorView) {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = this.checked;
    box.className = 'cm-md-task';
    box.disabled = view.state.readOnly;
    box.addEventListener('mousedown', (event) => {
      event.preventDefault();
      if (view.state.readOnly) return;
      // "[ ]" <-> "[x]": the character between the brackets
      view.dispatch({ changes: { from: this.pos + 1, to: this.pos + 2, insert: this.checked ? ' ' : 'x' }, userEvent: 'input' });
    });
    return box;
  }
  ignoreEvent() {
    return false;
  }
}

/** The line numbers (1-based) shown raw: those with the cursor or a selection, when focused */
function rawLines(view: EditorView): Set<number> {
  const lines = new Set<number>();
  if (!view.hasFocus) return lines;
  const doc = view.state.doc;
  for (const range of view.state.selection.ranges) {
    const first = doc.lineAt(range.from).number;
    const last = doc.lineAt(range.to).number;
    for (let n = first; n <= last; n++) lines.add(n);
  }
  return lines;
}

function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const doc = view.state.doc;
  const raw = rawLines(view);
  const isRaw = (from: number, to: number) => {
    const first = doc.lineAt(from).number;
    const last = doc.lineAt(to).number;
    for (let n = first; n <= last; n++) if (raw.has(n)) return true;
    return false;
  };

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const name = node.name;
        // Headings and quotes: the whole line is styled, raw or not
        const heading = /^ATXHeading(\d)$/.exec(name);
        if (heading) {
          decorations.push(Decoration.line({ class: `cm-md-h${heading[1]}` }).range(doc.lineAt(node.from).from));
        }
        if (name === 'Blockquote') {
          for (let pos = node.from; pos <= node.to; ) {
            const line = doc.lineAt(pos);
            decorations.push(Decoration.line({ class: 'cm-md-quote' }).range(line.from));
            pos = line.to + 1;
          }
        }
        // A fenced code block is raw as a whole while the cursor is in it
        if (name === 'FencedCode') {
          for (let pos = node.from; pos <= node.to; ) {
            const line = doc.lineAt(pos);
            decorations.push(Decoration.line({ class: 'cm-md-codeblock' }).range(line.from));
            pos = line.to + 1;
          }
          if (isRaw(node.from, node.to)) return false;
          // Otherwise its ``` lines are hidden
          const open = doc.lineAt(node.from);
          const close = doc.lineAt(node.to);
          if (open.number !== close.number) {
            decorations.push(Decoration.replace({}).range(open.from, open.to));
            if (/^\s*(```|~~~)\s*$/.test(close.text)) decorations.push(Decoration.replace({}).range(close.from, close.to));
          }
          return false;
        }
        // Links: clickable when rendered (the URL is kept in the text, shown on the raw line)
        if (name === 'Link' && !isRaw(node.from, node.to)) {
          const url = node.node.getChild('URL');
          if (url) {
            const target = doc.sliceString(url.from, url.to);
            const label = node.node.getChildren('LinkMark');
            // [text](url): style the text, hide "](url)"
            if (label.length >= 2) {
              decorations.push(Decoration.mark({ class: 'cm-md-link', attributes: { 'data-url': target } }).range(label[0].to, label[1].from));
              decorations.push(Decoration.replace({}).range(label[1].from, node.to));
              decorations.push(Decoration.replace({}).range(label[0].from, label[0].to));
            }
          }
          return false;
        }
        if (isRaw(node.from, node.to)) {
          // On the lines being edited, the Markdown characters show, dimmed
          if (HIDDEN_MARKS.has(name) && node.to > node.from) decorations.push(Decoration.mark({ class: 'cm-md-mark' }).range(node.from, node.to));
          return;
        }
        if (HIDDEN_MARKS.has(name)) {
          let end = node.to;
          // "# Title": the space after the heading's marks too
          if ((name === 'HeaderMark' || name === 'QuoteMark') && doc.sliceString(end, end + 1) === ' ') end += 1;
          if (end > node.from) decorations.push(Decoration.replace({}).range(node.from, end));
        } else if (name === 'ListMark') {
          const mark = doc.sliceString(node.from, node.to);
          const task = node.node.parent?.getChild('Task');
          // Bullets only for unordered lists that aren't tasks ("1." stays as written)
          if (/^[-*+]$/.test(mark) && !task) decorations.push(Decoration.replace({ widget: new BulletWidget() }).range(node.from, node.to));
          // A task's "-" is hidden: its checkbox stands for it
          if (task) {
            let end = node.to;
            if (doc.sliceString(end, end + 1) === ' ') end += 1;
            decorations.push(Decoration.replace({}).range(node.from, end));
          }
        } else if (name === 'TaskMarker') {
          const checked = /x/i.test(doc.sliceString(node.from, node.to));
          decorations.push(Decoration.replace({ widget: new TaskWidget(checked, node.from) }).range(node.from, node.to));
        }
        return;
      },
    });
  }
  return Decoration.set(decorations, true);
}

const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      // The cursor moving between lines or the focus changing changes what is raw
      if (update.docChanged || update.viewportChanged || update.selectionSet || update.focusChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
    eventHandlers: {
      // A rendered link opens in a new tab (the Electron client sends it to the browser)
      mousedown: (event) => {
        const link = (event.target as HTMLElement).closest('.cm-md-link') as HTMLElement | null;
        const url = link?.dataset.url;
        if (!url || !/^https?:\/\//i.test(url)) return false;
        event.preventDefault();
        window.open(url, '_blank', 'noopener,noreferrer');
        return true;
      },
    },
  }
);

// Text styles for the Markdown parts (the marks are dimmed on raw lines by the plugin, not here:
// the parser gives list numbers the same tag, and they must stay as dark as the text)
const markdownStyle = HighlightStyle.define([
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.monospace, fontFamily: 'Menlo, Consolas, monospace', backgroundColor: 'rgba(0, 0, 0, 0.06)', borderRadius: '3px' },
  { tag: tags.url, opacity: '0.6' },
]);

const theme = EditorView.theme({
  '.cm-md-h1': { fontSize: '1.6em', fontWeight: 'bold' },
  '.cm-md-h2': { fontSize: '1.35em', fontWeight: 'bold' },
  '.cm-md-h3': { fontSize: '1.15em', fontWeight: 'bold' },
  '.cm-md-h4, .cm-md-h5, .cm-md-h6': { fontWeight: 'bold' },
  '.cm-md-quote': { borderLeft: '4px solid rgba(0, 0, 0, 0.25)', paddingLeft: '0.6em', fontStyle: 'italic' },
  '.cm-md-codeblock': { fontFamily: 'Menlo, Consolas, monospace', backgroundColor: 'rgba(0, 0, 0, 0.06)', fontSize: '0.85em' },
  '.cm-md-bullet': { paddingRight: '0.2em' },
  '.cm-md-task': { width: '0.8em', height: '0.8em', margin: '0 0.35em 0 0', verticalAlign: 'middle', cursor: 'pointer' },
  '.cm-md-mark': { opacity: 0.4 },
  '.cm-md-link': { color: '#2b6cb0', textDecoration: 'underline', cursor: 'pointer' },
});

/** Markdown (with GitHub's tables, tasks and strikethrough) shown as a live preview */
export function markdownLivePreview() {
  return [markdown({ base: markdownLanguage }), syntaxHighlighting(markdownStyle), livePreviewPlugin, theme];
}

/** Read only, or not (a locked Stickie) */
export function readOnly(locked: boolean) {
  return [EditorState.readOnly.of(locked), EditorView.editable.of(!locked)];
}
